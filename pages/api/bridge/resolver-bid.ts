import { NextApiRequest, NextApiResponse } from 'next';

interface ResolverBidRequest {
  transferId: string;
  resolverAddress: string;
  bidPrice: string;
  executionTime: number;
  gasEstimate: string;
  reputationScore: number;
  stakeAmount: string;
  signature?: string; // For resolver authorization
}

interface ResolverBidResponse {
  success: boolean;
  bidId?: string;
  selectionStatus?: string;
  dutchAuctionProgress?: number;
  timeRemaining?: number;
  competingBids?: number;
  error?: string;
}

interface ResolverBid {
  transfer_id: string;
  resolver_address: string;
  bid_price: string;
  execution_time: number;
  gas_estimate: string;
  reputation_score: number;
  stake_amount: string;
  submitted_at: number;
  status: 'pending' | 'selected' | 'rejected' | 'expired';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResolverBidResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      transferId,
      resolverAddress,
      bidPrice,
      executionTime,
      gasEstimate,
      reputationScore,
      stakeAmount,
      signature
    }: ResolverBidRequest = req.body;

    // Validate required parameters
    if (!transferId || !resolverAddress || !bidPrice || !executionTime || !gasEstimate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: transferId, resolverAddress, bidPrice, executionTime, gasEstimate'
      });
    }

    // Validate resolver address format
    if (!resolverAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolver address format'
      });
    }

    // Validate bid price
    const bidPriceBN = BigInt(bidPrice);
    if (bidPriceBN < 0) {
      return res.status(400).json({
        success: false,
        error: 'Bid price must be non-negative'
      });
    }

    // Validate execution time (1-300 seconds)
    if (executionTime < 1 || executionTime > 300) {
      return res.status(400).json({
        success: false,
        error: 'Execution time must be between 1 and 300 seconds'
      });
    }

    // Validate gas estimate
    const gasEstimateBN = BigInt(gasEstimate);
    if (gasEstimateBN <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Gas estimate must be greater than 0'
      });
    }

    // Check if transfer exists and is still active
    const transferStatus = await getTransferStatus(transferId);
    if (!transferStatus.exists) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }

    if (transferStatus.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Transfer is no longer accepting bids. Status: ${transferStatus.status}`
      });
    }

    // Check if auction period is still active
    const auctionStatus = await getAuctionStatus(transferId);
    if (!auctionStatus.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Auction period has ended'
      });
    }

    // Validate resolver authorization and reputation
    const resolverValidation = await validateResolver(resolverAddress, reputationScore, stakeAmount);
    if (!resolverValidation.isValid) {
      return res.status(403).json({
        success: false,
        error: resolverValidation.error
      });
    }

    // Verify resolver signature if provided
    if (signature && !verifyResolverSignature(transferId, resolverAddress, signature)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid resolver signature'
      });
    }

    // Create bid object
    const bid: ResolverBid = {
      transfer_id: transferId,
      resolver_address: resolverAddress,
      bid_price: bidPrice,
      execution_time: executionTime,
      gas_estimate: gasEstimate,
      reputation_score: reputationScore || 0.8,
      stake_amount: stakeAmount || '1000',
      submitted_at: Date.now() / 1000,
      status: 'pending'
    };

    // Store bid in ZeroG for cross-chain coordination
    const bidId = await storeResolverBid(bid);

    // Get current auction status
    const currentBids = await getTransferBids(transferId);
    const competingBids = currentBids.length;

    // Calculate Dutch auction progress
    const auctionProgress = auctionStatus.progress;
    const timeRemaining = auctionStatus.timeRemaining;

    // Check if this bid is competitive
    const isCompetitive = await evaluateBidCompetitiveness(bid, currentBids);

    // Store bid result
    const bidResult = {
      bidId,
      transferId,
      resolverAddress,
      isCompetitive,
      submittedAt: Date.now() / 1000
    };

    await storeBidResult(bidResult);

    // Return response
    return res.status(200).json({
      success: true,
      bidId,
      selectionStatus: isCompetitive ? 'competitive' : 'pending_review',
      dutchAuctionProgress: auctionProgress,
      timeRemaining,
      competingBids
    });

  } catch (error) {
    console.error('Error processing resolver bid:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function getTransferStatus(transferId: string): Promise<{exists: boolean, status: string}> {
  // This would query the bridge state from ZeroG
  // For now, return mock data
  try {
    // In real implementation:
    // const response = await fetch(`/api/backend/bridge/status?transferId=${transferId}`);
    // const data = await response.json();
    // return { exists: true, status: data.status };
    
    return { exists: true, status: 'pending' };
  } catch (error) {
    return { exists: false, status: 'error' };
  }
}

async function getAuctionStatus(transferId: string): Promise<{isActive: boolean, progress: number, timeRemaining: number}> {
  // This would calculate Dutch auction status
  try {
    // Get transfer creation time and auction duration
    const transferData = await getTransferData(transferId);
    const auctionDuration = 300; // 5 minutes
    
    const currentTime = Date.now() / 1000;
    const timeElapsed = currentTime - transferData.created_at;
    const progress = Math.min(timeElapsed / auctionDuration, 1.0);
    const timeRemaining = Math.max(auctionDuration - timeElapsed, 0);
    
    return {
      isActive: progress < 1.0,
      progress,
      timeRemaining
    };
  } catch (error) {
    return { isActive: false, progress: 1.0, timeRemaining: 0 };
  }
}

async function getTransferData(transferId: string): Promise<{created_at: number}> {
  // This would query transfer data from ZeroG
  // For now, return mock data
  return { created_at: Date.now() / 1000 - 60 }; // 1 minute ago
}

async function validateResolver(
  resolverAddress: string, 
  reputationScore: number, 
  stakeAmount: string
): Promise<{isValid: boolean, error?: string}> {
  try {
    // Check minimum reputation threshold
    const minReputation = 0.7;
    if (reputationScore < minReputation) {
      return {
        isValid: false,
        error: `Reputation score ${reputationScore} below minimum ${minReputation}`
      };
    }

    // Check minimum stake amount
    const minStake = BigInt('1000');
    const stakeBN = BigInt(stakeAmount);
    if (stakeBN < minStake) {
      return {
        isValid: false,
        error: `Stake amount ${stakeAmount} below minimum ${minStake.toString()}`
      };
    }

    // Check if resolver is not blacklisted
    const isBlacklisted = await checkResolverBlacklist(resolverAddress);
    if (isBlacklisted) {
      return {
        isValid: false,
        error: 'Resolver is blacklisted'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate resolver'
    };
  }
}

async function checkResolverBlacklist(resolverAddress: string): Promise<boolean> {
  // This would check against a blacklist in ZeroG
  // For now, return false (not blacklisted)
  return false;
}

function verifyResolverSignature(transferId: string, resolverAddress: string, signature: string): boolean {
  // This would verify the resolver's signature
  // For now, return true (signature valid)
  return true;
}

async function storeResolverBid(bid: ResolverBid): Promise<string> {
  // This would store the bid in ZeroG
  try {
    // In real implementation:
    // const response = await fetch('/api/backend/zerog/store-resolver-bid', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(bid)
    // });
    // const result = await response.json();
    // return result.bidId;
    
    const bidId = `bid_${Date.now()}_${bid.resolver_address.slice(0, 8)}`;
    console.log('Storing resolver bid:', bidId, bid);
    return bidId;
  } catch (error) {
    throw new Error('Failed to store resolver bid');
  }
}

async function getTransferBids(transferId: string): Promise<ResolverBid[]> {
  // This would retrieve all bids for a transfer from ZeroG
  // For now, return empty array
  return [];
}

async function evaluateBidCompetitiveness(bid: ResolverBid, existingBids: ResolverBid[]): Promise<boolean> {
  // Evaluate if the bid is competitive based on price, reputation, and execution time
  if (existingBids.length === 0) {
    return true; // First bid is always competitive
  }

  // Calculate bid score
  const bidScore = calculateBidScore(bid);
  
  // Calculate average score of existing bids
  const existingScores = existingBids.map(b => calculateBidScore(b));
  const avgScore = existingScores.reduce((sum, score) => sum + score, 0) / existingScores.length;
  
  // Bid is competitive if it's better than average
  return bidScore > avgScore;
}

function calculateBidScore(bid: ResolverBid): number {
  // Calculate weighted score based on price, reputation, and execution time
  const priceScore = 1.0 - (Number(bid.bid_price) / (1000000 * 0.01)); // Max 1% fee
  const reputationScore = bid.reputation_score;
  const executionScore = 1.0 - (bid.execution_time / 300); // Max 5 minutes
  
  // Weighted combination
  return (priceScore * 0.4 + reputationScore * 0.4 + executionScore * 0.2);
}

async function storeBidResult(bidResult: any): Promise<void> {
  // This would store the bid result in ZeroG
  console.log('Storing bid result:', bidResult);
}
