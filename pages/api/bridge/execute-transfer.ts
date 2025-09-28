import { NextApiRequest, NextApiResponse } from 'next';
import { BridgeManager } from '../../../lib/contracts/BridgeManager';

interface ExecuteTransferRequest {
  transferId: string;
  secret: string;
  resolverAddress: string;
  signature?: string; // For resolver authorization
}

interface ExecuteTransferResponse {
  success: boolean;
  executionId?: string;
  sourceTxHash?: string;
  destTxHash?: string;
  executedAt?: number;
  gasUsed?: {
    source: number;
    dest: number;
  };
  bridgeFee?: string;
  error?: string;
}

interface TransferExecution {
  transfer_id: string;
  secret: string;
  resolver_address: string;
  source_tx_hash?: string;
  dest_tx_hash?: string;
  executed_at: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  gas_used?: {
    source: number;
    dest: number;
  };
  bridge_fee?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExecuteTransferResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      transferId,
      secret,
      resolverAddress,
      signature
    }: ExecuteTransferRequest = req.body;

    // Validate required parameters
    if (!transferId || !secret || !resolverAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: transferId, secret, resolverAddress'
      });
    }

    // Validate secret format (should be 64 hex characters)
    if (!secret.match(/^[a-fA-F0-9]{64}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid secret format. Must be 64 hex characters.'
      });
    }

    // Validate resolver address format
    if (!resolverAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolver address format'
      });
    }

    // Get transfer data and verify it exists
    const transferData = await getTransferData(transferId);
    if (!transferData) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    // Check if transfer is ready for execution
    if (transferData.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Transfer is not ready for execution. Status: ${transferData.status}`
      });
    }

    // Verify secret hash matches
    const secretHash = await generateSecretHash(secret);
    if (secretHash !== transferData.secret_hash) {
      return res.status(400).json({
        success: false,
        error: 'Secret does not match the hash'
      });
    }

    // Verify resolver authorization
    const resolverAuth = await verifyResolverAuthorization(transferId, resolverAddress, signature);
    if (!resolverAuth.isAuthorized) {
      return res.status(403).json({
        success: false,
        error: resolverAuth.error
      });
    }

    // Check if transfer has not expired
    const currentTime = Date.now() / 1000;
    if (currentTime > transferData.created_at + transferData.timeout) {
      return res.status(400).json({
        success: false,
        error: 'Transfer has expired'
      });
    }

    // Create execution record
    const executionId = `exec_${Date.now()}_${resolverAddress.slice(0, 8)}`;
    const execution: TransferExecution = {
      transfer_id: transferId,
      secret,
      resolver_address: resolverAddress,
      executed_at: currentTime,
      status: 'executing'
    };

    // Store execution record
    await storeExecutionRecord(executionId, execution);

    try {
      // Initialize BridgeManager
      const bridgeManager = new BridgeManager();

      // Execute destination chain claim first (claim with secret)
      const destExecutionResult = await executeDestinationClaim(
        transferData,
        secret,
        bridgeManager
      );

      if (!destExecutionResult.success) {
        execution.status = 'failed';
        execution.error = `Destination claim failed: ${destExecutionResult.error}`;
        await updateExecutionRecord(executionId, execution);
        
        return res.status(500).json({
          success: false,
          error: `Destination claim failed: ${destExecutionResult.error}`
        });
      }

      execution.dest_tx_hash = destExecutionResult.txHash;
      execution.gas_used = { ...execution.gas_used, dest: destExecutionResult.gasUsed };

      // Execute source chain claim (claim with same secret)
      const sourceExecutionResult = await executeSourceClaim(
        transferData,
        secret,
        bridgeManager
      );

      if (!sourceExecutionResult.success) {
        execution.status = 'failed';
        execution.error = `Source claim failed: ${sourceExecutionResult.error}`;
        await updateExecutionRecord(executionId, execution);
        
        return res.status(500).json({
          success: false,
          error: `Source claim failed: ${sourceExecutionResult.error}`
        });
      }

      execution.source_tx_hash = sourceExecutionResult.txHash;
      execution.gas_used = { ...execution.gas_used, source: sourceExecutionResult.gasUsed };
      execution.status = 'completed';
      execution.bridge_fee = calculateBridgeFee(transferData.amount, resolverAddress);

      // Update execution record
      await updateExecutionRecord(executionId, execution);

      // Update transfer status
      await updateTransferStatus(transferId, 'completed');

      // Update bridge completion in ZeroG
      await updateBridgeCompletion(transferId, {
        status: 'completed',
        source_tx: sourceExecutionResult.txHash,
        dest_tx: destExecutionResult.txHash,
        executed_at: currentTime,
        resolver_address: resolverAddress,
        execution_id: executionId
      });

      // Update resolver reputation
      await updateResolverReputation(resolverAddress, true);

      // Return success response
      return res.status(200).json({
        success: true,
        executionId,
        sourceTxHash: sourceExecutionResult.txHash,
        destTxHash: destExecutionResult.txHash,
        executedAt: currentTime,
        gasUsed: execution.gas_used,
        bridgeFee: execution.bridge_fee
      });

    } catch (error) {
      // Update execution record with error
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      await updateExecutionRecord(executionId, execution);

      // Update resolver reputation negatively
      await updateResolverReputation(resolverAddress, false);

      console.error('Error executing bridge transfer:', error);
      return res.status(500).json({
        success: false,
        error: 'Bridge execution failed'
      });
    }

  } catch (error) {
    console.error('Error processing execute transfer request:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function getTransferData(transferId: string): Promise<any> {
  // This would query transfer data from ZeroG
  try {
    // In real implementation:
    // const response = await fetch(`/api/backend/zerog/get-bridge-metadata?transferId=${transferId}`);
    // const data = await response.json();
    // return data;
    
    // Mock data for now
    return {
      transfer_id: transferId,
      source_chain: 'sepolia',
      dest_chain: 'celo_alfajores',
      token_address: '0x1234567890123456789012345678901234567890',
      amount: '1000000000000000000', // 1 token
      recipient: '0x9876543210987654321098765432109876543210',
      source_escrow_address: '0x1111111111111111111111111111111111111111',
      dest_escrow_address: '0x2222222222222222222222222222222222222222',
      secret_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      timeout: 3600,
      created_at: Date.now() / 1000 - 300, // 5 minutes ago
      status: 'pending'
    };
  } catch (error) {
    return null;
  }
}

async function generateSecretHash(secret: string): Promise<string> {
  // Generate SHA-256 hash of the secret
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyResolverAuthorization(
  transferId: string, 
  resolverAddress: string, 
  signature?: string
): Promise<{isAuthorized: boolean, error?: string}> {
  try {
    // Get winning resolver from auction
    const winningResolver = await getWinningResolver(transferId);
    if (!winningResolver) {
      return {
        isAuthorized: false,
        error: 'No winning resolver found for this transfer'
      };
    }

    if (winningResolver.toLowerCase() !== resolverAddress.toLowerCase()) {
      return {
        isAuthorized: false,
        error: 'Resolver is not authorized to execute this transfer'
      };
    }

    // Verify signature if provided
    if (signature && !verifyResolverSignature(transferId, resolverAddress, signature)) {
      return {
        isAuthorized: false,
        error: 'Invalid resolver signature'
      };
    }

    return { isAuthorized: true };
  } catch (error) {
    return {
      isAuthorized: false,
      error: 'Failed to verify resolver authorization'
    };
  }
}

async function getWinningResolver(transferId: string): Promise<string | null> {
  // This would query the winning resolver from ZeroG
  try {
    // In real implementation:
    // const response = await fetch(`/api/backend/bridge/winning-resolver?transferId=${transferId}`);
    // const data = await response.json();
    // return data.winning_resolver;
    
    // Mock data - return the first resolver that bids
    return '0x1234567890123456789012345678901234567890';
  } catch (error) {
    return null;
  }
}

function verifyResolverSignature(transferId: string, resolverAddress: string, signature: string): boolean {
  // This would verify the resolver's signature
  // For now, return true (signature valid)
  return true;
}

async function executeDestinationClaim(
  transferData: any,
  secret: string,
  bridgeManager: BridgeManager
): Promise<{success: boolean, txHash?: string, gasUsed?: number, error?: string}> {
  try {
    // Execute claim on destination chain
    const result = await bridgeManager.claimTokens(
      transferData.dest_chain,
      {
        escrowAddress: transferData.dest_escrow_address,
        secret,
        recipient: transferData.recipient
      }
    );

    return {
      success: result.success,
      txHash: result.txHash,
      gasUsed: result.gasUsed,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function executeSourceClaim(
  transferData: any,
  secret: string,
  bridgeManager: BridgeManager
): Promise<{success: boolean, txHash?: string, gasUsed?: number, error?: string}> {
  try {
    // Execute claim on source chain
    const result = await bridgeManager.claimTokens(
      transferData.source_chain,
      {
        escrowAddress: transferData.source_escrow_address,
        secret,
        recipient: transferData.recipient
      }
    );

    return {
      success: result.success,
      txHash: result.txHash,
      gasUsed: result.gasUsed,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function calculateBridgeFee(amount: string, resolverAddress: string): string {
  // Calculate bridge fee (e.g., 0.1% of amount)
  const amountBN = BigInt(amount);
  const feeRate = 10n; // 0.1% (10 basis points)
  const fee = (amountBN * feeRate) / 10000n;
  return fee.toString();
}

async function storeExecutionRecord(executionId: string, execution: TransferExecution): Promise<void> {
  // This would store the execution record in ZeroG
  console.log('Storing execution record:', executionId, execution);
}

async function updateExecutionRecord(executionId: string, execution: TransferExecution): Promise<void> {
  // This would update the execution record in ZeroG
  console.log('Updating execution record:', executionId, execution);
}

async function updateTransferStatus(transferId: string, status: string): Promise<void> {
  // This would update the transfer status in ZeroG
  console.log('Updating transfer status:', transferId, status);
}

async function updateBridgeCompletion(transferId: string, completionData: any): Promise<void> {
  // This would update bridge completion in ZeroG
  console.log('Updating bridge completion:', transferId, completionData);
}

async function updateResolverReputation(resolverAddress: string, success: boolean): Promise<void> {
  // This would update resolver reputation based on execution success
  console.log('Updating resolver reputation:', resolverAddress, success);
}
