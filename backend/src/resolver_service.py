"""
Competitive Resolver Service for RWA Bridge Operations
Implements the unitedefi pattern with Dutch auction mechanism for HTLC atomic transfers
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from decimal import Decimal
import hashlib
import secrets
import json

from .oneinch_client import OneInchClient
from .zerog_client import ZeroGClient
from .config import Config


@dataclass
class BridgeOrder:
    """Represents a bridge transfer order"""
    transfer_id: str
    source_chain: str
    dest_chain: str
    token_address: str
    amount: int
    recipient: str
    escrow_address: str
    dest_escrow_address: str
    secret_hash: str
    timeout: int
    created_at: float
    status: str = "pending"


@dataclass
class ResolverBid:
    """Represents a resolver bid for bridge execution"""
    transfer_id: str
    resolver_address: str
    bid_price: int
    execution_time: int
    gas_estimate: int
    reputation_score: float
    stake_amount: int
    submitted_at: float


class ResolverService:
    """
    Competitive resolver service that discovers bridge orders, validates them,
    and executes atomic swaps using HTLC contracts
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize clients
        self.oneinch_client = OneInchClient(config)
        self.zerog_client = ZeroGClient(config)
        
        # Resolver state
        self.active_orders: Dict[str, BridgeOrder] = {}
        self.pending_bids: Dict[str, List[ResolverBid]] = {}
        self.resolver_reputation: Dict[str, float] = {}
        self.resolver_stakes: Dict[str, int] = {}
        
        # Dutch auction parameters
        self.dutch_auction_duration = config.get('DUTCH_AUCTION_DURATION', 300)  # 5 minutes
        self.min_resolver_stake = config.get('MIN_RESOLVER_STAKE', 1000)
        self.resolver_reputation_threshold = config.get('RESOLVER_REPUTATION_THRESHOLD', 0.7)
        
    async def discover_bridge_orders(self) -> List[BridgeOrder]:
        """
        Monitor bridge events across all configured chains to discover new orders
        """
        try:
            # Get bridge coordination data from ZeroG
            coordination_data = await self.zerog_client.get_bridge_coordination()
            
            discovered_orders = []
            for order_data in coordination_data.get('orders', []):
                if order_data['transfer_id'] not in self.active_orders:
                    order = BridgeOrder(
                        transfer_id=order_data['transfer_id'],
                        source_chain=order_data['source_chain'],
                        dest_chain=order_data['dest_chain'],
                        token_address=order_data['token_address'],
                        amount=order_data['amount'],
                        recipient=order_data['recipient'],
                        escrow_address=order_data['escrow_address'],
                        dest_escrow_address=order_data['dest_escrow_address'],
                        secret_hash=order_data['secret_hash'],
                        timeout=order_data['timeout'],
                        created_at=order_data['created_at']
                    )
                    
                    if await self.validate_order(order):
                        self.active_orders[order.transfer_id] = order
                        discovered_orders.append(order)
                        self.logger.info(f"Discovered new bridge order: {order.transfer_id}")
            
            return discovered_orders
            
        except Exception as e:
            self.logger.error(f"Error discovering bridge orders: {e}")
            return []
    
    async def validate_order(self, order: BridgeOrder) -> bool:
        """
        Validate bridge order for correctness and feasibility
        """
        try:
            # Check if order is still within timeout
            if time.time() > order.created_at + order.timeout:
                self.logger.warning(f"Order {order.transfer_id} has expired")
                return False
            
            # Validate token address format
            if not order.token_address or len(order.token_address) != 42:
                self.logger.warning(f"Invalid token address for order {order.transfer_id}")
                return False
            
            # Validate amount
            if order.amount <= 0:
                self.logger.warning(f"Invalid amount for order {order.transfer_id}")
                return False
            
            # Check if escrow contracts exist
            # This would integrate with BridgeManager to verify contract addresses
            
            # Validate secret hash format
            if not order.secret_hash or len(order.secret_hash) != 64:
                self.logger.warning(f"Invalid secret hash for order {order.transfer_id}")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating order {order.transfer_id}: {e}")
            return False
    
    async def submit_bid(self, transfer_id: str, resolver_address: str, 
                        bid_price: int, gas_estimate: int) -> bool:
        """
        Submit competitive bid for bridge order execution
        """
        try:
            if transfer_id not in self.active_orders:
                self.logger.error(f"Order {transfer_id} not found")
                return False
            
            # Check resolver reputation
            reputation = self.resolver_reputation.get(resolver_address, 0.0)
            if reputation < self.resolver_reputation_threshold:
                self.logger.warning(f"Resolver {resolver_address} reputation too low: {reputation}")
                return False
            
            # Check resolver stake
            stake = self.resolver_stakes.get(resolver_address, 0)
            if stake < self.min_resolver_stake:
                self.logger.warning(f"Resolver {resolver_address} stake too low: {stake}")
                return False
            
            # Create bid
            bid = ResolverBid(
                transfer_id=transfer_id,
                resolver_address=resolver_address,
                bid_price=bid_price,
                execution_time=60,  # 1 minute execution time
                gas_estimate=gas_estimate,
                reputation_score=reputation,
                stake_amount=stake,
                submitted_at=time.time()
            )
            
            # Store bid
            if transfer_id not in self.pending_bids:
                self.pending_bids[transfer_id] = []
            self.pending_bids[transfer_id].append(bid)
            
            # Store bid in ZeroG for cross-chain coordination
            await self.zerog_client.store_resolver_bid({
                'transfer_id': transfer_id,
                'resolver_address': resolver_address,
                'bid_price': bid_price,
                'execution_time': bid.execution_time,
                'gas_estimate': gas_estimate,
                'reputation_score': reputation,
                'stake_amount': stake,
                'submitted_at': bid.submitted_at
            })
            
            self.logger.info(f"Resolver {resolver_address} submitted bid for {transfer_id}: {bid_price}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error submitting bid for {transfer_id}: {e}")
            return False
    
    async def select_winning_resolver(self, transfer_id: str) -> Optional[ResolverBid]:
        """
        Select winning resolver using Dutch auction mechanism
        """
        try:
            if transfer_id not in self.pending_bids or not self.pending_bids[transfer_id]:
                return None
            
            bids = self.pending_bids[transfer_id]
            order = self.active_orders[transfer_id]
            
            # Calculate time elapsed since order creation
            time_elapsed = time.time() - order.created_at
            auction_progress = min(time_elapsed / self.dutch_auction_duration, 1.0)
            
            # Dutch auction: price decreases over time, select best combination of price and reputation
            best_bid = None
            best_score = 0
            
            for bid in bids:
                # Calculate score based on price, reputation, and execution time
                price_score = 1.0 - (bid.bid_price / (order.amount * 0.01))  # Max 1% fee
                reputation_score = bid.reputation_score
                execution_score = 1.0 - (bid.execution_time / 300)  # Max 5 minutes
                
                # Weighted combination
                total_score = (price_score * 0.4 + reputation_score * 0.4 + execution_score * 0.2)
                
                if total_score > best_score:
                    best_score = total_score
                    best_bid = bid
            
            if best_bid:
                self.logger.info(f"Selected winning resolver for {transfer_id}: {best_bid.resolver_address}")
                # Store winning resolver in ZeroG
                await self.zerog_client.store_bridge_state({
                    'transfer_id': transfer_id,
                    'winning_resolver': best_bid.resolver_address,
                    'selected_at': time.time(),
                    'execution_deadline': time.time() + best_bid.execution_time
                })
            
            return best_bid
            
        except Exception as e:
            self.logger.error(f"Error selecting winning resolver for {transfer_id}: {e}")
            return None
    
    async def execute_bridge(self, transfer_id: str, resolver_address: str, 
                           secret: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Execute atomic bridge transfer using HTLC contracts
        """
        try:
            if transfer_id not in self.active_orders:
                self.logger.error(f"Order {transfer_id} not found")
                return False, {"error": "Order not found"}
            
            order = self.active_orders[transfer_id]
            
            # Verify secret matches hash
            secret_hash = hashlib.sha256(secret.encode()).hexdigest()
            if secret_hash != order.secret_hash:
                self.logger.error(f"Invalid secret for order {transfer_id}")
                return False, {"error": "Invalid secret"}
            
            # Verify resolver authorization
            winning_bid = await self.select_winning_resolver(transfer_id)
            if not winning_bid or winning_bid.resolver_address != resolver_address:
                self.logger.error(f"Resolver {resolver_address} not authorized for {transfer_id}")
                return False, {"error": "Resolver not authorized"}
            
            execution_results = {
                'transfer_id': transfer_id,
                'source_tx': None,
                'dest_tx': None,
                'executed_at': time.time(),
                'success': False
            }
            
            # Execute on destination chain first (claim with secret)
            try:
                dest_tx_hash = await self._execute_dest_claim(order, secret)
                execution_results['dest_tx'] = dest_tx_hash
                self.logger.info(f"Destination claim executed: {dest_tx_hash}")
            except Exception as e:
                self.logger.error(f"Destination claim failed: {e}")
                return False, {"error": f"Destination claim failed: {e}"}
            
            # Execute on source chain (claim with same secret)
            try:
                source_tx_hash = await self._execute_source_claim(order, secret)
                execution_results['source_tx'] = source_tx_hash
                self.logger.info(f"Source claim executed: {source_tx_hash}")
            except Exception as e:
                self.logger.error(f"Source claim failed: {e}")
                return False, {"error": f"Source claim failed: {e}"}
            
            # Update order status
            order.status = "completed"
            execution_results['success'] = True
            
            # Update bridge state in ZeroG
            await self.zerog_client.store_bridge_state({
                'transfer_id': transfer_id,
                'status': 'completed',
                'source_tx': source_tx_hash,
                'dest_tx': dest_tx_hash,
                'completed_at': time.time()
            })
            
            # Update resolver reputation
            await self._update_resolver_reputation(resolver_address, True)
            
            self.logger.info(f"Bridge transfer {transfer_id} completed successfully")
            return True, execution_results
            
        except Exception as e:
            self.logger.error(f"Error executing bridge {transfer_id}: {e}")
            await self._update_resolver_reputation(resolver_address, False)
            return False, {"error": str(e)}
    
    async def _execute_dest_claim(self, order: BridgeOrder, secret: str) -> str:
        """Execute claim on destination chain"""
        # This would integrate with BridgeManager to call claim function
        # For now, return a mock transaction hash
        return f"0x{secrets.token_hex(32)}"
    
    async def _execute_source_claim(self, order: BridgeOrder, secret: str) -> str:
        """Execute claim on source chain"""
        # This would integrate with BridgeManager to call claim function
        # For now, return a mock transaction hash
        return f"0x{secrets.token_hex(32)}"
    
    async def _update_resolver_reputation(self, resolver_address: str, success: bool):
        """Update resolver reputation based on execution success"""
        current_reputation = self.resolver_reputation.get(resolver_address, 0.5)
        
        if success:
            # Increase reputation slightly
            new_reputation = min(current_reputation + 0.01, 1.0)
        else:
            # Decrease reputation more significantly
            new_reputation = max(current_reputation - 0.05, 0.0)
        
        self.resolver_reputation[resolver_address] = new_reputation
        self.logger.info(f"Updated resolver {resolver_address} reputation: {current_reputation} -> {new_reputation}")
    
    async def monitor_order_timeouts(self):
        """Monitor and handle order timeouts"""
        current_time = time.time()
        expired_orders = []
        
        for transfer_id, order in self.active_orders.items():
            if current_time > order.created_at + order.timeout:
                expired_orders.append(transfer_id)
                order.status = "expired"
                self.logger.warning(f"Order {transfer_id} has expired")
        
        # Clean up expired orders
        for transfer_id in expired_orders:
            del self.active_orders[transfer_id]
            if transfer_id in self.pending_bids:
                del self.pending_bids[transfer_id]
        
        return expired_orders
    
    async def get_resolver_stats(self, resolver_address: str) -> Dict[str, Any]:
        """Get resolver statistics and reputation"""
        return {
            'address': resolver_address,
            'reputation': self.resolver_reputation.get(resolver_address, 0.0),
            'stake': self.resolver_stakes.get(resolver_address, 0),
            'active_bids': len([bid for bids in self.pending_bids.values() 
                              for bid in bids if bid.resolver_address == resolver_address]),
            'total_orders': len(self.active_orders)
        }
