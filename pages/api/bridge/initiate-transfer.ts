import { NextApiRequest, NextApiResponse } from 'next';
import { BridgeManager } from '../../../lib/contracts/BridgeManager';
import { Config } from '../../../../backend/src/config';

interface InitiateTransferRequest {
  sourceChain: string;
  destChain: string;
  tokenAddress: string;
  amount: string;
  recipient: string;
  timeout?: number;
}

interface InitiateTransferResponse {
  success: boolean;
  transferId?: string;
  sourceEscrowAddress?: string;
  destEscrowAddress?: string;
  secretHash?: string;
  resolverCoordination?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InitiateTransferResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      sourceChain,
      destChain,
      tokenAddress,
      amount,
      recipient,
      timeout = 3600 // Default 1 hour timeout
    }: InitiateTransferRequest = req.body;

    // Validate required parameters
    if (!sourceChain || !destChain || !tokenAddress || !amount || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: sourceChain, destChain, tokenAddress, amount, recipient'
      });
    }

    // Validate chain names
    const supportedChains = ['sepolia', 'celo_alfajores', 'monad', 'etherlink', 'polkadot_westend'];
    if (!supportedChains.includes(sourceChain) || !supportedChains.includes(destChain)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported chain. Supported chains: ' + supportedChains.join(', ')
      });
    }

    // Validate token address format
    if (!tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address format'
      });
    }

    // Validate amount
    const amountBN = BigInt(amount);
    if (amountBN <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // Validate recipient address format
    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient address format'
      });
    }

    // Generate unique transfer ID
    const transferId = `bridge_${Date.now()}_${sourceChain}_${destChain}`;
    
    // Generate secret and hash
    const secret = generateSecret();
    const secretHash = generateSecretHash(secret);

    // Initialize BridgeManager
    const bridgeManager = new BridgeManager();
    
    // Create HTLC escrows on both chains
    const sourceEscrowResult = await bridgeManager.createEscrow(
      sourceChain,
      {
        tokenAddress,
        amount: amountBN,
        recipient,
        secretHash,
        timeout
      }
    );

    if (!sourceEscrowResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to create source escrow: ${sourceEscrowResult.error}`
      });
    }

    const destEscrowResult = await bridgeManager.createEscrow(
      destChain,
      {
        tokenAddress,
        amount: amountBN,
        recipient,
        secretHash,
        timeout
      }
    );

    if (!destEscrowResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to create destination escrow: ${destEscrowResult.error}`
      });
    }

    // Store bridge state in ZeroG for cross-chain coordination
    const bridgeState = {
      transfer_id: transferId,
      source_chain: sourceChain,
      dest_chain: destChain,
      token_address: tokenAddress,
      amount: amountBN.toString(),
      recipient,
      source_escrow_address: sourceEscrowResult.escrowAddress,
      dest_escrow_address: destEscrowResult.escrowAddress,
      secret_hash: secretHash,
      timeout,
      created_at: Date.now() / 1000,
      status: 'pending'
    };

    // Store in ZeroG (this would be an async call to the backend)
    try {
      await storeBridgeStateInZeroG(bridgeState);
    } catch (error) {
      console.warn('Failed to store bridge state in ZeroG:', error);
      // Continue execution even if ZeroG storage fails
    }

    // Initialize resolver coordination
    const resolverCoordination = {
      transfer_id: transferId,
      coordination_started: Date.now() / 1000,
      commitment_deadline: (Date.now() / 1000) + 120, // 2 minutes
      execution_deadline: (Date.now() / 1000) + 600,  // 10 minutes
      secret_hash: secretHash,
      available_resolvers: []
    };

    // Store coordination data
    try {
      await storeResolverCoordination(resolverCoordination);
    } catch (error) {
      console.warn('Failed to store resolver coordination:', error);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      transferId,
      sourceEscrowAddress: sourceEscrowResult.escrowAddress,
      destEscrowAddress: destEscrowResult.escrowAddress,
      secretHash,
      resolverCoordination
    });

  } catch (error) {
    console.error('Error initiating bridge transfer:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

function generateSecret(): string {
  // Generate a cryptographically secure random secret
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function generateSecretHash(secret: string): string {
  // Generate SHA-256 hash of the secret
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  });
}

async function storeBridgeStateInZeroG(bridgeState: any): Promise<void> {
  // This would make an API call to the backend ZeroG client
  // For now, we'll simulate the call
  console.log('Storing bridge state in ZeroG:', bridgeState);
  
  // In a real implementation, this would be:
  // await fetch('/api/backend/zerog/store-bridge-state', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(bridgeState)
  // });
}

async function storeResolverCoordination(coordinationData: any): Promise<void> {
  // This would make an API call to store resolver coordination data
  console.log('Storing resolver coordination:', coordinationData);
  
  // In a real implementation, this would be:
  // await fetch('/api/backend/zerog/store-resolver-coordination', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(coordinationData)
  // });
}
