"""
Improved main entry point with better error handling and configuration validation
"""
from __future__ import annotations

import asyncio
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional

from . import config
from .config_validator import validate_and_setup_config
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


class TradingBotApp:
    """Main application class for the trading bot"""
    
    def __init__(self):
        self.trader: Optional[RealTimeTrader] = None
        self.running = False
        
    async def initialize(self) -> bool:
        """Initialize the application"""
        print("🚀 Initializing ETHGlobal Trading Bot...")
        
        # Validate configuration
        if not validate_and_setup_config():
            return False
        
        print("✅ Configuration validated successfully")
        return True
    
    async def run_interactive_mode(self):
        """Run in interactive mode with chain selection"""
        print("\n🎯 ETHGlobal Trading Bot - Interactive Mode")
        print("=" * 50)
        
        selected_mode = await self._select_trading_mode()
        
        if selected_mode == "background":
            await self._run_background_strategies()
        elif selected_mode == "arbitrum":
            await self._run_real_time_trading(is_solana=False)
        elif selected_mode == "solana":
            await self._run_real_time_trading(is_solana=True)
        else:
            print("❌ Invalid mode selected")
            return
    
    async def _select_trading_mode(self) -> str:
        """Select trading mode interactively"""
        modes = [
            ("1", "Real-time Arbitrum Trading", "arbitrum"),
            ("2", "Real-time Solana Trading", "solana"),
            ("3", "Background LLM Strategies", "background"),
        ]
        
        print("Choose trading mode:")
        for key, description, _ in modes:
            print(f"  {key}) {description}")
        
        while True:
            choice = input("Enter number [1]: ").strip() or "1"
            
            for key, _, mode in modes:
                if choice == key:
                    print(f"✅ Selected: {modes[int(key)-1][1]}")
                    return mode
            
            print("❌ Invalid choice. Please try again.")
    
    async def _run_real_time_trading(self, is_solana: bool = False):
        """Run real-time trading"""
        chain_name = "Solana" if is_solana else "Arbitrum"
        print(f"\n⚡ Starting real-time {chain_name} trading...")
        
        try:
            self.trader = RealTimeTrader(is_solana=is_solana)
            self.running = True
            
            # Add a sample strategy
            await self._add_sample_strategy(is_solana)
            
            # Start trading
            await self.trader.start()
            
        except KeyboardInterrupt:
            print("\n⏹️  Stopping trading bot...")
            self.running = False
            if self.trader:
                self.trader.running = False
        except Exception as e:
            print(f"❌ Error in real-time trading: {e}")
            raise
    
    async def _run_background_strategies(self):
        """Run background LLM strategies"""
        print("\n🧠 Background LLM Strategies Mode")
        print("Enter your trading strategies. The bot will execute them in the background.")
        print("Type 'help' for examples, 'status' for current state, or 'quit' to exit.")
        
        try:
            self.trader = RealTimeTrader(is_solana=False)
            self.running = True
            
            # Start trader in background
            trader_task = asyncio.create_task(self.trader.start())
            
            # Interactive command loop
            await self._interactive_command_loop()
            
            # Stop trader
            self.trader.running = False
            trader_task.cancel()
            
        except KeyboardInterrupt:
            print("\n⏹️  Stopping background strategies...")
            self.running = False
            if self.trader:
                self.trader.running = False
        except Exception as e:
            print(f"❌ Error in background strategies: {e}")
            raise
    
    async def _interactive_command_loop(self):
        """Interactive command loop for background strategies"""
        while self.running:
            try:
                command = input("\n> ").strip()
                
                
                if command.lower() in ('quit', 'exit', 'q'):
                    break
                elif command.lower() == 'help':
                    self._show_help()
                elif command.lower() == 'status':
                    self._show_status()
                elif command.lower() == 'clear':
                    os.system('cls' if os.name == 'nt' else 'clear')
                elif command:
                    await self._process_strategy_command(command)
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error processing command: {e}")
    
    def _show_help(self):
        """Show help information"""
        print("\n📖 Available Commands:")
        print("  help     - Show this help message")
        print("  status   - Show current bot status")
        print("  clear    - Clear the screen")
        print("  quit     - Exit the bot")
        print("\n📝 Strategy Examples:")
        print("  TWAP buy 0.1 ETH from 3500 to 3400 over 1h in 5 slices")
        print("  Ladder buy 0.5 ETH from 3600 to 3400 in 10 steps")
        print("  Dutch auction sell 0.2 ETH starting at 3800 over 30m")
    
    def _show_status(self):
        """Show current bot status"""
        if not self.trader:
            print("❌ Trader not initialized")
            return
        
        strategies = self.trader.get_active_strategies()
        price_info = self.trader.get_price_info()
        
        print(f"\n📊 Bot Status:")
        print(f"  Running: {'✅' if self.running else '❌'}")
        print(f"  Current Price: ${price_info.get('current_price', 'N/A'):.2f}")
        print(f"  Active Strategies: {len(strategies)}")
        
        if strategies:
            print("\n📈 Active Strategies:")
            for strategy_id, strategy in strategies.items():
                mode = strategy.get('mode', 'unknown')
                side = strategy.get('side', 'unknown')
                expires_at = strategy.get('expires_at', 0)
                remaining = max(0, expires_at - time.time())
                
                print(f"  • {strategy_id}: {mode.upper()} {side}")
                print(f"    Expires in: {remaining/3600:.1f} hours")
    
    async def _process_strategy_command(self, command: str):
        """Process a strategy command"""
        try:
            parsed = parse_intent(command)
            if not parsed:
                print("❌ Could not parse your intent. Try: 'TWAP buy 0.1 ETH from 3500 to 3400 over 1h in 5 slices'")
                return
            
            # Create strategy configuration
            strategy_id = f"llm_{int(time.time())}"
            duration_secs = parsed.get("duration_secs", 3600)
            expires_at = time.time() + duration_secs
            
            strategy_config = {
                "mode": parsed["mode"],
                "side": parsed["side"],
                "expires_at": expires_at,
                "parsed_intent": parsed,
                "original_text": command,
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
            self.trader.add_strategy(strategy_id, strategy_config)
            
            print(f"✅ Strategy '{strategy_id}' added successfully!")
            print(f"📊 Mode: {parsed['mode'].upper()} | Side: {parsed['side']} | Duration: {duration_secs/3600:.1f}h")
            
        except Exception as e:
            print(f"❌ Error processing strategy: {e}")
    
    async def _add_sample_strategy(self, is_solana: bool):
        """Add a sample strategy for real-time trading"""
        if is_solana:
            # Solana sample strategy
            strategy = {
                "mode": "momentum",
                "side": "BUY",
                "trigger_price": 3500.0,
                "amount": 0.01,  # Smaller amount for Solana
                "created_at": time.time(),
            }
        else:
            # Arbitrum sample strategy
            strategy = {
                "mode": "momentum",
                "side": "BUY",
                "trigger_price": 3500.0,
                "amount": 0.1,
                "created_at": time.time(),
            }
        
        strategy_id = f"sample_{int(time.time())}"
        self.trader.add_strategy(strategy_id, strategy)
        print(f"📈 Sample strategy added: {strategy['mode']} {strategy['side']} at ${strategy['trigger_price']}")


async def main():
    """Main entry point"""
    app = TradingBotApp()
    
    try:
        # Initialize application
        if not await app.initialize():
            print("❌ Initialization failed")
            sys.exit(1)
        
        # Run interactive mode
        await app.run_interactive_mode()
        
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)
    finally:
        if app.trader:
            app.trader.running = False


if __name__ == "__main__":
    asyncio.run(main())
