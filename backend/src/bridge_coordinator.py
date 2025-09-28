"""
Cross-chain Bridge Coordinator Service
Manages bridge state synchronization, resolver coordination, and HTLC event monitoring
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import json

from .zerog_client import ZeroGClient
from .config import Config
from .resolver_service import ResolverService, BridgeOrder


@dataclass
class EscrowEvent:
    """Represents an escrow contract event"""
    event_type: str  # 'created', 'claimed', 'refunded', 'expired'
    transfer_id: str
    chain_id: str
    escrow_address: str
    block_number: int
    transaction_hash: str
    timestamp: float
    data: Dict[str, Any]


@dataclass
class BridgeState:
    """Represents synchronized bridge state across chains"""
    transfer_id: str
    source_chain: str
    dest_chain: str
    source_escrow_state: str  # 'pending', 'claimed', 'refunded'
    dest_escrow_state: str
    secret_revealed: bool
    secret_hash: str
    last_sync: float
    events: List[EscrowEvent]


class BridgeCoordinator:
    """
    Cross-chain bridge coordination service that synchronizes bridge states,
    manages resolver network, and handles HTLC event monitoring
    """
    
    def __init__(self, config: Config, resolver_service: ResolverService):
        self.config = config
        self.resolver_service = resolver_service
        self.logger = logging.getLogger(__name__)
        
        # Initialize ZeroG client for state synchronization
        self.zerog_client = ZeroGClient(config)
        
        # Bridge state tracking
        self.bridge_states: Dict[str, BridgeState] = {}
        self.escrow_events: Dict[str, List[EscrowEvent]] = {}
        self.resolver_network: Dict[str, Dict[str, Any]] = {}
        
        # Configuration
        self.sync_interval = config.get('BRIDGE_SYNC_INTERVAL', 30)  # 30 seconds
        self.event_monitor_interval = config.get('EVENT_MONITOR_INTERVAL', 10)  # 10 seconds
        self.commitment_window = config.get('COMMITMENT_WINDOW', 120)  # 2 minutes
        self.failover_timeout = config.get('FAILOVER_TIMEOUT', 600)  # 10 minutes
        
        # Multi-chain configuration
        self.chains = config.get('CHAINS', {})
        self.bridge_contracts = config.get('BRIDGE_CONTRACTS', {})
    
    async def sync_bridge_state(self, transfer_id: str) -> Optional[BridgeState]:
        """
        Synchronize bridge state across source and destination chains
        """
        try:
            # Get bridge state from ZeroG
            stored_state = await self.zerog_client.get_bridge_coordination(transfer_id)
            if not stored_state:
                self.logger.warning(f"No stored state found for transfer {transfer_id}")
                return None
            
            # Get escrow states from both chains
            source_state = await self._get_escrow_state(
                transfer_id, 
                stored_state['source_chain'], 
                stored_state['source_escrow_address']
            )
            
            dest_state = await self._get_escrow_state(
                transfer_id,
                stored_state['dest_chain'],
                stored_state['dest_escrow_address']
            )
            
            # Create synchronized bridge state
            bridge_state = BridgeState(
                transfer_id=transfer_id,
                source_chain=stored_state['source_chain'],
                dest_chain=stored_state['dest_chain'],
                source_escrow_state=source_state['status'],
                dest_escrow_state=dest_state['status'],
                secret_revealed=source_state.get('secret_revealed', False) or 
                              dest_state.get('secret_revealed', False),
                secret_hash=stored_state['secret_hash'],
                last_sync=time.time(),
                events=[]
            )
            
            # Store synchronized state
            self.bridge_states[transfer_id] = bridge_state
            
            # Update ZeroG with synchronized state
            await self.zerog_client.store_bridge_state({
                'transfer_id': transfer_id,
                'source_escrow_state': source_state['status'],
                'dest_escrow_state': dest_state['status'],
                'secret_revealed': bridge_state.secret_revealed,
                'last_sync': bridge_state.last_sync,
                'sync_timestamp': time.time()
            })
            
            self.logger.info(f"Synchronized bridge state for {transfer_id}")
            return bridge_state
            
        except Exception as e:
            self.logger.error(f"Error synchronizing bridge state for {transfer_id}: {e}")
            return None
    
    async def coordinate_resolvers(self, transfer_id: str) -> Dict[str, Any]:
        """
        Coordinate resolver network for bridge execution
        """
        try:
            bridge_state = self.bridge_states.get(transfer_id)
            if not bridge_state:
                await self.sync_bridge_state(transfer_id)
                bridge_state = self.bridge_states.get(transfer_id)
            
            if not bridge_state:
                return {"error": "Bridge state not found"}
            
            # Check if transfer is ready for resolver coordination
            if bridge_state.source_escrow_state != 'pending' or bridge_state.dest_escrow_state != 'pending':
                return {"error": "Escrow contracts not in pending state"}
            
            # Get available resolvers
            available_resolvers = await self._get_available_resolvers()
            
            # Coordinate resolver selection
            coordination_data = {
                'transfer_id': transfer_id,
                'available_resolvers': available_resolvers,
                'coordination_started': time.time(),
                'commitment_deadline': time.time() + self.commitment_window,
                'execution_deadline': time.time() + self.failover_timeout,
                'secret_hash': bridge_state.secret_hash
            }
            
            # Store coordination data in ZeroG
            await self.zerog_client.store_bridge_coordination(coordination_data)
            
            # Notify resolvers about new bridge order
            await self._notify_resolvers(transfer_id, coordination_data)
            
            self.logger.info(f"Started resolver coordination for {transfer_id}")
            return coordination_data
            
        except Exception as e:
            self.logger.error(f"Error coordinating resolvers for {transfer_id}: {e}")
            return {"error": str(e)}
    
    async def monitor_escrow_events(self) -> List[EscrowEvent]:
        """
        Monitor escrow contract events across all chains
        """
        try:
            new_events = []
            
            for chain_id, chain_config in self.chains.items():
                # Get recent events from escrow contracts
                events = await self._get_chain_events(chain_id)
                
                for event in events:
                    # Check if event is new
                    if self._is_new_event(event):
                        new_events.append(event)
                        
                        # Store event
                        if event.transfer_id not in self.escrow_events:
                            self.escrow_events[event.transfer_id] = []
                        self.escrow_events[event.transfer_id].append(event)
                        
                        # Update bridge state based on event
                        await self._handle_escrow_event(event)
            
            return new_events
            
        except Exception as e:
            self.logger.error(f"Error monitoring escrow events: {e}")
            return []
    
    async def handle_secret_reveal(self, transfer_id: str, secret: str) -> bool:
        """
        Handle secret reveal for completing atomic swap
        """
        try:
            bridge_state = self.bridge_states.get(transfer_id)
            if not bridge_state:
                self.logger.error(f"Bridge state not found for {transfer_id}")
                return False
            
            # Verify secret hash
            import hashlib
            secret_hash = hashlib.sha256(secret.encode()).hexdigest()
            if secret_hash != bridge_state.secret_hash:
                self.logger.error(f"Invalid secret for {transfer_id}")
                return False
            
            # Check if secret is already revealed
            if bridge_state.secret_revealed:
                self.logger.warning(f"Secret already revealed for {transfer_id}")
                return True
            
            # Update bridge state
            bridge_state.secret_revealed = True
            bridge_state.last_sync = time.time()
            
            # Store updated state in ZeroG
            await self.zerog_client.store_bridge_state({
                'transfer_id': transfer_id,
                'secret_revealed': True,
                'secret': secret,
                'revealed_at': time.time()
            })
            
            # Trigger execution on both chains
            await self._trigger_claim_execution(transfer_id, secret)
            
            self.logger.info(f"Secret revealed for {transfer_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error handling secret reveal for {transfer_id}: {e}")
            return False
    
    async def _get_escrow_state(self, transfer_id: str, chain_id: str, escrow_address: str) -> Dict[str, Any]:
        """Get escrow contract state from specific chain"""
        try:
            # This would integrate with BridgeManager to query contract state
            # For now, return mock state
            return {
                'status': 'pending',
                'secret_revealed': False,
                'timeout': 3600,
                'block_number': 12345
            }
        except Exception as e:
            self.logger.error(f"Error getting escrow state for {transfer_id} on {chain_id}: {e}")
            return {'status': 'error'}
    
    async def _get_available_resolvers(self) -> List[Dict[str, Any]]:
        """Get list of available resolvers from the network"""
        try:
            # Get resolver network data from ZeroG
            network_data = await self.zerog_client.get_bridge_coordination('resolver_network')
            
            available_resolvers = []
            for resolver_address, resolver_data in network_data.get('resolvers', {}).items():
                if resolver_data.get('active', False) and resolver_data.get('reputation', 0) > 0.5:
                    available_resolvers.append({
                        'address': resolver_address,
                        'reputation': resolver_data.get('reputation', 0),
                        'stake': resolver_data.get('stake', 0),
                        'response_time': resolver_data.get('avg_response_time', 60),
                        'success_rate': resolver_data.get('success_rate', 0.8)
                    })
            
            return available_resolvers
            
        except Exception as e:
            self.logger.error(f"Error getting available resolvers: {e}")
            return []
    
    async def _get_chain_events(self, chain_id: str) -> List[EscrowEvent]:
        """Get recent events from a specific chain"""
        try:
            # This would integrate with chain clients to get recent events
            # For now, return empty list
            return []
        except Exception as e:
            self.logger.error(f"Error getting events from chain {chain_id}: {e}")
            return []
    
    def _is_new_event(self, event: EscrowEvent) -> bool:
        """Check if event is new (not already processed)"""
        if event.transfer_id not in self.escrow_events:
            return True
        
        for existing_event in self.escrow_events[event.transfer_id]:
            if (existing_event.transaction_hash == event.transaction_hash and 
                existing_event.block_number == event.block_number):
                return False
        
        return True
    
    async def _handle_escrow_event(self, event: EscrowEvent):
        """Handle escrow event and update bridge state"""
        try:
            transfer_id = event.transfer_id
            
            # Update bridge state based on event type
            if event.event_type == 'claimed':
                if event.chain_id == self.bridge_states[transfer_id].source_chain:
                    self.bridge_states[transfer_id].source_escrow_state = 'claimed'
                else:
                    self.bridge_states[transfer_id].dest_escrow_state = 'claimed'
            
            elif event.event_type == 'refunded':
                if event.chain_id == self.bridge_states[transfer_id].source_chain:
                    self.bridge_states[transfer_id].source_escrow_state = 'refunded'
                else:
                    self.bridge_states[transfer_id].dest_escrow_state = 'refunded'
            
            elif event.event_type == 'expired':
                # Handle timeout scenario
                await self._handle_timeout(transfer_id)
            
            # Update last sync time
            self.bridge_states[transfer_id].last_sync = time.time()
            
            self.logger.info(f"Handled {event.event_type} event for {transfer_id}")
            
        except Exception as e:
            self.logger.error(f"Error handling escrow event: {e}")
    
    async def _notify_resolvers(self, transfer_id: str, coordination_data: Dict[str, Any]):
        """Notify resolvers about new bridge order"""
        try:
            # Store notification in ZeroG for resolvers to discover
            await self.zerog_client.store_bridge_state({
                'transfer_id': transfer_id,
                'notification_type': 'new_bridge_order',
                'coordination_data': coordination_data,
                'notified_at': time.time()
            })
            
            self.logger.info(f"Notified resolvers about bridge order {transfer_id}")
            
        except Exception as e:
            self.logger.error(f"Error notifying resolvers: {e}")
    
    async def _trigger_claim_execution(self, transfer_id: str, secret: str):
        """Trigger claim execution on both chains"""
        try:
            bridge_state = self.bridge_states[transfer_id]
            
            # Store execution trigger in ZeroG
            await self.zerog_client.store_bridge_state({
                'transfer_id': transfer_id,
                'execution_trigger': {
                    'secret': secret,
                    'source_chain': bridge_state.source_chain,
                    'dest_chain': bridge_state.dest_chain,
                    'triggered_at': time.time()
                }
            })
            
            self.logger.info(f"Triggered claim execution for {transfer_id}")
            
        except Exception as e:
            self.logger.error(f"Error triggering claim execution: {e}")
    
    async def _handle_timeout(self, transfer_id: str):
        """Handle bridge timeout scenario"""
        try:
            bridge_state = self.bridge_states.get(transfer_id)
            if not bridge_state:
                return
            
            # Mark bridge as expired
            bridge_state.source_escrow_state = 'expired'
            bridge_state.dest_escrow_state = 'expired'
            
            # Store timeout event in ZeroG
            await self.zerog_client.store_bridge_state({
                'transfer_id': transfer_id,
                'status': 'expired',
                'timeout_at': time.time(),
                'reason': 'escrow_timeout'
            })
            
            self.logger.warning(f"Bridge {transfer_id} has timed out")
            
        except Exception as e:
            self.logger.error(f"Error handling timeout for {transfer_id}: {e}")
    
    async def start_monitoring(self):
        """Start continuous monitoring of bridge states and events"""
        self.logger.info("Starting bridge coordinator monitoring")
        
        while True:
            try:
                # Sync all active bridge states
                for transfer_id in list(self.bridge_states.keys()):
                    await self.sync_bridge_state(transfer_id)
                
                # Monitor escrow events
                new_events = await self.monitor_escrow_events()
                if new_events:
                    self.logger.info(f"Processed {len(new_events)} new escrow events")
                
                # Sleep before next iteration
                await asyncio.sleep(self.sync_interval)
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.sync_interval)
    
    async def get_bridge_status(self, transfer_id: str) -> Dict[str, Any]:
        """Get comprehensive bridge status"""
        try:
            bridge_state = self.bridge_states.get(transfer_id)
            if not bridge_state:
                await self.sync_bridge_state(transfer_id)
                bridge_state = self.bridge_states.get(transfer_id)
            
            if not bridge_state:
                return {"error": "Bridge state not found"}
            
            # Get coordination data
            coordination_data = await self.zerog_client.get_bridge_coordination(transfer_id)
            
            return {
                'transfer_id': transfer_id,
                'source_chain': bridge_state.source_chain,
                'dest_chain': bridge_state.dest_chain,
                'source_escrow_state': bridge_state.source_escrow_state,
                'dest_escrow_state': bridge_state.dest_escrow_state,
                'secret_revealed': bridge_state.secret_revealed,
                'last_sync': bridge_state.last_sync,
                'coordination_data': coordination_data,
                'events': [
                    {
                        'type': event.event_type,
                        'chain_id': event.chain_id,
                        'timestamp': event.timestamp,
                        'tx_hash': event.transaction_hash
                    } for event in self.escrow_events.get(transfer_id, [])
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting bridge status for {transfer_id}: {e}")
            return {"error": str(e)}

