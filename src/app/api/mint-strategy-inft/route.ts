import { NextResponse } from 'next/server';
import { marketplaceStrategies } from '@/lib/trading/marketplace-storage';

interface MintStrategyRequest {
  strategy: {
    type: string;
    description: string;
    parameters: any;
    confidence: number;
    reasoning?: string;
  };
  strategyName: string;
  strategyDescription: string;
  price: number;
  creator: string;
}

class StrategyINFTMinter {
  async mintStrategyAsINFT(request: MintStrategyRequest): Promise<any> {
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const mockTokenId = Math.floor(Math.random() * 1000000).toString();
    const mockMetadataHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const marketplaceEntry = {
      tokenId: mockTokenId,
      name: request.strategyName,
      description: request.strategyDescription,
      type: request.strategy.type,
      confidence: request.strategy.confidence,
      price: request.price,
      purchases: 0,
      earnings: 0,
      creator: request.creator,
      parameters: request.strategy.parameters,
      createdAt: Date.now(),
      transactionHash: mockTxHash,
      metadataHash: mockMetadataHash,
    };

    marketplaceStrategies.set(mockTokenId, marketplaceEntry);

    return {
      tokenId: mockTokenId,
      contractAddress: '0x1234567890123456789012345678901234567890',
      transactionHash: mockTxHash,
      metadataHash: mockMetadataHash,
      marketplaceUrl: `/api/strategy-marketplace?tokenId=${mockTokenId}`,
    };
  }
}

const strategyMinter = new StrategyINFTMinter();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: Request) {
  try {
    const { strategy, strategyName, strategyDescription, price, creator } = (await req.json()) as MintStrategyRequest;

    if (!strategy || !strategyName || !creator) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const iNFT = await strategyMinter.mintStrategyAsINFT({
      strategy,
      strategyName,
      strategyDescription: strategyDescription || strategy.description,
      price: price || 0.01,
      creator,
    });

    return NextResponse.json({
      success: true,
      iNFT: {
        tokenId: iNFT.tokenId,
        contractAddress: iNFT.contractAddress,
        transactionHash: iNFT.transactionHash,
        metadataHash: iNFT.metadataHash,
        marketplaceUrl: iNFT.marketplaceUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
