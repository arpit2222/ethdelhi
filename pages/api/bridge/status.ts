import { NextApiRequest, NextApiResponse } from 'next';
import { BridgeManager } from '../../../lib/contracts/BridgeManager';

interface BridgeStatusResponse {
  success: boolean;
  transferId?: string;
  status?: string;
  sourceChain?: string;
  destChain?: string;
  sourceEscrowState?: string;
  destEscrowState?: string;
  secretRevealed?: boolean;
  auctionStatus?: {
    isActive: boolean;
    progress: number;
    timeRemaining: number;
    bidCount: number;
  };
  resolverStatus?: {
    winningResolver?: string;
    selectedAt?: number;
    executionDeadline?: number;
  };
  executionStatus?: {
    sourceTxHash?: string;
    destTxHash?: string;
    executedAt?: number;
    gasUsed?: {
      source: number;
      dest: number;
    };
    bridgeFee?: string;
  };
  events?: Array<{
    type: string;
    chainId: string;
    timestamp: number;
    txHash: string;
    blockNumber: number;
  }>;
  error?: string;
}

interface BridgeState {
  transfer_id: string;
  source_chain: string;
  dest_chain: string;
  source_escrow_state: string;
  dest_escrow_state: string;
  secret_revealed: boolean;
  secret_hash: string;
  status: string;
  created_at: number;
  last_sync: number;
  timeout: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BridgeStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { transferId } = req.query;

    // Validate transfer ID
    if (!transferId || typeof transferId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Transfer ID is required'
      });
    }

    // Get comprehensive bridge status
    const bridgeStatus = await getComprehensiveBridgeStatus(transferId);
    
    if (!bridgeStatus) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    // Get auction status
    const auctionStatus = await getAuctionStatus(transferId);

    // Get resolver status
    const resolverStatus = await getResolverStatus(transferId);

    // Get execution status
    const executionStatus = await getExecutionStatus(transferId);

    // Get recent events
    const events = await getBridgeEvents(transferId);

    // Return comprehensive status
    return res.status(200).json({
      success: true,
      transferId,
      status: bridgeStatus.status,
      sourceChain: bridgeStatus.source_chain,
      destChain: bridgeStatus.dest_chain,
      sourceEscrowState: bridgeStatus.source_escrow_state,
      destEscrowState: bridgeStatus.dest_escrow_state,
      secretRevealed: bridgeStatus.secret_revealed,
      auctionStatus,
      resolverStatus,
      executionStatus,
      events
    });

  } catch (error) {
    console.error('Error getting bridge status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function getComprehensiveBridgeStatus(transferId: string): Promise<BridgeState | null> {
  try {
    // Get bridge state from ZeroG
    const bridgeState = await getBridgeStateFromZeroG(transferId);
    
    if (!bridgeState) {
      return null;
    }

    // Initialize BridgeManager for real-time state queries
    const bridgeManager = new BridgeManager();

    // Get current escrow states from both chains
    const sourceEscrowState = await getCurrentEscrowState(
      bridgeState.source_chain,
      bridgeState.source_escrow_address,
      bridgeManager
    );

    const destEscrowState = await getCurrentEscrowState(
      bridgeState.dest_chain,
      bridgeState.dest_escrow_address,
      bridgeManager
    );

    // Update bridge state with real-time data
    const updatedState: BridgeState = {
      ...bridgeState,
      source_escrow_state: sourceEscrowState.status,
      dest_escrow_state: destEscrowState.status,
      secret_revealed: sourceEscrowState.secret_revealed || destEscrowState.secret_revealed,
      last_sync: Date.now() / 1000
    };

    // Determine overall status
    updatedState.status = determineOverallStatus(updatedState);

    // Store updated state back to ZeroG
    await syncBridgeStateToZeroG(transferId, updatedState);

    return updatedState;

  } catch (error) {
    console.error('Error getting comprehensive bridge status:', error);
    return null;
  }
}

async function getBridgeStateFromZeroG(transferId: string): Promise<BridgeState | null> {
  try {
    // This would query bridge state from ZeroG
    // In real implementation:
    // const response = await fetch(`/api/backend/zerog/get-bridge-metadata?transferId=${transferId}`);
    // const data = await response.json();
    // return data;

    // Mock data for now
    return {
      transfer_id: transferId,
      source_chain: 'sepolia',
      dest_chain: 'celo_alfajores',
      source_escrow_state: 'pending',
      dest_escrow_state: 'pending',
      secret_revealed: false,
      secret_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      status: 'pending',
      created_at: Date.now() / 1000 - 300, // 5 minutes ago
      last_sync: Date.now() / 1000 - 60,   // 1 minute ago
      timeout: 3600
    };
  } catch (error) {
    return null;
  }
}

async function getCurrentEscrowState(
  chainId: string,
  escrowAddress: string,
  bridgeManager: BridgeManager
): Promise<{status: string, secret_revealed: boolean}> {
  try {
    // Query escrow contract state from the chain
    const escrowState = await bridgeManager.getEscrowState(chainId, escrowAddress);
    
    return {
      status: escrowState.status,
      secret_revealed: escrowState.secret_revealed
    };
  } catch (error) {
    console.error(`Error getting escrow state for ${chainId}:`, error);
    return {
      status: 'unknown',
      secret_revealed: false
    };
  }
}

function determineOverallStatus(bridgeState: BridgeState): string {
  const currentTime = Date.now() / 1000;
  
  // Check if transfer has expired
  if (currentTime > bridgeState.created_at + bridgeState.timeout) {
    return 'expired';
  }

  // Check if both escrows are claimed
  if (bridgeState.source_escrow_state === 'claimed' && 
      bridgeState.dest_escrow_state === 'claimed') {
    return 'completed';
  }

  // Check if any escrow is refunded
  if (bridgeState.source_escrow_state === 'refunded' || 
      bridgeState.dest_escrow_state === 'refunded') {
    return 'refunded';
  }

  // Check if secret is revealed but not yet claimed
  if (bridgeState.secret_revealed) {
    return 'secret_revealed';
  }

  // Check if escrows are created and pending
  if (bridgeState.source_escrow_state === 'pending' && 
      bridgeState.dest_escrow_state === 'pending') {
    return 'pending';
  }

  return 'unknown';
}

async function getAuctionStatus(transferId: string): Promise<{
  isActive: boolean;
  progress: number;
  timeRemaining: number;
  bidCount: number;
}> {
  try {
    // Get transfer creation time and auction duration
    const transferData = await getTransferData(transferId);
    const auctionDuration = 300; // 5 minutes
    
    const currentTime = Date.now() / 1000;
    const timeElapsed = currentTime - transferData.created_at;
    const progress = Math.min(timeElapsed / auctionDuration, 1.0);
    const timeRemaining = Math.max(auctionDuration - timeElapsed, 0);
    
    // Get bid count
    const bidCount = await getBidCount(transferId);
    
    return {
      isActive: progress < 1.0,
      progress,
      timeRemaining,
      bidCount
    };
  } catch (error) {
    return {
      isActive: false,
      progress: 1.0,
      timeRemaining: 0,
      bidCount: 0
    };
  }
}

async function getResolverStatus(transferId: string): Promise<{
  winningResolver?: string;
  selectedAt?: number;
  executionDeadline?: number;
}> {
  try {
    // Get winning resolver data from ZeroG
    const resolverData = await getWinningResolverData(transferId);
    
    return {
      winningResolver: resolverData?.resolver_address,
      selectedAt: resolverData?.selected_at,
      executionDeadline: resolverData?.execution_deadline
    };
  } catch (error) {
    return {};
  }
}

async function getExecutionStatus(transferId: string): Promise<{
  sourceTxHash?: string;
  destTxHash?: string;
  executedAt?: number;
  gasUsed?: {
    source: number;
    dest: number;
  };
  bridgeFee?: string;
}> {
  try {
    // Get execution data from ZeroG
    const executionData = await getExecutionData(transferId);
    
    return {
      sourceTxHash: executionData?.source_tx_hash,
      destTxHash: executionData?.dest_tx_hash,
      executedAt: executionData?.executed_at,
      gasUsed: executionData?.gas_used,
      bridgeFee: executionData?.bridge_fee
    };
  } catch (error) {
    return {};
  }
}

async function getBridgeEvents(transferId: string): Promise<Array<{
  type: string;
  chainId: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}>> {
  try {
    // Get events from ZeroG
    const events = await getEventsFromZeroG(transferId);
    
    return events.map(event => ({
      type: event.event_type,
      chainId: event.chain_id,
      timestamp: event.timestamp,
      txHash: event.transaction_hash,
      blockNumber: event.block_number
    }));
  } catch (error) {
    return [];
  }
}

async function syncBridgeStateToZeroG(transferId: string, bridgeState: BridgeState): Promise<void> {
  try {
    // Store updated bridge state in ZeroG
    // In real implementation:
    // await fetch('/api/backend/zerog/store-bridge-state', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(bridgeState)
    // });
    
    console.log('Syncing bridge state to ZeroG:', transferId, bridgeState);
  } catch (error) {
    console.error('Error syncing bridge state to ZeroG:', error);
  }
}

async function getTransferData(transferId: string): Promise<{created_at: number}> {
  // This would query transfer data from ZeroG
  return { created_at: Date.now() / 1000 - 300 }; // 5 minutes ago
}

async function getBidCount(transferId: string): Promise<number> {
  // This would query bid count from ZeroG
  return 3; // Mock data
}

async function getWinningResolverData(transferId: string): Promise<any> {
  // This would query winning resolver data from ZeroG
  return {
    resolver_address: '0x1234567890123456789012345678901234567890',
    selected_at: Date.now() / 1000 - 120, // 2 minutes ago
    execution_deadline: Date.now() / 1000 + 480 // 8 minutes from now
  };
}

async function getExecutionData(transferId: string): Promise<any> {
  // This would query execution data from ZeroG
  return {
    source_tx_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    dest_tx_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    executed_at: Date.now() / 1000 - 60, // 1 minute ago
    gas_used: {
      source: 150000,
      dest: 150000
    },
    bridge_fee: '1000000000000000' // 0.001 ETH
  };
}

async function getEventsFromZeroG(transferId: string): Promise<any[]> {
  // This would query events from ZeroG
  return [
    {
      event_type: 'escrow_created',
      chain_id: 'sepolia',
      timestamp: Date.now() / 1000 - 300,
      transaction_hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      block_number: 12345
    },
    {
      event_type: 'escrow_created',
      chain_id: 'celo_alfajores',
      timestamp: Date.now() / 1000 - 299,
      transaction_hash: '0x4444444444444444444444444444444444444444444444444444444444444444',
      block_number: 67890
    }
  ];
}
