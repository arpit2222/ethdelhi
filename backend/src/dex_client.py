from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from eth_account import Account
from eth_account.signers.local import LocalAccount
from web3 import Web3
from web3.contract import Contract

from . import config


ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function",
    },
    {
        "constant": False,
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function",
    },
]


UNISWAP_V3_ROUTER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "tokenIn", "type": "address"},
                    {"internalType": "address", "name": "tokenOut", "type": "address"},
                    {"internalType": "uint24", "name": "fee", "type": "uint24"},
                    {"internalType": "address", "name": "recipient", "type": "address"},
                    {"internalType": "uint256", "name": "deadline", "type": "uint256"},
                    {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "amountOutMinimum",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint160",
                        "name": "sqrtPriceLimitX96",
                        "type": "uint160",
                    },
                ],
                "internalType": "struct ISwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple",
            }
        ],
        "name": "exactInputSingle",
        "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function",
    }
]


@dataclass
class SwapResult:
    tx_hash: str
    amount_out: Optional[int]


class DEXClient:

    def __init__(self) -> None:
        if not config.RPC_URL:
            raise RuntimeError("RPC_URL is not configured")
        self.web3 = Web3(Web3.HTTPProvider(config.RPC_URL, request_kwargs={"timeout": 60}))
        if not self.web3.is_connected():
            raise RuntimeError("Failed to connect to RPC")

        if not config.PRIVATE_KEY:
            raise RuntimeError("PRIVATE_KEY missing")
        acct: LocalAccount = Account.from_key(config.PRIVATE_KEY)
        if config.PUBLIC_KEY and acct.address.lower() != config.PUBLIC_KEY.lower():
            # Prefer derived address to avoid mismatch errors
            pass
        self.account = acct

    def _erc20(self, address: str) -> Contract:
        return self.web3.eth.contract(address=self.web3.to_checksum_address(address), abi=ERC20_ABI)

    def _router(self) -> Contract:
        if not config.UNISWAP_V3_ROUTER_ADDRESS:
            raise RuntimeError("UNISWAP_V3_ROUTER_ADDRESS is not configured")
        return self.web3.eth.contract(
            address=self.web3.to_checksum_address(config.UNISWAP_V3_ROUTER_ADDRESS),
            abi=UNISWAP_V3_ROUTER_ABI,
        )

    def get_balance(self, token_address: str, owner: Optional[str] = None) -> float:
        owner_addr = owner or self.account.address
        token = self._erc20(token_address)
        decimals = token.functions.decimals().call()
        raw = token.functions.balanceOf(self.web3.to_checksum_address(owner_addr)).call()
        return raw / (10 ** decimals)

    def _build_and_send(self, tx: Dict[str, Any]) -> str:
        nonce = self.web3.eth.get_transaction_count(self.account.address)
        tx.update(
            {
                "chainId": config.CHAIN_ID,
                "nonce": nonce,
                "maxFeePerGas": self.web3.to_wei("2", "gwei"),
                "maxPriorityFeePerGas": self.web3.to_wei("1", "gwei"),
                "from": self.account.address,
            }
        )
        signed = self.account.sign_transaction(tx)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        return tx_hash.hex()

    def approve(self, token_address: str, spender: str, amount_wei: int) -> str:
        token = self._erc20(token_address)
        tx = token.functions.approve(self.web3.to_checksum_address(spender), amount_wei).build_transaction(
            {"gas": 120000}
        )
        return self._build_and_send(tx)

    def execute_swap(
        self,
        token_in: str,
        token_out: str,
        amount_in_wei: int,
        fee: int = 3000,
        slippage_bps: int = 50,
    ) -> SwapResult:
        router = self._router()
        deadline = int(time.time()) + 600
        amount_out_min = int(amount_in_wei * (1 - slippage_bps / 10000))

        params = (
            self.web3.to_checksum_address(token_in),
            self.web3.to_checksum_address(token_out),
            fee,
            self.account.address,
            deadline,
            amount_in_wei,
            amount_out_min,
            0,
        )

        # Approval
        approve_tx = self.approve(token_in, config.UNISWAP_V3_ROUTER_ADDRESS, amount_in_wei)

        tx = router.functions.exactInputSingle(params).build_transaction({"gas": 500000, "value": 0})
        tx_hash = self._build_and_send(tx)
        return SwapResult(tx_hash=tx_hash, amount_out=None)


