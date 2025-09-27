from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional, Tuple

import requests
from eth_account import Account
from eth_keys import keys
from eth_utils import keccak, to_bytes, to_canonical_address
from web3 import Web3

from . import config


class LimitOrderClient:
    """1inch Limit Order Protocol client (EVM) using 1inch Orderbook API v4.0 and manual EIP-712 signing."""

    def __init__(self, web3: Optional[Web3] = None) -> None:
        if not config.ONEINCH_API_KEY:
            raise RuntimeError("ONEINCH_API_KEY missing")
        if not config.RPC_URL or not config.CHAIN_ID:
            raise RuntimeError("RPC_URL/CHAIN_ID missing")
        if not config.PRIVATE_KEY:
            raise RuntimeError("PRIVATE_KEY missing")

        self.w3 = web3 or Web3(Web3.HTTPProvider(config.RPC_URL, request_kwargs={"timeout": 60}))
        if not self.w3.is_connected():
            raise RuntimeError("RPC not connected")

        self.account = Account.from_key(config.PRIVATE_KEY)
        self.addr = self.account.address
        self.chain_id = int(config.CHAIN_ID)

        # CORRECTED: Using the v4.0 API endpoint.
        self.base_url = f"https://api.1inch.dev/orderbook/v4.0/{self.chain_id}"

        self.headers = {
            "Authorization": f"Bearer {config.ONEINCH_API_KEY}",
            "X-API-KEY": config.ONEINCH_API_KEY,
            "accept": "application/json",
            "content-type": "application/json",
        }

    def _token_meta(self, symbol: str) -> Tuple[str, int]:
        s = symbol.upper()
        if s == "ETH":
            return ("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", 18)
        if s == "WETH":
            if not config.WETH_ADDRESS or config.WETH_ADDRESS.lower() in ("0x", "0x0"):
                raise RuntimeError("WETH_ADDRESS not configured")
            return (config.WETH_ADDRESS, 18)
        if s == "USDC":
            if not config.USDC_ADDRESS or config.USDC_ADDRESS.lower() in ("0x", "0x0"):
                raise RuntimeError("USDC_ADDRESS not configured")
            return (config.USDC_ADDRESS, 6)
        raise RuntimeError(f"Unknown token symbol: {symbol}")

    def _amounts(self, side: str, base_dec: int, quote_dec: int, base_amt: float, limit_px: float) -> Tuple[int, int]:
        if side.upper() == "BUY":
            # For a BUY order, you are GIVING quote currency and GETTING base currency.
            # makingAmount is the amount you give (quote), takingAmount is the amount you get (base).
            making_amount = int(base_amt * limit_px * (10**quote_dec))
            taking_amount = int(base_amt * (10**base_dec))
        else: # SELL
            # For a SELL order, you are GIVING base currency and GETTING quote currency.
            making_amount = int(base_amt * (10**base_dec))
            taking_amount = int(base_amt * limit_px * (10**quote_dec))
        return making_amount, taking_amount

    def create_and_submit(
        self,
        *,
        side: str,
        base: str,
        quote: str,
        amount: float,
        limit_price: float,
        expiry_secs: int,
        partial_fill: bool,
        post_only: bool,
    ) -> Dict[str, Any]:
        base_token_addr, base_dec = self._token_meta(base)
        quote_token_addr, quote_dec = self._token_meta(quote)

        # CORRECTED: Logic to correctly assign maker/taker assets based on trade side.
        # This was the root cause of the "Invalid address 0x" error.
        if side.upper() == "BUY":
            # If you BUY the base asset (e.g., ETH), you are OFFERING the quote asset (e.g., USDC).
            maker_asset = quote_token_addr
            taker_asset = base_token_addr
        else: # SELL
            # If you SELL the base asset (e.g., ETH), you are OFFERING the base asset.
            maker_asset = base_token_addr
            taker_asset = quote_token_addr

        making_amount, taking_amount = self._amounts(side, base_dec, quote_dec, amount, limit_price)

        salt = str(int(time.time() * 1000))
        deadline = int(time.time()) + int(expiry_secs)

        verifying_contract = os.getenv("ONEINCH_LOP_ADDRESS") or (config.ONEINCH_LOP_ADDRESS or "")
        if not verifying_contract:
            raise RuntimeError("ONEINCH_LOP_ADDRESS is not configured")

        # --- v4.0 `makerTraits` calculation ---
        # makerTraits is a bitmask that encodes order properties.
        # See: https://docs.1inch.io/docs/limit-order-protocol/maker-traits
        traits = 0
        # Bit 0: NO_PARTIAL_FILLS
        if not partial_fill:
            traits |= (1 << 0)
        # Bit 1: ALLOW_MULTIPLE_FILLS
        if partial_fill:
            traits |= (1 << 1)
        # We can also encode expiry here. The format is (expiry << 208).
        traits |= (deadline << 208)
        # For a basic order, we don't need other flags like `allowedSender` (which is now part of traits).

        # CORRECTED: The entire EIP-712 structure is updated for LOP v4.0.
        typed_data = {
            "types": {
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "Order": [
                    {"name": "salt", "type": "uint256"},
                    {"name": "maker", "type": "address"},
                    {"name": "receiver", "type": "address"},
                    {"name": "makerAsset", "type": "address"},
                    {"name": "takerAsset", "type": "address"},
                    {"name": "makingAmount", "type": "uint256"},
                    {"name": "takingAmount", "type": "uint256"},
                    {"name": "makerTraits", "type": "uint256"},
                ],
            },
            "domain": {
                "name": "1inch Limit Order Protocol",
                "version": "4", # <-- CORRECTED to v4
                "chainId": self.chain_id,
                "verifyingContract": verifying_contract,
            },
            "primaryType": "Order",
            "message": {
                "salt": int(salt),
                "maker": self.addr,
                "receiver": self.addr,
                "makerAsset": maker_asset,
                "takerAsset": taker_asset,
                "makingAmount": int(making_amount),
                "takingAmount": int(taking_amount),
                "makerTraits": traits,
            },
        }

        digest = _eip712_digest(typed_data)
        pk_bytes = bytes.fromhex(config.PRIVATE_KEY.removeprefix("0x"))
        signature = keys.PrivateKey(pk_bytes).sign_msg_hash(digest).to_hex()

        order_hash = "0x" + _hash_order(typed_data["message"]).hex()

        # CORRECTED: The final payload must match the signed message structure exactly.
        payload = {
            "orderHash": order_hash,
            "signature": signature,
            "data": {
                "salt": str(int(salt)),
                "maker": self.addr,
                "receiver": self.addr,
                "makerAsset": maker_asset,
                "takerAsset": taker_asset,
                "makingAmount": str(int(making_amount)),
                "takingAmount": str(int(taking_amount)),
                "makerTraits": str(traits),
                # FIX: Explicitly specify the zero address for the taker to mark this as a public order.
                # The API defaults to private if this field is missing, causing the error.
                "taker": "0x0000000000000000000000000000000000000000",
            },
        }

        # Optional debug: Uncomment to see the exact payload being sent.
        # import json
        # print("Submitting to 1inch Orderbook:", json.dumps(payload, indent=2))
                # Optional debug: Uncomment to see the exact payload being sent.
        # import json
        # print("Submitting to 1inch Orderbook:", json.dumps(payload, indent=2))

        # DEBUG: print equivalent curl
        import json as _json
        target_url = self.base_url
        headers = dict(self.headers)

        # If a proxy is configured, route through it and let the proxy add Authorization
        if getattr(config, "ONEINCH_PROXY_URL", None):
            proxy = str(config.ONEINCH_PROXY_URL).rstrip("/")
            target_url = f"{proxy}/?url={self.base_url}"
            headers.pop("Authorization", None)
            headers.pop("X-API-KEY", None)

        _curl = (
            "curl -X POST "
            + f"'{target_url}' "
            + "-H 'accept: application/json' "
            + "-H 'content-type: application/json' "
            + ("" if "Authorization" not in headers else f"-H 'Authorization: {headers['Authorization']}' ")
            + f"--data '{_json.dumps(payload, separators=(',', ':'))}'"
        )
        print("cURL ->", _curl)

        r = requests.post(target_url, json=payload, headers=headers, timeout=30)
        # r = requests.post(self.base_url, json=payload, headers=self.headers, timeout=30)
        if not r.ok:
            try:
                print("1inch response:", r.status_code, r.text)
            except Exception:
                pass
        r.raise_for_status()
        return r.json()


# ---- EIP-712 helpers updated for v4.0 Order struct ----

def _type_hash_order() -> bytes:
    # CORRECTED: Hashing the new v4 Order struct string.
    t = (
        "Order("
        "uint256 salt,"
        "address maker,"
        "address receiver,"
        "address makerAsset,"
        "address takerAsset,"
        "uint256 makingAmount,"
        "uint256 takingAmount,"
        "uint256 makerTraits"
        ")"
    )
    return keccak(text=t)

def _hash_bytes(b: bytes | str) -> bytes:
    if isinstance(b, (bytes, bytearray)):
        data = bytes(b)
    else:
        data = to_bytes(hexstr=b)
    return keccak(data)

def _enc_addr(v: str) -> bytes:
    return b"\x00" * 12 + to_canonical_address(v)

def _enc_uint(v: int) -> bytes:
    return int(v).to_bytes(32, "big")

def _hash_order(msg: dict) -> bytes:
    # CORRECTED: Hashing the fields of the new v4 Order struct.
    parts = [
        _type_hash_order(),
        _enc_uint(msg["salt"]),
        _enc_addr(msg["maker"]),
        _enc_addr(msg["receiver"]),
        _enc_addr(msg["makerAsset"]),
        _enc_addr(msg["takerAsset"]),
        _enc_uint(msg["makingAmount"]),
        _enc_uint(msg["takingAmount"]),
        _enc_uint(msg["makerTraits"]),
    ]
    return keccak(b"".join(parts))

def _domain_separator(domain: dict) -> bytes:
    t = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    type_hash = keccak(text=t)
    parts = [
        type_hash,
        keccak(text=domain["name"]),
        keccak(text=domain["version"]),
        _enc_uint(domain["chainId"]),
        _enc_addr(domain["verifyingContract"]),
    ]
    return keccak(b"".join(parts))

def _eip712_digest(typed: dict) -> bytes:
    ds = _domain_separator(typed["domain"])
    oh = _hash_order(typed["message"])
    return keccak(b"\x19\x01" + ds + oh)

