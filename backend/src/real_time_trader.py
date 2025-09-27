from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from .pyth_client import PythPriceClient
from .oneinch_client import OneInchClient
from .limit_order_client import LimitOrderClient
from .nlp_parser import parse_intent
from .advanced_hooks import build_twap, build_ladder, build_dutch, ChildOrder
from .order_store import OrderStore
from .order_monitor import OrderMonitor
from .status_logger import StatusLogger
from . import config


class RealTimeTrader:
    """Real-time trading engine with background LLM execution"""
    
    def __init__(self, is_solana: bool = False):
        self.is_solana = is_solana
        self.price_client = PythPriceClient()
        self.oneinch = OneInchClient(is_solana=is_solana)
        self.limit_client = LimitOrderClient() if not is_solana else None
        self.store = OrderStore()
        self.monitor = OrderMonitor() if not is_solana else None
        
        # Background tasks
        self.active_strategies: Dict[str, Dict[str, Any]] = {}
        self.running = False
        
        # Price tracking
        self.price_history: List[float] = []
        self.last_price: Optional[float] = None
        
        # Add status logger
        self.status_logger = StatusLogger()
        
    async def start(self):
        """Start the real-time trading engine"""
        self.running = True
        print(" Real-time trading engine started")
        
        # Create initial status file
        self.status_logger.update_status(self)
        
        # Start background tasks
        tasks = [
            asyncio.create_task(self._price_monitor()),
            asyncio.create_task(self._strategy_executor()),
            asyncio.create_task(self._order_monitor()),
        ]
        
        try:
            await asyncio.gather(*tasks)
        except KeyboardInterrupt:
            print(" Shutting down real-time trading engine...")
            self.running = False
            for task in tasks:
                task.cancel()
    
    async def _price_monitor(self):
        """Monitor prices in real-time"""
        pyth_feed_id = config.PYTH_ETH_USD_FEED_ID_SOL if self.is_solana else config.PYTH_ETH_USD_FEED_ID
        
        while self.running:
            try:
                price = await self.price_client.get_latest_price(pyth_feed_id)
                if price is not None:
                    self.last_price = price
                    self.price_history.append(price)
                    # Keep only last 100 prices
                    if len(self.price_history) > 100:
                        self.price_history.pop(0)
                    
                    print(f" Price: ${price:.2f}")
                    
                    # Check active strategies for price triggers
                    await self._check_price_triggers(price)
                    
                    # Update status for dashboard
                    self.status_logger.update_status(self)
                    
            except Exception as e:
                print(f" Price monitoring error: {e}")
                # Still update status even if price fetch failed
                self.status_logger.update_status(self)
            
            await asyncio.sleep(1)  # 1-second updates for real-time trading
    
    async def _strategy_executor(self):
        """Execute background strategies"""
        while self.running:
            try:
                for strategy_id, strategy in list(self.active_strategies.items()):
                    if strategy.get("expires_at") and time.time() > strategy["expires_at"]:
                        print(f" Strategy {strategy_id} expired")
                        del self.active_strategies[strategy_id]
                        continue
                    
                    # Execute strategy logic
                    await self._execute_strategy(strategy_id, strategy)
                    
            except Exception as e:
                print(f" Strategy execution error: {e}")
            
            await asyncio.sleep(5)  # Check every 5 seconds
    
    async def _order_monitor(self):
        """Monitor order status"""
        if not self.monitor:
            return
            
        while self.running:
            try:
                # Check for filled/canceled orders
                for strategy_id, strategy in list(self.active_strategies.items()):
                    order_hashes = strategy.get("order_hashes", [])
                    for order_hash in order_hashes[:]:
                        try:
                            status = self.limit_client.status(order_hash)
                            if status.get("filled"):
                                print(f" Order {order_hash} filled")
                                order_hashes.remove(order_hash)
                                # Cancel remaining orders in group
                                for other_hash in order_hashes:
                                    try:
                                        self.limit_client.cancel(other_hash)
                                    except:
                                        pass
                                # Strategy completed
                                del self.active_strategies[strategy_id]
                                break
                            elif status.get("canceled") or status.get("expired"):
                                order_hashes.remove(order_hash)
                        except:
                            pass
                            
            except Exception as e:
                print(f" Order monitoring error: {e}")
            
            await asyncio.sleep(10)  # Check every 10 seconds
    
    async def _check_price_triggers(self, price: float):
        """Check if current price triggers any strategies"""
        for strategy_id, strategy in self.active_strategies.items():
            trigger_price = strategy.get("trigger_price")
            if trigger_price and self._should_trigger(price, trigger_price, strategy):
                print(f" Price trigger hit: ${price:.2f} for strategy {strategy_id}")
                await self._execute_triggered_strategy(strategy_id, strategy)
    
    def _should_trigger(self, price: float, trigger_price: float, strategy: Dict[str, Any]) -> bool:
        """Determine if price should trigger strategy"""
        side = strategy.get("side", "").upper()
        if side == "BUY":
            return price <= trigger_price
        elif side == "SELL":
            return price >= trigger_price
        return False
    
    async def _execute_triggered_strategy(self, strategy_id: str, strategy: Dict[str, Any]):
        """Execute a price-triggered strategy"""
        try:
            # Execute immediate market order
            side = strategy.get("side", "").upper()
            amount = strategy.get("amount", 0)
            
            if self.is_solana:
                token_in = config.USDC_MINT if side == "BUY" else config.WSOL_MINT
                token_out = config.WSOL_MINT if side == "BUY" else config.USDC_MINT
                trade_amount = config.TRADE_AMOUNT_LAMPORTS
            else:
                token_in = config.USDC_ADDRESS if side == "BUY" else config.WETH_ADDRESS
                token_out = config.WETH_ADDRESS if side == "BUY" else config.USDC_ADDRESS
                trade_amount = config.TRADE_AMOUNT_WEI
            
            tx_hash = self.oneinch.swap(token_in, token_out, trade_amount)
            print(f" Triggered trade executed: {tx_hash}")
            
            # Mark strategy as completed
            del self.active_strategies[strategy_id]
            
        except Exception as e:
            print(f" Triggered strategy execution failed: {e}")
    
    async def _execute_strategy(self, strategy_id: str, strategy: Dict[str, Any]):
        """Execute background strategy logic"""
        mode = strategy.get("mode")
        
        if mode == "twap" and not self.is_solana:
            await self._execute_twap_strategy(strategy_id, strategy)
        elif mode == "ladder" and not self.is_solana:
            await self._execute_ladder_strategy(strategy_id, strategy)
        elif mode == "dutch" and not self.is_solana:
            await self._execute_dutch_strategy(strategy_id, strategy)
    
    async def _execute_twap_strategy(self, strategy_id: str, strategy: Dict[str, Any]):
        """Execute TWAP strategy in background"""
        # Check if it's time for next slice
        last_slice_time = strategy.get("last_slice_time", 0)
        slice_interval = strategy.get("slice_interval", 300)
        
        if time.time() - last_slice_time >= slice_interval:
            # Execute next slice
            slice_index = strategy.get("slice_index", 0)
            total_slices = strategy.get("total_slices", 1)
            
            if slice_index < total_slices:
                try:
                    # Get current slice from strategy
                    children = strategy.get("children", [])
                    if slice_index < len(children):
                        child = children[slice_index]
                        
                        # Submit order
                        result = self.limit_client.create_and_submit(
                            side=child.side,
                            base=child.base,
                            quote=child.quote,
                            amount=child.amount,
                            limit_price=child.limit_price,
                            expiry_secs=child.expiry_secs,
                            partial_fill=True,
                            post_only=child.post_only
                        )
                        
                        order_hash = result.get("orderHash", "")
                        if order_hash:
                            strategy.setdefault("order_hashes", []).append(order_hash)
                            print(f" TWAP slice {slice_index + 1}/{total_slices} submitted: {order_hash}")
                        
                        # Update strategy state
                        strategy["last_slice_time"] = time.time()
                        strategy["slice_index"] = slice_index + 1
                        
                except Exception as e:
                    print(f" TWAP slice execution failed: {e}")
    
    async def _execute_ladder_strategy(self, strategy_id: str, strategy: Dict[str, Any]):
        """Execute ladder strategy in background"""
        # Similar to TWAP but with price-based triggers
        pass
    
    async def _execute_dutch_strategy(self, strategy_id: str, strategy: Dict[str, Any]):
        """Execute Dutch auction strategy in background"""
        # Similar to TWAP but with decreasing prices
        pass
    
    def add_strategy(self, strategy_id: str, strategy_config: Dict[str, Any]):
        """Add a new background strategy"""
        self.active_strategies[strategy_id] = strategy_config
        print(f" Strategy {strategy_id} added: {strategy_config.get('mode', 'unknown')}")
        
        # Update status file immediately when strategy is added
        self.status_logger.update_status(self)
    
    def remove_strategy(self, strategy_id: str):
        """Remove a background strategy"""
        if strategy_id in self.active_strategies:
            del self.active_strategies[strategy_id]
            print(f" Strategy {strategy_id} removed")
            
            # Update status file immediately when strategy is removed
            self.status_logger.update_status(self)
    
    def get_active_strategies(self) -> Dict[str, Dict[str, Any]]:
        """Get all active strategies"""
        return self.active_strategies.copy()
    
    def get_price_info(self) -> Dict[str, Any]:
        """Get current price information"""
        return {
            "current_price": self.last_price,
            "price_history": self.price_history[-10:],  # Last 10 prices
            "active_strategies": len(self.active_strategies)
        }
