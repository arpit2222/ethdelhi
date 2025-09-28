"""
Background Daemon Service for Automated Resolver Operations
Monitors bridge events, submits competitive bids, and executes transfers automatically
"""

import asyncio
import logging
import time
import signal
import sys
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

from .config import Config
from .resolver_service import ResolverService, BridgeOrder
from .bridge_coordinator import BridgeCoordinator
from .fusion_bridge_client import FusionBridgeClient
from .zerog_client import ZeroGClient


@dataclass
class DaemonConfig:
    """Configuration for resolver daemon"""
    monitor_interval: int = 10  # seconds
    bid_submission_interval: int = 30  # seconds
    execution_check_interval: int = 60  # seconds
    reputation_update_interval: int = 300  # seconds
    max_concurrent_operations: int = 5
    auto_bid_enabled: bool = True
    auto_execution_enabled: bool = True
    resolver_address: str = ""
    private_key: str = ""
    stake_amount: int = 1000


class ResolverDaemon:
    """
    Background daemon service for automated resolver operations
    Runs continuously to monitor bridge events, submit competitive bids, and execute transfers
    """
    
    def __init__(self, config: Config, daemon_config: DaemonConfig):
        self.config = config
        self.daemon_config = daemon_config
        self.logger = logging.getLogger(__name__)
        
        # Initialize services
        self.resolver_service = ResolverService(config)
        self.bridge_coordinator = BridgeCoordinator(config, self.resolver_service)
        self.fusion_client = FusionBridgeClient(config)
        self.zerog_client = ZeroGClient()
        
        # Daemon state
        self.running = False
        self.active_operations: Dict[str, asyncio.Task] = {}
        self.monitored_orders: Dict[str, BridgeOrder] = {}
        self.resolver_stats = {
            'total_bids': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'reputation_score': 0.8,
            'last_activity': time.time()
        }
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    async def start(self):
        """Start the resolver daemon"""
        self.logger.info("Starting resolver daemon...")
        self.running = True
        
        # Initialize resolver in the network
        await self._initialize_resolver()
        
        # Start monitoring tasks
        tasks = [
            asyncio.create_task(self._monitor_bridge_events()),
            asyncio.create_task(self._auto_bid_on_orders()),
            asyncio.create_task(self._execute_winning_bids()),
            asyncio.create_task(self._maintain_resolver_reputation()),
            asyncio.create_task(self._cleanup_expired_operations())
        ]
        
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            self.logger.error(f"Error in daemon tasks: {e}")
        finally:
            await self._shutdown()
    
    async def _monitor_bridge_events(self):
        """Monitor bridge events across all chains"""
        self.logger.info("Starting bridge event monitoring...")
        
        while self.running:
            try:
                # Discover new bridge orders
                new_orders = await self.resolver_service.discover_bridge_orders()
                
                for order in new_orders:
                    if order.transfer_id not in self.monitored_orders:
                        self.monitored_orders[order.transfer_id] = order
                        self.logger.info(f"Started monitoring new order: {order.transfer_id}")
                        
                        # Start monitoring task for this order
                        if len(self.active_operations) < self.daemon_config.max_concurrent_operations:
                            task = asyncio.create_task(
                                self._monitor_single_order(order.transfer_id)
                            )
                            self.active_operations[order.transfer_id] = task
                
                # Monitor escrow events
                new_events = await self.bridge_coordinator.monitor_escrow_events()
                if new_events:
                    self.logger.info(f"Processed {len(new_events)} new escrow events")
                
                # Check for expired orders
                expired_orders = await self.resolver_service.monitor_order_timeouts()
                for transfer_id in expired_orders:
                    if transfer_id in self.active_operations:
                        self.active_operations[transfer_id].cancel()
                        del self.active_operations[transfer_id]
                    if transfer_id in self.monitored_orders:
                        del self.monitored_orders[transfer_id]
                
                await asyncio.sleep(self.daemon_config.monitor_interval)
                
            except Exception as e:
                self.logger.error(f"Error in bridge event monitoring: {e}")
                await asyncio.sleep(self.daemon_config.monitor_interval)
    
    async def _auto_bid_on_orders(self):
        """Automatically submit competitive bids on bridge orders"""
        self.logger.info("Starting auto-bidding...")
        
        while self.running:
            try:
                if not self.daemon_config.auto_bid_enabled:
                    await asyncio.sleep(self.daemon_config.bid_submission_interval)
                    continue
                
                # Get orders that need bidding
                orders_to_bid = []
                for transfer_id, order in self.monitored_orders.items():
                    if order.status == 'pending' and await self._should_bid_on_order(order):
                        orders_to_bid.append(order)
                
                # Submit bids
                for order in orders_to_bid:
                    try:
                        await self._submit_competitive_bid(order)
                    except Exception as e:
                        self.logger.error(f"Error submitting bid for {order.transfer_id}: {e}")
                
                await asyncio.sleep(self.daemon_config.bid_submission_interval)
                
            except Exception as e:
                self.logger.error(f"Error in auto-bidding: {e}")
                await asyncio.sleep(self.daemon_config.bid_submission_interval)
    
    async def _execute_winning_bids(self):
        """Execute transfers for winning bids"""
        self.logger.info("Starting execution monitoring...")
        
        while self.running:
            try:
                if not self.daemon_config.auto_execution_enabled:
                    await asyncio.sleep(self.daemon_config.execution_check_interval)
                    continue
                
                # Check for winning bids that need execution
                winning_bids = await self._get_winning_bids()
                
                for bid_data in winning_bids:
                    try:
                        await self._execute_winning_bid(bid_data)
                    except Exception as e:
                        self.logger.error(f"Error executing winning bid: {e}")
                
                await asyncio.sleep(self.daemon_config.execution_check_interval)
                
            except Exception as e:
                self.logger.error(f"Error in execution monitoring: {e}")
                await asyncio.sleep(self.daemon_config.execution_check_interval)
    
    async def _maintain_resolver_reputation(self):
        """Maintain resolver reputation and network participation"""
        self.logger.info("Starting reputation maintenance...")
        
        while self.running:
            try:
                # Update resolver stats
                await self._update_resolver_stats()
                
                # Participate in network governance (if applicable)
                await self._participate_in_governance()
                
                # Update stake if needed
                await self._manage_resolver_stake()
                
                await asyncio.sleep(self.daemon_config.reputation_update_interval)
                
            except Exception as e:
                self.logger.error(f"Error in reputation maintenance: {e}")
                await asyncio.sleep(self.daemon_config.reputation_update_interval)
    
    async def _cleanup_expired_operations(self):
        """Clean up expired operations and tasks"""
        self.logger.info("Starting cleanup monitoring...")
        
        while self.running:
            try:
                current_time = time.time()
                
                # Clean up expired active operations
                expired_operations = []
                for transfer_id, task in self.active_operations.items():
                    if task.done() or current_time - self.resolver_stats['last_activity'] > 3600:
                        expired_operations.append(transfer_id)
                
                for transfer_id in expired_operations:
                    if transfer_id in self.active_operations:
                        self.active_operations[transfer_id].cancel()
                        del self.active_operations[transfer_id]
                    
                    if transfer_id in self.monitored_orders:
                        del self.monitored_orders[transfer_id]
                
                # Clean up old resolver stats
                if current_time - self.resolver_stats['last_activity'] > 86400:  # 24 hours
                    self.resolver_stats['last_activity'] = current_time
                
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in cleanup: {e}")
                await asyncio.sleep(300)
    
    async def _monitor_single_order(self, transfer_id: str):
        """Monitor a single bridge order for changes"""
        try:
            order = self.monitored_orders.get(transfer_id)
            if not order:
                return
            
            while self.running and transfer_id in self.monitored_orders:
                # Check order status
                status = await self._get_order_status(transfer_id)
                
                if status != order.status:
                    order.status = status
                    self.logger.info(f"Order {transfer_id} status changed to: {status}")
                    
                    # Handle status changes
                    if status == 'completed':
                        await self._handle_order_completion(transfer_id)
                        break
                    elif status == 'expired':
                        await self._handle_order_expiration(transfer_id)
                        break
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
        except asyncio.CancelledError:
            self.logger.info(f"Monitoring task for {transfer_id} cancelled")
        except Exception as e:
            self.logger.error(f"Error monitoring order {transfer_id}: {e}")
    
    async def _should_bid_on_order(self, order: BridgeOrder) -> bool:
        """Determine if we should bid on a specific order"""
        try:
            # Check if we already have a pending bid
            existing_bids = await self._get_existing_bids(order.transfer_id)
            for bid in existing_bids:
                if bid['resolver_address'].lower() == self.daemon_config.resolver_address.lower():
                    return False
            
            # Check order profitability
            profitability = await self._calculate_order_profitability(order)
            if profitability < 0.01:  # Minimum 1% profit
                return False
            
            # Check if we have sufficient stake
            if self.daemon_config.stake_amount < 1000:
                return False
            
            # Check reputation threshold
            if self.resolver_stats['reputation_score'] < 0.7:
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error evaluating order {order.transfer_id}: {e}")
            return False
    
    async def _submit_competitive_bid(self, order: BridgeOrder):
        """Submit a competitive bid for an order"""
        try:
            # Calculate optimal bid parameters
            bid_price = await self._calculate_optimal_bid_price(order)
            gas_estimate = await self._estimate_gas_for_order(order)
            
            # Submit bid
            success = await self.resolver_service.submit_bid(
                order.transfer_id,
                self.daemon_config.resolver_address,
                bid_price,
                gas_estimate
            )
            
            if success:
                self.resolver_stats['total_bids'] += 1
                self.resolver_stats['last_activity'] = time.time()
                self.logger.info(f"Submitted bid for {order.transfer_id}: {bid_price}")
            else:
                self.logger.warning(f"Failed to submit bid for {order.transfer_id}")
                
        except Exception as e:
            self.logger.error(f"Error submitting bid for {order.transfer_id}: {e}")
    
    async def _execute_winning_bid(self, bid_data: Dict[str, Any]):
        """Execute a winning bid"""
        try:
            transfer_id = bid_data['transfer_id']
            secret = bid_data['secret']
            
            # Execute bridge transfer
            success, result = await self.resolver_service.execute_bridge(
                transfer_id,
                self.daemon_config.resolver_address,
                secret
            )
            
            if success:
                self.resolver_stats['successful_executions'] += 1
                self.logger.info(f"Successfully executed {transfer_id}")
            else:
                self.resolver_stats['failed_executions'] += 1
                self.logger.error(f"Failed to execute {transfer_id}: {result.get('error')}")
            
            self.resolver_stats['last_activity'] = time.time()
            
        except Exception as e:
            self.logger.error(f"Error executing winning bid: {e}")
    
    async def _initialize_resolver(self):
        """Initialize resolver in the network"""
        try:
            # Register resolver with the network
            resolver_data = {
                'address': self.daemon_config.resolver_address,
                'stake_amount': self.daemon_config.stake_amount,
                'reputation_score': self.resolver_stats['reputation_score'],
                'active': True,
                'registered_at': time.time()
            }
            
            await self.zerog_client.store_resolver_network(resolver_data)
            self.logger.info(f"Initialized resolver: {self.daemon_config.resolver_address}")
            
        except Exception as e:
            self.logger.error(f"Error initializing resolver: {e}")
    
    async def _update_resolver_stats(self):
        """Update resolver statistics and reputation"""
        try:
            # Calculate success rate
            total_operations = (self.resolver_stats['successful_executions'] + 
                              self.resolver_stats['failed_executions'])
            
            if total_operations > 0:
                success_rate = self.resolver_stats['successful_executions'] / total_operations
                
                # Update reputation based on success rate
                if success_rate > 0.9:
                    self.resolver_stats['reputation_score'] = min(
                        self.resolver_stats['reputation_score'] + 0.01, 1.0
                    )
                elif success_rate < 0.7:
                    self.resolver_stats['reputation_score'] = max(
                        self.resolver_stats['reputation_score'] - 0.02, 0.0
                    )
            
            # Update stats in ZeroG
            await self.zerog_client.store_resolver_network({
                'address': self.daemon_config.resolver_address,
                'stats': self.resolver_stats,
                'updated_at': time.time()
            })
            
        except Exception as e:
            self.logger.error(f"Error updating resolver stats: {e}")
    
    async def _calculate_order_profitability(self, order: BridgeOrder) -> float:
        """Calculate profitability of executing an order"""
        try:
            # Estimate gas costs for both chains
            source_gas_cost = await self._estimate_chain_gas_cost(order.source_chain)
            dest_gas_cost = await self._estimate_chain_gas_cost(order.dest_chain)
            total_gas_cost = source_gas_cost + dest_gas_cost
            
            # Estimate potential fee (e.g., 0.1% of amount)
            potential_fee = float(order.amount) * 0.001
            
            # Calculate profitability
            profitability = (potential_fee - total_gas_cost) / float(order.amount)
            return profitability
            
        except Exception as e:
            self.logger.error(f"Error calculating profitability: {e}")
            return 0.0
    
    async def _calculate_optimal_bid_price(self, order: BridgeOrder) -> int:
        """Calculate optimal bid price for competitive bidding"""
        try:
            # Get current bids for this order
            existing_bids = await self._get_existing_bids(order.transfer_id)
            
            if not existing_bids:
                # No existing bids, start with low price
                return int(float(order.amount) * 0.0005)  # 0.05%
            
            # Calculate competitive price based on existing bids
            min_bid = min(bid['bid_price'] for bid in existing_bids)
            optimal_price = int(min_bid * 0.95)  # 5% below minimum
            
            # Ensure minimum viable price
            min_viable = int(float(order.amount) * 0.0001)  # 0.01%
            return max(optimal_price, min_viable)
            
        except Exception as e:
            self.logger.error(f"Error calculating optimal bid price: {e}")
            return int(float(order.amount) * 0.001)  # Default 0.1%
    
    async def _estimate_gas_for_order(self, order: BridgeOrder) -> int:
        """Estimate gas required for order execution"""
        # Standard bridge execution gas estimate
        return 150000
    
    async def _estimate_chain_gas_cost(self, chain_id: str) -> float:
        """Estimate gas cost for a specific chain"""
        # Mock gas prices - in real implementation would query chain
        gas_prices = {
            'sepolia': 0.00002,  # ETH
            'celo_alfajores': 0.000001,  # CELO
            'monad': 0.00001,
            'etherlink': 0.000015,
            'polkadot_westend': 0.000001
        }
        return gas_prices.get(chain_id, 0.00002) * 150000
    
    async def _get_order_status(self, transfer_id: str) -> str:
        """Get current status of an order"""
        try:
            bridge_state = await self.bridge_coordinator.get_bridge_status(transfer_id)
            return bridge_state.get('status', 'unknown')
        except Exception as e:
            self.logger.error(f"Error getting order status: {e}")
            return 'unknown'
    
    async def _get_existing_bids(self, transfer_id: str) -> List[Dict[str, Any]]:
        """Get existing bids for an order"""
        # This would query bids from ZeroG
        return []
    
    async def _get_winning_bids(self) -> List[Dict[str, Any]]:
        """Get bids that this resolver has won"""
        # This would query winning bids from ZeroG
        return []
    
    async def _handle_order_completion(self, transfer_id: str):
        """Handle order completion"""
        self.logger.info(f"Order {transfer_id} completed")
        # Clean up monitoring for this order
        if transfer_id in self.active_operations:
            self.active_operations[transfer_id].cancel()
            del self.active_operations[transfer_id]
        if transfer_id in self.monitored_orders:
            del self.monitored_orders[transfer_id]
    
    async def _handle_order_expiration(self, transfer_id: str):
        """Handle order expiration"""
        self.logger.info(f"Order {transfer_id} expired")
        # Clean up monitoring for this order
        if transfer_id in self.active_operations:
            self.active_operations[transfer_id].cancel()
            del self.active_operations[transfer_id]
        if transfer_id in self.monitored_orders:
            del self.monitored_orders[transfer_id]
    
    async def _participate_in_governance(self):
        """Participate in network governance"""
        # This would implement governance participation logic
        pass
    
    async def _manage_resolver_stake(self):
        """Manage resolver stake"""
        # This would implement stake management logic
        pass
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
    
    async def _shutdown(self):
        """Gracefully shutdown the daemon"""
        self.logger.info("Shutting down resolver daemon...")
        
        # Cancel all active operations
        for task in self.active_operations.values():
            task.cancel()
        
        # Wait for tasks to complete
        if self.active_operations:
            await asyncio.gather(*self.active_operations.values(), return_exceptions=True)
        
        self.logger.info("Resolver daemon shutdown complete")


async def main():
    """Main entry point for resolver daemon"""
    # Load configuration
    config = Config()
    daemon_config = DaemonConfig(
        resolver_address=config.get('RESOLVER_ADDRESS', ''),
        private_key=config.get('RESOLVER_PRIVATE_KEY', ''),
        stake_amount=config.get('RESOLVER_STAKE_AMOUNT', 1000),
        auto_bid_enabled=config.get('AUTO_BID_ENABLED', True),
        auto_execution_enabled=config.get('AUTO_EXECUTION_ENABLED', True)
    )
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and start daemon
    daemon = ResolverDaemon(config, daemon_config)
    await daemon.start()


if __name__ == "__main__":
    asyncio.run(main())

