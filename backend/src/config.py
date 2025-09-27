from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv


def _safe_int(value: Optional[str], default: Optional[int] = None) -> Optional[int]:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


# Load environment from project root .env if present
project_root = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=project_root / ".env", override=False)

# Blockchain
RPC_URL: Optional[str] = os.getenv("RPC_URL")
CHAIN_ID: Optional[int] = _safe_int(os.getenv("CHAIN_ID"))

# Wallet
PRIVATE_KEY: Optional[str] = os.getenv("PRIVATE_KEY")
PUBLIC_KEY: Optional[str] = os.getenv("PUBLIC_KEY")

# Pyth
PYTH_ETH_USD_FEED_ID: Optional[str] = os.getenv("PYTH_ETH_USD_FEED_ID")
PYTH_HTTP_ENDPOINT: Optional[str] = os.getenv("PYTH_HTTP_ENDPOINT", "https://hermes.pyth.network")

# 0g
ZERO_G_RPC_URL: Optional[str] = os.getenv("ZERO_G_RPC_URL")

# Token addresses (Sepolia by default; update as needed)
WETH_ADDRESS: Optional[str] = os.getenv("WETH_ADDRESS")
USDC_ADDRESS: Optional[str] = os.getenv("USDC_ADDRESS")
UNISWAP_V3_ROUTER_ADDRESS: Optional[str] = os.getenv("UNISWAP_V3_ROUTER_ADDRESS")

# Trading params
TRADE_AMOUNT_WEI: Optional[int] = _safe_int(os.getenv("TRADE_AMOUNT_WEI"))
UNISWAP_POOL_FEE: int = _safe_int(os.getenv("UNISWAP_POOL_FEE"), 3000) or 3000

# 1inch
ONEINCH_API_KEY: Optional[str] = os.getenv("ONEINCH_API_KEY")
ONEINCH_CHAIN_ID: Optional[int] = _safe_int(os.getenv("ONEINCH_CHAIN_ID"))
ONEINCH_SOLANA_CHAIN_ID: int = 1399811149  # Solana chain ID for 1inch
ONEINCH_LOP_ADDRESS: Optional[str] = os.getenv("ONEINCH_LOP_ADDRESS")
ONEINCH_PROXY_URL: Optional[str] = os.getenv("ONEINCH_PROXY_URL")
ONEINCH_CLOUD_PROXY_URL: Optional[str] = os.getenv("ONEINCH_CLOUD_PROXY_URL")


# Solana
SOLANA_RPC_URL: Optional[str] = os.getenv("SOLANA_RPC_URL")
SOLANA_PRIVATE_KEY: Optional[str] = os.getenv("SOLANA_PRIVATE_KEY")
SOLANA_PUBLIC_KEY: Optional[str] = os.getenv("SOLANA_PUBLIC_KEY")
JUPITER_SWAP_ENDPOINT: Optional[str] = os.getenv("JUPITER_SWAP_ENDPOINT", "https://quote-api.jup.ag/v6")
WSOL_MINT: Optional[str] = os.getenv("WSOL_MINT")
USDC_MINT: Optional[str] = os.getenv("USDC_MINT")
CUSTOM_TOKEN_MINT: Optional[str] = os.getenv("CUSTOM_TOKEN_MINT")
PYTH_ETH_USD_FEED_ID_SOL: Optional[str] = os.getenv("PYTH_ETH_USD_FEED_ID_SOL")
TRADE_AMOUNT_LAMPORTS: Optional[int] = _safe_int(os.getenv("TRADE_AMOUNT_LAMPORTS"))


def validate_critical_config() -> None:
    missing = []
    if not RPC_URL:
        missing.append("RPC_URL")
    if CHAIN_ID is None:
        missing.append("CHAIN_ID")
    if not PRIVATE_KEY:
        missing.append("PRIVATE_KEY")
    if not PUBLIC_KEY:
        missing.append("PUBLIC_KEY")
    if not PYTH_ETH_USD_FEED_ID:
        missing.append("PYTH_ETH_USD_FEED_ID")
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


