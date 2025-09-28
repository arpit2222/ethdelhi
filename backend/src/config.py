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

# Stock Tokenization
STOCK_TOKEN_FACTORY_ADDRESS: Optional[str] = os.getenv("STOCK_TOKEN_FACTORY_ADDRESS")
SEPOLIA_RPC_URL: Optional[str] = os.getenv("SEPOLIA_RPC_URL")
SEPOLIA_CHAIN_ID: int = _safe_int(os.getenv("SEPOLIA_CHAIN_ID"), 11155111) or 11155111
STOCK_VERIFICATION_ORACLE_ADDRESS: Optional[str] = os.getenv("STOCK_VERIFICATION_ORACLE_ADDRESS")

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

# Multi-Chain Bridge Configuration
# Ethereum Sepolia
SEPOLIA_RPC_URL: Optional[str] = os.getenv("SEPOLIA_RPC_URL")
SEPOLIA_CHAIN_ID: int = _safe_int(os.getenv("SEPOLIA_CHAIN_ID"), 11155111) or 11155111
SEPOLIA_BRIDGE_FACTORY_ADDRESS: Optional[str] = os.getenv("SEPOLIA_BRIDGE_FACTORY_ADDRESS")
SEPOLIA_RWA_ESCROW_ADDRESS: Optional[str] = os.getenv("SEPOLIA_RWA_ESCROW_ADDRESS")

# Celo Alfajores
CELO_ALFAJORES_RPC_URL: Optional[str] = os.getenv("CELO_ALFAJORES_RPC_URL")
CELO_ALFAJORES_CHAIN_ID: int = _safe_int(os.getenv("CELO_ALFAJORES_CHAIN_ID"), 44787) or 44787
CELO_ALFAJORES_BRIDGE_FACTORY_ADDRESS: Optional[str] = os.getenv("CELO_ALFAJORES_BRIDGE_FACTORY_ADDRESS")
CELO_ALFAJORES_RWA_ESCROW_ADDRESS: Optional[str] = os.getenv("CELO_ALFAJORES_RWA_ESCROW_ADDRESS")

# Monad Testnet
MONAD_TESTNET_RPC_URL: Optional[str] = os.getenv("MONAD_TESTNET_RPC_URL")
MONAD_TESTNET_CHAIN_ID: int = _safe_int(os.getenv("MONAD_TESTNET_CHAIN_ID"), 10143) or 10143
MONAD_TESTNET_BRIDGE_FACTORY_ADDRESS: Optional[str] = os.getenv("MONAD_TESTNET_BRIDGE_FACTORY_ADDRESS")
MONAD_TESTNET_RWA_ESCROW_ADDRESS: Optional[str] = os.getenv("MONAD_TESTNET_RWA_ESCROW_ADDRESS")

# Etherlink Testnet
ETHERLINK_TESTNET_RPC_URL: Optional[str] = os.getenv("ETHERLINK_TESTNET_RPC_URL")
ETHERLINK_TESTNET_CHAIN_ID: int = _safe_int(os.getenv("ETHERLINK_TESTNET_CHAIN_ID"), 128123) or 128123
ETHERLINK_TESTNET_BRIDGE_FACTORY_ADDRESS: Optional[str] = os.getenv("ETHERLINK_TESTNET_BRIDGE_FACTORY_ADDRESS")
ETHERLINK_TESTNET_RWA_ESCROW_ADDRESS: Optional[str] = os.getenv("ETHERLINK_TESTNET_RWA_ESCROW_ADDRESS")

# Polkadot Westend Asset Hub
POLKADOT_WESTEND_RPC_URL: Optional[str] = os.getenv("POLKADOT_WESTEND_RPC_URL")
POLKADOT_WESTEND_CHAIN_ID: int = _safe_int(os.getenv("POLKADOT_WESTEND_CHAIN_ID"), 1000) or 1000
POLKADOT_WESTEND_BRIDGE_FACTORY_ADDRESS: Optional[str] = os.getenv("POLKADOT_WESTEND_BRIDGE_FACTORY_ADDRESS")
POLKADOT_WESTEND_RWA_ESCROW_ADDRESS: Optional[str] = os.getenv("POLKADOT_WESTEND_RWA_ESCROW_ADDRESS")

# Bridge Factory Addresses Mapping
BRIDGE_FACTORY_ADDRESSES = {
    SEPOLIA_CHAIN_ID: SEPOLIA_BRIDGE_FACTORY_ADDRESS,
    CELO_ALFAJORES_CHAIN_ID: CELO_ALFAJORES_BRIDGE_FACTORY_ADDRESS,
    MONAD_TESTNET_CHAIN_ID: MONAD_TESTNET_BRIDGE_FACTORY_ADDRESS,
    ETHERLINK_TESTNET_CHAIN_ID: ETHERLINK_TESTNET_BRIDGE_FACTORY_ADDRESS,
    POLKADOT_WESTEND_CHAIN_ID: POLKADOT_WESTEND_BRIDGE_FACTORY_ADDRESS,
}

# RWA Escrow Addresses Mapping
RWA_ESCROW_ADDRESSES = {
    SEPOLIA_CHAIN_ID: SEPOLIA_RWA_ESCROW_ADDRESS,
    CELO_ALFAJORES_CHAIN_ID: CELO_ALFAJORES_RWA_ESCROW_ADDRESS,
    MONAD_TESTNET_CHAIN_ID: MONAD_TESTNET_RWA_ESCROW_ADDRESS,
    ETHERLINK_TESTNET_CHAIN_ID: ETHERLINK_TESTNET_RWA_ESCROW_ADDRESS,
    POLKADOT_WESTEND_CHAIN_ID: POLKADOT_WESTEND_RWA_ESCROW_ADDRESS,
}

# Supported Chains for Bridge
SUPPORTED_CHAINS = [
    SEPOLIA_CHAIN_ID,
    CELO_ALFAJORES_CHAIN_ID,
    MONAD_TESTNET_CHAIN_ID,
    ETHERLINK_TESTNET_CHAIN_ID,
    POLKADOT_WESTEND_CHAIN_ID,
]

# Chain-specific RPC URLs
CHAIN_RPC_URLS = {
    SEPOLIA_CHAIN_ID: SEPOLIA_RPC_URL,
    CELO_ALFAJORES_CHAIN_ID: CELO_ALFAJORES_RPC_URL,
    MONAD_TESTNET_CHAIN_ID: MONAD_TESTNET_RPC_URL,
    ETHERLINK_TESTNET_CHAIN_ID: ETHERLINK_TESTNET_RPC_URL,
    POLKADOT_WESTEND_CHAIN_ID: POLKADOT_WESTEND_RPC_URL,
}

# Bridge Configuration
BRIDGE_MIN_TIMELOCK: int = _safe_int(os.getenv("BRIDGE_MIN_TIMELOCK"), 3600) or 3600  # 1 hour
BRIDGE_MAX_TIMELOCK: int = _safe_int(os.getenv("BRIDGE_MAX_TIMELOCK"), 2592000) or 2592000  # 30 days
BRIDGE_RESOLVER_SERVICE_URL: Optional[str] = os.getenv("BRIDGE_RESOLVER_SERVICE_URL")
BRIDGE_COORDINATION_ENDPOINT: Optional[str] = os.getenv("BRIDGE_COORDINATION_ENDPOINT")

# Resolver Service Configuration
RESOLVER_SERVICE_ENABLED: bool = os.getenv("RESOLVER_SERVICE_ENABLED", "true").lower() == "true"
RESOLVER_REPUTATION_THRESHOLD: float = float(os.getenv("RESOLVER_REPUTATION_THRESHOLD", "0.7"))
RESOLVER_BID_TIMEOUT: int = _safe_int(os.getenv("RESOLVER_BID_TIMEOUT"), 300) or 300  # 5 minutes
RESOLVER_EXECUTION_TIMEOUT: int = _safe_int(os.getenv("RESOLVER_EXECUTION_TIMEOUT"), 600) or 600  # 10 minutes
DUTCH_AUCTION_DURATION: int = _safe_int(os.getenv("DUTCH_AUCTION_DURATION"), 300) or 300  # 5 minutes
MIN_RESOLVER_STAKE: int = _safe_int(os.getenv("MIN_RESOLVER_STAKE"), 1000) or 1000
FUSION_INTEGRATION_ENABLED: bool = os.getenv("FUSION_INTEGRATION_ENABLED", "true").lower() == "true"

# Resolver Network Configuration
RESOLVER_ADDRESS: Optional[str] = os.getenv("RESOLVER_ADDRESS")
RESOLVER_PRIVATE_KEY: Optional[str] = os.getenv("RESOLVER_PRIVATE_KEY")
RESOLVER_STAKE_AMOUNT: int = _safe_int(os.getenv("RESOLVER_STAKE_AMOUNT"), 1000) or 1000
AUTO_BID_ENABLED: bool = os.getenv("AUTO_BID_ENABLED", "true").lower() == "true"
AUTO_EXECUTION_ENABLED: bool = os.getenv("AUTO_EXECUTION_ENABLED", "true").lower() == "true"

# 1inch Fusion Configuration
FUSION_API_URL: str = os.getenv("FUSION_API_URL", "https://api.1inch.dev/fusion")
FUSION_AUCTION_DURATION: int = _safe_int(os.getenv("FUSION_AUCTION_DURATION"), 300) or 300  # 5 minutes
MEV_PROTECTION_ENABLED: bool = os.getenv("MEV_PROTECTION_ENABLED", "true").lower() == "true"
BRIDGE_GAS_BUFFER: float = float(os.getenv("BRIDGE_GAS_BUFFER", "1.2"))

# Bridge Coordinator Configuration
BRIDGE_SYNC_INTERVAL: int = _safe_int(os.getenv("BRIDGE_SYNC_INTERVAL"), 30) or 30  # 30 seconds
EVENT_MONITOR_INTERVAL: int = _safe_int(os.getenv("EVENT_MONITOR_INTERVAL"), 10) or 10  # 10 seconds
COMMITMENT_WINDOW: int = _safe_int(os.getenv("COMMITMENT_WINDOW"), 120) or 120  # 2 minutes
FAILOVER_TIMEOUT: int = _safe_int(os.getenv("FAILOVER_TIMEOUT"), 600) or 600  # 10 minutes

# Chain Configuration for Bridge Operations
CHAINS = {
    'sepolia': {
        'chain_id': SEPOLIA_CHAIN_ID,
        'rpc_url': SEPOLIA_RPC_URL,
        'bridge_factory': SEPOLIA_BRIDGE_FACTORY_ADDRESS,
        'rwa_escrow': SEPOLIA_RWA_ESCROW_ADDRESS
    },
    'celo_alfajores': {
        'chain_id': CELO_ALFAJORES_CHAIN_ID,
        'rpc_url': CELO_ALFAJORES_RPC_URL,
        'bridge_factory': CELO_ALFAJORES_BRIDGE_FACTORY_ADDRESS,
        'rwa_escrow': CELO_ALFAJORES_RWA_ESCROW_ADDRESS
    },
    'monad': {
        'chain_id': MONAD_TESTNET_CHAIN_ID,
        'rpc_url': MONAD_TESTNET_RPC_URL,
        'bridge_factory': MONAD_TESTNET_BRIDGE_FACTORY_ADDRESS,
        'rwa_escrow': MONAD_TESTNET_RWA_ESCROW_ADDRESS
    },
    'etherlink': {
        'chain_id': ETHERLINK_TESTNET_CHAIN_ID,
        'rpc_url': ETHERLINK_TESTNET_RPC_URL,
        'bridge_factory': ETHERLINK_TESTNET_BRIDGE_FACTORY_ADDRESS,
        'rwa_escrow': ETHERLINK_TESTNET_RWA_ESCROW_ADDRESS
    },
    'polkadot_westend': {
        'chain_id': POLKADOT_WESTEND_CHAIN_ID,
        'rpc_url': POLKADOT_WESTEND_RPC_URL,
        'bridge_factory': POLKADOT_WESTEND_BRIDGE_FACTORY_ADDRESS,
        'rwa_escrow': POLKADOT_WESTEND_RWA_ESCROW_ADDRESS
    }
}

# Bridge Contract Addresses Mapping
BRIDGE_CONTRACTS = {
    'sepolia': {
        'factory': SEPOLIA_BRIDGE_FACTORY_ADDRESS,
        'escrow': SEPOLIA_RWA_ESCROW_ADDRESS
    },
    'celo_alfajores': {
        'factory': CELO_ALFAJORES_BRIDGE_FACTORY_ADDRESS,
        'escrow': CELO_ALFAJORES_RWA_ESCROW_ADDRESS
    },
    'monad': {
        'factory': MONAD_TESTNET_BRIDGE_FACTORY_ADDRESS,
        'escrow': MONAD_TESTNET_RWA_ESCROW_ADDRESS
    },
    'etherlink': {
        'factory': ETHERLINK_TESTNET_BRIDGE_FACTORY_ADDRESS,
        'escrow': ETHERLINK_TESTNET_RWA_ESCROW_ADDRESS
    },
    'polkadot_westend': {
        'factory': POLKADOT_WESTEND_BRIDGE_FACTORY_ADDRESS,
        'escrow': POLKADOT_WESTEND_RWA_ESCROW_ADDRESS
    }
}


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


