"""
1inch Fusion Integration for Bridge Operations
Extends OneInchClient with bridge-specific functionality for competitive execution
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import json

from .oneinch_client import OneInchClient
from .config import Config


@dataclass
class FusionOrder:
    """Represents a 1inch Fusion order for bridge operations"""
    order_id: str
    source_chain: str
    dest_chain: str
    token_in: str
    token_out: str
    amount_in: int
    amount_out: int
    recipient: str
    deadline: int
    resolver_address: str
    auction_start: float
    auction_end: float
    status: str = "pending"


@dataclass
class ResolverQuote:
    """Represents a resolver quote for bridge execution"""
    resolver_address: str
    price: int
    execution_time: int
    gas_estimate: int
    reputation_score: float
    mev_protection: bool
    quote_expiry: float


class FusionBridgeClient:
    """
    1inch Fusion integration for bridge operations with competitive resolver selection
    and MEV protection for atomic cross-chain transfers
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize base OneInch client
        self.oneinch_client = OneInchClient(config)
        
        # Fusion-specific configuration
        self.fusion_enabled = config.get('FUSION_INTEGRATION_ENABLED', True)
        self.fusion_api_url = config.get('FUSION_API_URL', 'https://api.1inch.dev/fusion')
        self.auction_duration = config.get('FUSION_AUCTION_DURATION', 300)  # 5 minutes
        self.min_resolver_stake = config.get('MIN_RESOLVER_STAKE', 1000)
        
        # Bridge-specific settings
        self.bridge_gas_buffer = config.get('BRIDGE_GAS_BUFFER', 1.2)
        self.mev_protection_enabled = config.get('MEV_PROTECTION_ENABLED', True)
        self.execution_timeout = config.get('FUSION_EXECUTION_TIMEOUT', 600)  # 10 minutes
        
        # Active orders tracking
        self.active_orders: Dict[str, FusionOrder] = {}
        self.resolver_quotes: Dict[str, List[ResolverQuote]] = {}
    
    async def create_fusion_order(self, source_chain: str, dest_chain: str, 
                                token_in: str, amount_in: int, recipient: str) -> Optional[FusionOrder]:
        """
        Create a 1inch Fusion order for bridge operations
        """
        try:
            if not self.fusion_enabled:
                self.logger.warning("Fusion integration is disabled")
                return None
            
            # Generate unique order ID
            order_id = f"bridge_{int(time.time())}_{source_chain}_{dest_chain}"
            
            # Calculate auction timing
            current_time = time.time()
            auction_start = current_time
            auction_end = current_time + self.auction_duration
            
            # Create Fusion order
            fusion_order = FusionOrder(
                order_id=order_id,
                source_chain=source_chain,
                dest_chain=dest_chain,
                token_in=token_in,
                token_out=token_in,  # Same token for bridge
                amount_in=amount_in,
                amount_out=amount_in,  # Same amount for bridge
                recipient=recipient,
                deadline=int(auction_end + self.execution_timeout),
                resolver_address="",  # Will be filled by winning resolver
                auction_start=auction_start,
                auction_end=auction_end
            )
            
            # Submit order to 1inch Fusion
            submission_result = await self._submit_fusion_order(fusion_order)
            
            if submission_result.get('success', False):
                self.active_orders[order_id] = fusion_order
                self.logger.info(f"Created Fusion order {order_id}")
                return fusion_order
            else:
                self.logger.error(f"Failed to submit Fusion order: {submission_result.get('error')}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error creating Fusion order: {e}")
            return None
    
    async def get_resolver_quotes(self, order_id: str) -> List[ResolverQuote]:
        """
        Get competitive quotes from resolvers for bridge execution
        """
        try:
            if order_id not in self.active_orders:
                self.logger.error(f"Order {order_id} not found")
                return []
            
            order = self.active_orders[order_id]
            
            # Check if auction is still active
            if time.time() > order.auction_end:
                self.logger.warning(f"Auction ended for order {order_id}")
                return self.resolver_quotes.get(order_id, [])
            
            # Request quotes from 1inch Fusion API
            quotes_data = await self._request_resolver_quotes(order)
            
            quotes = []
            for quote_data in quotes_data.get('quotes', []):
                quote = ResolverQuote(
                    resolver_address=quote_data['resolver_address'],
                    price=quote_data['price'],
                    execution_time=quote_data['execution_time'],
                    gas_estimate=quote_data['gas_estimate'],
                    reputation_score=quote_data.get('reputation_score', 0.8),
                    mev_protection=quote_data.get('mev_protection', True),
                    quote_expiry=time.time() + quote_data.get('quote_ttl', 60)
                )
                quotes.append(quote)
            
            # Store quotes
            self.resolver_quotes[order_id] = quotes
            
            self.logger.info(f"Retrieved {len(quotes)} resolver quotes for order {order_id}")
            return quotes
            
        except Exception as e:
            self.logger.error(f"Error getting resolver quotes for {order_id}: {e}")
            return []
    
    async def execute_fusion_bridge(self, order_id: str, secret: str, 
                                  resolver_address: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Execute bridge transfer using 1inch Fusion with MEV protection
        """
        try:
            if order_id not in self.active_orders:
                self.logger.error(f"Order {order_id} not found")
                return False, {"error": "Order not found"}
            
            order = self.active_orders[order_id]
            
            # Verify resolver authorization
            quotes = self.resolver_quotes.get(order_id, [])
            authorized_resolver = None
            for quote in quotes:
                if quote.resolver_address.lower() == resolver_address.lower():
                    authorized_resolver = quote
                    break
            
            if not authorized_resolver:
                self.logger.error(f"Resolver {resolver_address} not authorized for order {order_id}")
                return False, {"error": "Resolver not authorized"}
            
            # Check quote expiry
            if time.time() > authorized_resolver.quote_expiry:
                self.logger.error(f"Quote expired for resolver {resolver_address}")
                return False, {"error": "Quote expired"}
            
            # Prepare execution data
            execution_data = {
                'order_id': order_id,
                'secret': secret,
                'resolver_address': resolver_address,
                'source_chain': order.source_chain,
                'dest_chain': order.dest_chain,
                'token_address': order.token_in,
                'amount': order.amount_in,
                'recipient': order.recipient,
                'gas_estimate': authorized_resolver.gas_estimate,
                'mev_protection': authorized_resolver.mev_protection
            }
            
            # Execute via 1inch Fusion
            execution_result = await self._execute_fusion_order(execution_data)
            
            if execution_result.get('success', False):
                # Update order status
                order.status = "executed"
                order.resolver_address = resolver_address
                
                self.logger.info(f"Successfully executed Fusion bridge {order_id}")
                return True, {
                    'order_id': order_id,
                    'execution_hash': execution_result.get('transaction_hash'),
                    'resolver_address': resolver_address,
                    'executed_at': time.time(),
                    'gas_used': execution_result.get('gas_used'),
                    'bridge_fee': execution_result.get('bridge_fee')
                }
            else:
                self.logger.error(f"Fusion execution failed: {execution_result.get('error')}")
                return False, {"error": execution_result.get('error')}
                
        except Exception as e:
            self.logger.error(f"Error executing Fusion bridge {order_id}: {e}")
            return False, {"error": str(e)}
    
    async def monitor_fusion_status(self, order_id: str) -> Dict[str, Any]:
        """
        Monitor Fusion order status and execution progress
        """
        try:
            if order_id not in self.active_orders:
                return {"error": "Order not found"}
            
            order = self.active_orders[order_id]
            current_time = time.time()
            
            # Get order status from 1inch Fusion API
            status_data = await self._get_fusion_order_status(order_id)
            
            # Calculate auction progress
            auction_progress = 0
            if current_time < order.auction_start:
                auction_progress = 0
            elif current_time > order.auction_end:
                auction_progress = 1.0
            else:
                auction_progress = (current_time - order.auction_start) / (order.auction_end - order.auction_start)
            
            return {
                'order_id': order_id,
                'status': order.status,
                'auction_progress': auction_progress,
                'time_remaining': max(0, order.auction_end - current_time),
                'resolver_count': len(self.resolver_quotes.get(order_id, [])),
                'winning_resolver': order.resolver_address if order.resolver_address else None,
                'execution_deadline': order.deadline,
                'fusion_status': status_data.get('status', 'unknown'),
                'transaction_hash': status_data.get('transaction_hash'),
                'executed_at': status_data.get('executed_at'),
                'gas_used': status_data.get('gas_used')
            }
            
        except Exception as e:
            self.logger.error(f"Error monitoring Fusion status for {order_id}: {e}")
            return {"error": str(e)}
    
    async def _submit_fusion_order(self, order: FusionOrder) -> Dict[str, Any]:
        """Submit order to 1inch Fusion API"""
        try:
            # Prepare order data for 1inch Fusion
            order_data = {
                'orderId': order.order_id,
                'sourceChainId': self._get_chain_id(order.source_chain),
                'destChainId': self._get_chain_id(order.dest_chain),
                'tokenIn': order.token_in,
                'tokenOut': order.token_out,
                'amountIn': order.amount_in,
                'amountOut': order.amount_out,
                'recipient': order.recipient,
                'deadline': order.deadline,
                'auctionStart': int(order.auction_start),
                'auctionEnd': int(order.auction_end),
                'orderType': 'bridge_transfer'
            }
            
            # Submit to 1inch Fusion API
            response = await self.oneinch_client._make_request(
                'POST',
                f"{self.fusion_api_url}/orders",
                data=order_data
            )
            
            return {
                'success': True,
                'order_id': response.get('orderId'),
                'submission_hash': response.get('submissionHash')
            }
            
        except Exception as e:
            self.logger.error(f"Error submitting Fusion order: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _request_resolver_quotes(self, order: FusionOrder) -> Dict[str, Any]:
        """Request quotes from resolvers via 1inch Fusion"""
        try:
            quote_params = {
                'orderId': order.order_id,
                'sourceChainId': self._get_chain_id(order.source_chain),
                'destChainId': self._get_chain_id(order.dest_chain),
                'tokenIn': order.token_in,
                'amountIn': order.amount_in,
                'includeMEVProtection': self.mev_protection_enabled
            }
            
            response = await self.oneinch_client._make_request(
                'GET',
                f"{self.fusion_api_url}/quotes",
                params=quote_params
            )
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error requesting resolver quotes: {e}")
            return {'quotes': []}
    
    async def _execute_fusion_order(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute order via 1inch Fusion"""
        try:
            execution_payload = {
                'orderId': execution_data['order_id'],
                'secret': execution_data['secret'],
                'resolverAddress': execution_data['resolver_address'],
                'gasEstimate': execution_data['gas_estimate'],
                'mevProtection': execution_data['mev_protection']
            }
            
            response = await self.oneinch_client._make_request(
                'POST',
                f"{self.fusion_api_url}/execute",
                data=execution_payload
            )
            
            return {
                'success': True,
                'transaction_hash': response.get('transactionHash'),
                'gas_used': response.get('gasUsed'),
                'bridge_fee': response.get('bridgeFee'),
                'executed_at': response.get('executedAt')
            }
            
        except Exception as e:
            self.logger.error(f"Error executing Fusion order: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _get_fusion_order_status(self, order_id: str) -> Dict[str, Any]:
        """Get order status from 1inch Fusion API"""
        try:
            response = await self.oneinch_client._make_request(
                'GET',
                f"{self.fusion_api_url}/orders/{order_id}/status"
            )
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error getting Fusion order status: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def _get_chain_id(self, chain_name: str) -> int:
        """Convert chain name to chain ID"""
        chain_mapping = {
            'sepolia': 11155111,
            'celo_alfajores': 44787,
            'monad': 1001,
            'etherlink': 42793,
            'polkadot_westend': 999
        }
        return chain_mapping.get(chain_name.lower(), 1)
    
    async def optimize_gas_for_bridge(self, source_chain: str, dest_chain: str, 
                                    token_address: str, amount: int) -> Dict[str, Any]:
        """
        Optimize gas parameters for bridge operations
        """
        try:
            # Get current gas prices for both chains
            source_gas = await self._get_chain_gas_price(source_chain)
            dest_gas = await self._get_chain_gas_price(dest_chain)
            
            # Calculate optimal gas limits with buffer
            gas_estimate = {
                'source_chain': {
                    'gas_price': source_gas,
                    'gas_limit': int(150000 * self.bridge_gas_buffer),  # Standard bridge gas
                    'priority_fee': int(source_gas * 0.1)  # 10% priority fee
                },
                'dest_chain': {
                    'gas_price': dest_gas,
                    'gas_limit': int(150000 * self.bridge_gas_buffer),
                    'priority_fee': int(dest_gas * 0.1)
                }
            }
            
            return {
                'success': True,
                'gas_estimate': gas_estimate,
                'total_gas_cost': (gas_estimate['source_chain']['gas_limit'] * source_gas + 
                                 gas_estimate['dest_chain']['gas_limit'] * dest_gas),
                'optimization_timestamp': time.time()
            }
            
        except Exception as e:
            self.logger.error(f"Error optimizing gas for bridge: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _get_chain_gas_price(self, chain_name: str) -> int:
        """Get current gas price for chain"""
        try:
            # This would integrate with chain-specific gas price APIs
            # For now, return mock values
            gas_prices = {
                'sepolia': 20000000000,  # 20 gwei
                'celo_alfajores': 5000000000,  # 5 gwei
                'monad': 10000000000,  # 10 gwei
                'etherlink': 15000000000,  # 15 gwei
                'polkadot_westend': 1000000000  # 1 gwei
            }
            return gas_prices.get(chain_name.lower(), 20000000000)
            
        except Exception as e:
            self.logger.error(f"Error getting gas price for {chain_name}: {e}")
            return 20000000000  # Default 20 gwei
