from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests
from solana.rpc.api import Client as SolClient
from solana.rpc.types import TxOpts
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction

from . import config


@dataclass
class SolanaSwapResult:
    tx_sig: str


class SolanaDEXClient:

    def __init__(self) -> None:
        if not config.SOLANA_RPC_URL:
            raise RuntimeError("SOLANA_RPC_URL missing")
        if not config.SOLANA_PRIVATE_KEY:
            raise RuntimeError("SOLANA_PRIVATE_KEY missing")
        self.client = SolClient(config.SOLANA_RPC_URL)
        self.keypair = self._load_keypair(config.SOLANA_PRIVATE_KEY)
        self.pubkey = self.keypair.pubkey()

    def _load_keypair(self, secret: str) -> Keypair:
        try:
            # Support JSON array exported by solana-keygen
            arr = json.loads(secret)
            return Keypair.from_bytes(bytes(arr))
        except Exception:
            # Base58-encoded private key
            return Keypair.from_base58_string(secret)

    def jup_quote(self, in_mint: str, out_mint: str, amount: int) -> Dict[str, Any]:
        url = f"{config.JUPITER_SWAP_ENDPOINT}/quote"
        r = requests.get(url, params={
            "inputMint": in_mint,
            "outputMint": out_mint,
            "amount": amount,
            "slippageBps": 50,
            "onlyDirectRoutes": False,
        }, timeout=20)
        r.raise_for_status()
        return r.json()

    def jup_swap(self, route: Dict[str, Any]) -> SolanaSwapResult:
        url = f"{config.JUPITER_SWAP_ENDPOINT}/swap"
        payload = {
            "quoteResponse": route,
            "userPublicKey": str(self.pubkey),
            "wrapAndUnwrapSol": True,
        }
        r = requests.post(url, json=payload, timeout=20)
        r.raise_for_status()
        swap_tx_b64 = r.json().get("swapTransaction")
        if not swap_tx_b64:
            raise RuntimeError(f"Invalid Jupiter swap response: {r.text}")

        raw_tx = base64.b64decode(swap_tx_b64)
        tx = VersionedTransaction.from_bytes(raw_tx)
        tx.sign([self.keypair])
        sig = self.client.send_raw_transaction(bytes(tx.serialize()), opts=TxOpts(skip_preflight=True))
        return SolanaSwapResult(tx_sig=sig.get("result") or sig)

    def execute_swap(self, in_mint: str, out_mint: str, amount: int) -> SolanaSwapResult:
        quote = self.jup_quote(in_mint, out_mint, amount)
        # pick best route
        route = quote["data"][0] if isinstance(quote, dict) and quote.get("data") else quote
        return self.jup_swap(route)


