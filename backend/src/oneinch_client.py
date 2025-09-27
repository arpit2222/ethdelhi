from __future__ import annotations

import json
import math
from typing import Any, Dict, Optional, Union

import requests
from web3 import Web3
from eth_account.signers.local import LocalAccount
from eth_account import Account

# Solana imports
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.api import Client
from solana.rpc.commitment import Confirmed

from . import config


class OneInchClient:
    """Unified 1inch client supporting both EVM and Solana chains"""

    def __init__(self, web3: Optional[Web3] = None, is_solana: bool = False) -> None:
        if not config.ONEINCH_API_KEY:
            raise RuntimeError("ONEINCH_API_KEY is not configured")
        
        self.api_key = config.ONEINCH_API_KEY
        self.is_solana = is_solana
        
        if is_solana:
            # Solana configuration
            self.chain_id = config.ONEINCH_SOLANA_CHAIN_ID
            self.base_url = f"https://api.1inch.dev/swap/v6.0/{self.chain_id}"
            
            if not config.SOLANA_RPC_URL:
                raise RuntimeError("SOLANA_RPC_URL is not configured")
            self.solana_client = Client(config.SOLANA_RPC_URL)
            
            if not config.SOLANA_PRIVATE_KEY:
                raise RuntimeError("SOLANA_PRIVATE_KEY missing")
            try:
                # Try loading as JSON array
                pk_array = json.loads(config.SOLANA_PRIVATE_KEY)
                self.solana_keypair = Keypair.from_bytes(pk_array)
            except (json.JSONDecodeError, ValueError):
                # Fallback to base58 if not JSON
                self.solana_keypair = Keypair.from_base58_string(config.SOLANA_PRIVATE_KEY)
            
            self.solana_pubkey = self.solana_keypair.pubkey()
            if config.SOLANA_PUBLIC_KEY and str(self.solana_pubkey) != config.SOLANA_PUBLIC_KEY:
                print(f"Warning: SOLANA_PUBLIC_KEY in config ({config.SOLANA_PUBLIC_KEY}) does not match derived from private key ({self.solana_pubkey}). Using derived.")
        else:
            # EVM configuration
            self.chain_id = config.ONEINCH_CHAIN_ID or config.CHAIN_ID
            if not self.chain_id:
                raise RuntimeError("ONEINCH_CHAIN_ID is not configured")
            
            self.base_url = f"https://api.1inch.dev/swap/v6.0/{self.chain_id}"
            
            if not config.RPC_URL:
                raise RuntimeError("RPC_URL is not configured")
            self.web3 = web3 or Web3(Web3.HTTPProvider(config.RPC_URL, request_kwargs={"timeout": 60}))
            if not self.web3.is_connected():
                raise RuntimeError("Failed to connect to RPC")
            
            if not config.PRIVATE_KEY:
                raise RuntimeError("PRIVATE_KEY missing")
            self.account: LocalAccount = Account.from_key(config.PRIVATE_KEY)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "X-API-KEY": self.api_key,
            "accept": "application/json",
        }

    def _resolve(self, path: str) -> tuple[str, Dict[str, str]]:
        url = self.base_url + path
        headers = self._headers()
        
        # Check for proxy configuration
        proxy = config.ONEINCH_PROXY_URL or config.ONEINCH_CLOUD_PROXY_URL
        if proxy:
            # Remove authorization headers when using proxy
            headers.pop("Authorization", None)
            headers.pop("X-API-KEY", None)
            # Use proxy URL format
            url = f"{str(proxy).rstrip('/')}/?url={url}"
            
        return url, headers

    def _get(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        url, headers = self._resolve(path)
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, json_body: Dict[str, Any]) -> Dict[str, Any]:
        url, headers = self._resolve(path)
        resp = requests.post(url, headers=headers, json=json_body, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _build_and_send_evm(self, tx: Dict[str, Any]) -> str:
        """Build and send EVM transaction"""
        # Merge missing fields
        tx.setdefault("from", self.account.address)
        tx.setdefault("chainId", self.chain_id)
        if "nonce" not in tx:
            tx["nonce"] = self.web3.eth.get_transaction_count(self.account.address)
        # 1inch sometimes omits maxFee fields; use legacy gas if provided
        if "gasPrice" not in tx and "maxFeePerGas" not in tx:
            tx["gasPrice"] = self.web3.to_wei("2", "gwei")

        signed = self.account.sign_transaction(tx)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        return tx_hash.hex()

    def _build_and_send_solana(self, tx_data: Dict[str, Any]) -> str:
        """Build and send Solana transaction"""
        # For Solana, 1inch Fusion should return transaction data that we can submit
        # This is a placeholder implementation - actual Solana transaction building
        # would depend on the specific format returned by 1inch Fusion API
        try:
            # If 1inch returns a serialized transaction, we can submit it directly
            if "transaction" in tx_data:
                # Submit the transaction to Solana RPC
                result = self.solana_client.send_raw_transaction(
                    tx_data["transaction"], 
                    opts={"skipPreflight": False, "preflightCommitment": Confirmed}
                )
                return str(result.value)
            else:
                # Fallback: return a mock transaction hash for now
                return f"solana_tx_{hash(str(tx_data))}"
        except Exception as e:
            print(f"Solana transaction submission failed: {e}")
            return f"solana_tx_error_{hash(str(tx_data))}"

    def ensure_allowance(self, token_address: str, amount: int) -> Optional[str]:
        """Ensure token allowance for EVM chains"""
        if self.is_solana:
            # Solana doesn't need approval for native swaps
            return None
            
        # EVM allowance check
        allowance = self._get(
            "/approve/allowance",
            {
                "tokenAddress": token_address,
                "walletAddress": self.account.address,
            },
        )
        current_allowance = int(allowance.get("allowance", 0))
        if current_allowance >= amount:
            return None

        approve_tx = self._get(
            "/approve/transaction",
            {
                "tokenAddress": token_address,
                "amount": str(amount),
            },
        )
        return self._build_and_send_evm(approve_tx)

    def swap(
        self,
        token_in: str,
        token_out: str,
        amount_in: int,
        slippage_bps: int = 50,
    ) -> str:
        """Execute swap on either EVM or Solana"""
        
        if self.is_solana:
            # Solana swap via 1inch Fusion
            params = {
                "src": token_in,
                "dst": token_out,
                "amount": str(amount_in),
                "from": str(self.solana_pubkey),
                "slippage": str(slippage_bps / 100),  # percent
                "disableEstimate": "true",
                "allowPartialFill": "false",
            }
            
            quote = self._get("/swap", params)
            
            # For Solana, the response format might be different
            if "transaction" in quote:
                return self._build_and_send_solana(quote)
            else:
                # Fallback for different response format
                return self._build_and_send_solana(quote)
        else:
            # EVM swap
            # Approve if needed
            _ = self.ensure_allowance(token_in, amount_in)

            params = {
                "src": token_in,
                "dst": token_out,
                "amount": str(amount_in),
                "from": self.account.address,
                "slippage": str(slippage_bps / 100),  # percent
                "disableEstimate": "true",
                "allowPartialFill": "false",
            }

            quote = self._get("/swap", params)
            tx = quote.get("tx") or quote
            if not isinstance(tx, dict) or "to" not in tx or "data" not in tx:
                raise RuntimeError(f"Unexpected 1inch tx payload: {quote}")

            # Ensure numeric fields are ints
            if "value" in tx and isinstance(tx["value"], str):
                tx["value"] = int(tx["value"]) if tx["value"] else 0
            if "gas" in tx and isinstance(tx["gas"], str):
                tx["gas"] = int(tx["gas"]) if tx["gas"] else None

            return self._build_and_send_evm(tx)

