ETHGlobal Trading Bot (Pyth + 0g + Uniswap V3)

Setup
- Create and activate venv
  - Windows (PowerShell):
    - python -m venv .venv
    - .\.venv\Scripts\Activate.ps1
- Install deps: pip install -r requirements.txt
- Copy .env.example to .env and fill values.

Run
- python -m src.main

Environment
- RPC_URL: EVM RPC endpoint
- CHAIN_ID: network id
- PRIVATE_KEY, PUBLIC_KEY
- PYTH_ETH_USD_FEED_ID: Pyth ETH/USD feed ID for your network
- ZERO_G_RPC_URL: 0g HTTP endpoint to store logs
- UNISWAP_V3_ROUTER_ADDRESS, WETH_ADDRESS, USDC_ADDRESS
- TRADE_AMOUNT_WEI, UNISWAP_POOL_FEE

1inch
- Set ONEINCH_API_KEY and ONEINCH_CHAIN_ID (or rely on CHAIN_ID)
- When ONEINCH_API_KEY is set, swaps use 1inch API; otherwise Uniswap V3 path is used


