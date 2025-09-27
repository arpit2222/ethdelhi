from __future__ import annotations

import asyncio
import os
import time
from datetime import datetime, timezone

from . import config
from .dex_client import DEXClient
from .oneinch_client import OneInchClient
from .pyth_client import PythPriceClient
from .trading_strategy import SMACrossoverStrategy, TradingSignal
from .zerog_client import ZeroGClient
from .nlp_parser import parse_intent
from .advanced_hooks import build_twap, build_ladder, build_dutch, ChildOrder
from .limit_order_client import LimitOrderClient
from .order_store import OrderStore
from .order_monitor import OrderMonitor
from .real_time_trader import RealTimeTrader


def _apply_chain_overrides(preset: dict[str, str | int]) -> None:
    for k, v in preset.items():
        os.environ[str(k)] = str(v)
    config.RPC_URL = str(preset.get("RPC_URL", config.RPC_URL))
    config.CHAIN_ID = int(preset.get("CHAIN_ID", config.CHAIN_ID or 0)) or config.CHAIN_ID
    config.ONEINCH_CHAIN_ID = int(preset.get("ONEINCH_CHAIN_ID", config.ONEINCH_CHAIN_ID or 0)) or config.ONEINCH_CHAIN_ID
    config.WETH_ADDRESS = str(preset.get("WETH_ADDRESS", config.WETH_ADDRESS or "")) or config.WETH_ADDRESS
    config.USDC_ADDRESS = str(preset.get("USDC_ADDRESS", config.USDC_ADDRESS or "")) or config.USDC_ADDRESS
    config.PYTH_ETH_USD_FEED_ID = str(preset.get("PYTH_ETH_USD_FEED_ID", config.PYTH_ETH_USD_FEED_ID or "")) or config.PYTH_ETH_USD_FEED_ID
    config.SOLANA_RPC_URL = str(preset.get("SOLANA_RPC_URL", config.SOLANA_RPC_URL or "")) or config.SOLANA_RPC_URL
    config.SOLANA_PUBLIC_KEY = str(preset.get("SOLANA_PUBLIC_KEY", config.SOLANA_PUBLIC_KEY or "")) or config.SOLANA_PUBLIC_KEY
    config.WSOL_MINT = str(preset.get("WSOL_MINT", config.WSOL_MINT or "")) or config.WSOL_MINT
    config.USDC_MINT = str(preset.get("USDC_MINT", config.USDC_MINT or "")) or config.USDC_MINT
    config.PYTH_ETH_USD_FEED_ID_SOL = str(preset.get("PYTH_ETH_USD_FEED_ID_SOL", config.PYTH_ETH_USD_FEED_ID_SOL or "")) or config.PYTH_ETH_USD_FEED_ID_SOL
    config.TRADE_AMOUNT_LAMPORTS = int(preset.get("TRADE_AMOUNT_LAMPORTS", config.TRADE_AMOUNT_LAMPORTS or 0)) or config.TRADE_AMOUNT_LAMPORTS


def select_chain_interactively() -> str:
    presets: list[tuple[str, dict[str, str | int]]] = [
        (
            "Real-time Arbitrum Trading (1inch)",
            {
                "RPC_URL": os.getenv("ARB_RPC_URL", "https://arb1.arbitrum.io/rpc"),
                "CHAIN_ID": 42161,
                "ONEINCH_CHAIN_ID": 42161,
                "WETH_ADDRESS": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
                "USDC_ADDRESS": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "PYTH_ETH_USD_FEED_ID": config.PYTH_ETH_USD_FEED_ID or "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
            },
        ),
        (
            "Real-time Solana Trading (1inch Fusion)",
            {
                "SOLANA_RPC_URL": os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
                "SOLANA_PUBLIC_KEY": os.getenv("SOLANA_PUBLIC_KEY", ""),
                "WSOL_MINT": os.getenv("WSOL_MINT", "So11111111111111111111111111111111111111112"),
                "USDC_MINT": os.getenv("USDC_MINT", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
                "PYTH_ETH_USD_FEED_ID_SOL": config.PYTH_ETH_USD_FEED_ID_SOL or "H6ARHf6YXhGYeQfUzQnetJ6dHGHXoU49LMzxGRH17pBF",
                "TRADE_AMOUNT_LAMPORTS": config.TRADE_AMOUNT_LAMPORTS or 10000000,
            },
        ),
        (
            "Background LLM Strategies (1inch LOP)",
            {
                "RPC_URL": os.getenv("ARB_RPC_URL", "https://arb1.arbitrum.io/rpc"),
                "CHAIN_ID": 42161,
                "ONEINCH_CHAIN_ID": 42161,
                "WETH_ADDRESS": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
                "USDC_ADDRESS": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "PYTH_ETH_USD_FEED_ID": config.PYTH_ETH_USD_FEED_ID or "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
            },
        ),
    ]

    print("Choose trading mode:")
    for idx, (name, _) in enumerate(presets, start=1):
        print(f"  {idx}) {name}")
    choice = input("Enter number [1]: ").strip() or "1"
    try:
        sel = int(choice)
    except ValueError:
        sel = 1

    sel = max(1, min(sel, len(presets)))
    name, cfg = presets[sel - 1]
    _apply_chain_overrides(cfg)
    print(f"Selected: {name}")
    return name


async def run_background_llm_strategies():
    """Run LLM-driven strategies in background for hours"""
    print("🧠 Background LLM Strategies Mode")
    print("Enter your trading plan. The bot will execute it in background for the specified duration.")
    
    # Initialize the trader once
    trader = RealTimeTrader(is_solana=False)
    trader_task = None
    
    while True:
        text = input("\n> Enter strategy (or 'quit' to exit): ").strip()
        if text.lower() in ('quit', 'exit', 'q'):
            if trader_task:
                trader.running = False
                trader_task.cancel()
            break
            
        parsed = parse_intent(text)
        if not parsed:
            print("❌ Could not parse your intent. Please rephrase.")
            continue

        # Create strategy configuration
        strategy_id = f"llm_{int(time.time())}"
        duration_secs = parsed.get("duration_secs", 3600)  # Default 1 hour
        expires_at = time.time() + duration_secs
        
        strategy_config = {
            "mode": parsed["mode"],
            "side": parsed["side"],
            "expires_at": expires_at,
            "parsed_intent": parsed,
            "original_text": text,
            "created_at": time.time(),
        }
        
        # Add strategy-specific configuration
        if parsed["mode"] == "twap":
            children = build_twap(
                parsed["side"], 
                parsed.get("base", "ETH"), 
                parsed.get("quote", "USDC"),
                float(parsed["total_amount"]), 
                float(parsed["start_price"]), 
                parsed.get("end_price"), 
                int(parsed["duration_secs"]), 
                int(parsed["slices"]), 
                int(parsed["expiry_each_secs"]), 
                bool(parsed.get("post_only", False)), 
                strategy_id
            )
            strategy_config.update({
                "children": [c.__dict__ for c in children],
                "total_slices": len(children),
                "slice_interval": duration_secs // len(children),
                "slice_index": 0,
                "last_slice_time": 0,
            })
        
        # Add strategy to trader
        trader.add_strategy(strategy_id, strategy_config)
        
        print(f"✅ Strategy '{strategy_id}' added and will run for {duration_secs/3600:.1f} hours")
        print(f"📊 Strategy details: {parsed['mode'].upper()} - {parsed['side']} - Duration: {duration_secs}s")
        
        # Start trader if not already running
        if trader_task is None or trader_task.done():
            print("🚀 Starting real-time trader...")
            trader.running = True
            trader_task = asyncio.create_task(trader.start())
        
        print("💡 Strategy is now running in background. Add more strategies or type 'quit' to exit")


async def run_real_time_trading(is_solana: bool = False):
    """Run real-time trading with 1-second price updates"""
    mode_name = "Solana" if is_solana else "Arbitrum"
    print(f"⚡ Real-time {mode_name} trading started (1-second price updates)")
    
    trader = RealTimeTrader(is_solana=is_solana)
    
    # Add a simple momentum strategy
    momentum_strategy = {
        "mode": "momentum",
        "side": "BUY",
        "trigger_price": 3500.0,  # Example trigger price
        "amount": 0.1,
        "created_at": time.time(),
    }
    
    trader.add_strategy("momentum_1", momentum_strategy)
    
    # Start real-time trading
    await trader.start()


async def run_bot() -> None:
    selected_chain_name = select_chain_interactively()

    # Background LLM strategies
    if "background llm" in selected_chain_name.lower():
        await run_background_llm_strategies()
        return
    
    # Real-time trading modes
    is_solana_mode = "solana" in selected_chain_name.lower()
    await run_real_time_trading(is_solana=is_solana_mode)


if __name__ == "__main__":
    asyncio.run(run_bot())

