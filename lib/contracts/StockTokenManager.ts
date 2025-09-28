import { ethers, JsonRpcProvider, Contract, Wallet } from "ethers";
import * as crypto from "crypto";

// Interfaces for stock tokenization
export interface StockTokenData {
  tokenAddress: string;
  stockSymbol: string;
  companyName: string;
  verificationHash: string;
  totalSupply: string;
  tokenizationDate: number;
  creator: string;
  pricePerShare: string;
}

export interface StockMetadata {
  stockSymbol: string;
  companyName: string;
  tokenAddress: string;
  verificationDocumentHash: string;
  creatorAddress: string;
  timestamp: number;
  totalShares: string;
  pricePerShare: string;
}

export interface DeploymentResult {
  tokenAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  metadataStorageId: string;
}

// Contract ABIs (simplified - in production, use full ABIs)
const STOCK_ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function getStockMetadata() view returns (tuple(string stockSymbol, string companyName, string verificationHash, uint256 totalShares, uint256 pricePerShare, uint256 tokenizationDate, address creator))",
  "function getStockSymbol() view returns (string)",
  "function getCompanyName() view returns (string)",
  "function getVerificationHash() view returns (string)",
  "function getTotalShares() view returns (uint256)",
  "function getPricePerShare() view returns (uint256)",
  "function getTokenizationDate() view returns (uint256)",
  "function getCreator() view returns (address)"
];

const STOCK_TOKEN_FACTORY_ABI = [
  "function createStockToken(string name, string symbol, uint256 initialSupply, string stockSymbol, string companyName, string verificationHash, uint256 pricePerShare) returns (address)",
  "function getUserStockTokens(address user) view returns (address[])",
  "function getStockTokenBySymbol(string stockSymbol) view returns (address)",
  "function getTokenMetadata(address tokenAddress) view returns (tuple(address tokenAddress, string stockSymbol, string companyName, string verificationHash, uint256 totalSupply, uint256 tokenizationDate, address creator))",
  "function isStockTokenized(string stockSymbol) view returns (bool)",
  "function linkToStrategyINFT(address stockTokenAddress, uint256 strategyTokenId)",
  "event StockTokenCreated(address indexed tokenAddress, string indexed stockSymbol, address indexed creator, uint256 totalSupply, string companyName, string verificationHash)"
];

export class StockTokenManager {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private factoryContract: Contract;
  private zeroGClient: any; // 0G Storage client

  constructor(
    provider: JsonRpcProvider,
    privateKey: string,
    factoryAddress: string,
    zeroGClient: any
  ) {
    this.provider = provider;
    this.wallet = new Wallet(privateKey, provider);
    this.factoryContract = new Contract(factoryAddress, STOCK_TOKEN_FACTORY_ABI, this.wallet);
    this.zeroGClient = zeroGClient;
  }

  async deployStockToken(
    name: string,
    symbol: string,
    initialSupply: string,
    stockSymbol: string,
    companyName: string,
    verificationDocumentHash: string,
    pricePerShare: string
  ): Promise<DeploymentResult> {
    try {
      // Check if stock is already tokenized
      const isTokenized = await this.factoryContract.isStockTokenized(stockSymbol);
      if (isTokenized) {
        throw new Error(`Stock ${stockSymbol} is already tokenized`);
      }

      // Convert string values to proper types
      const supply = ethers.parseEther(initialSupply);
      const price = ethers.parseEther(pricePerShare);

      // Estimate gas for the transaction
      const gasEstimate = await this.factoryContract.createStockToken.estimateGas(
        name,
        symbol,
        supply,
        stockSymbol,
        companyName,
        verificationDocumentHash,
        price
      );

      // Create the transaction
      const tx = await this.factoryContract.createStockToken(
        name,
        symbol,
        supply,
        stockSymbol,
        companyName,
        verificationDocumentHash,
        price,
        {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        }
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }

      // Extract token address from event logs
      const event = receipt.logs.find(log => {
        try {
          const decoded = this.factoryContract.interface.parseLog(log);
          return decoded?.name === "StockTokenCreated";
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error("StockTokenCreated event not found");
      }

      const decodedEvent = this.factoryContract.interface.parseLog(event);
      const tokenAddress = decodedEvent?.args?.tokenAddress;

      if (!tokenAddress) {
        throw new Error("Token address not found in event");
      }

      // Store metadata on 0G network
      const metadata: StockMetadata = {
        stockSymbol,
        companyName,
        tokenAddress,
        verificationDocumentHash,
        creatorAddress: this.wallet.address,
        timestamp: Date.now(),
        totalShares: initialSupply,
        pricePerShare
      };

      const storageResult = await this.zeroGClient.store_stock_metadata(metadata);

      return {
        tokenAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        metadataStorageId: storageResult.storageId
      };

    } catch (error) {
      console.error("Failed to deploy stock token:", error);
      throw error;
    }
  }

  async getStockTokenDetails(tokenAddress: string): Promise<StockTokenData | null> {
    try {
      const tokenContract = new Contract(tokenAddress, STOCK_ERC20_ABI, this.provider);
      
      const [
        name,
        symbol,
        totalSupply,
        decimals,
        metadata
      ] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply(),
        tokenContract.decimals(),
        tokenContract.getStockMetadata()
      ]);

      return {
        tokenAddress,
        stockSymbol: metadata.stockSymbol,
        companyName: metadata.companyName,
        verificationHash: metadata.verificationHash,
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        tokenizationDate: Number(metadata.tokenizationDate),
        creator: metadata.creator,
        pricePerShare: ethers.formatEther(metadata.pricePerShare)
      };

    } catch (error) {
      console.error("Failed to get stock token details:", error);
      return null;
    }
  }

  async getUserStockTokens(userAddress: string): Promise<StockTokenData[]> {
    try {
      const tokenAddresses = await this.factoryContract.getUserStockTokens(userAddress);
      
      const tokenDetails = await Promise.all(
        tokenAddresses.map((address: string) => this.getStockTokenDetails(address))
      );

      return tokenDetails.filter((details): details is StockTokenData => details !== null);

    } catch (error) {
      console.error("Failed to get user stock tokens:", error);
      throw error;
    }
  }

  async verifyStockOwnership(
    tokenAddress: string,
    userAddress: string,
    verificationDocumentHash: string
  ): Promise<boolean> {
    try {
      const tokenContract = new Contract(tokenAddress, STOCK_ERC20_ABI, this.provider);
      
      // Check if user has balance
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance === 0n) {
        return false;
      }

      // Verify the document hash matches
      const storedHash = await tokenContract.getVerificationHash();
      return storedHash === verificationDocumentHash;

    } catch (error) {
      console.error("Failed to verify stock ownership:", error);
      return false;
    }
  }

  async linkStockToStrategy(
    stockTokenAddress: string,
    strategyTokenId: string
  ): Promise<{ transactionHash: string; blockNumber: number }> {
    try {
      const tx = await this.factoryContract.linkToStrategyINFT(
        stockTokenAddress,
        strategyTokenId
      );

      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      console.error("Failed to link stock to strategy:", error);
      throw error;
    }
  }

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const tokenContract = new Contract(tokenAddress, STOCK_ERC20_ABI, this.provider);
      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        tokenContract.decimals()
      ]);

      return ethers.formatUnits(balance, decimals);

    } catch (error) {
      console.error("Failed to get token balance:", error);
      return "0";
    }
  }

  async isStockTokenized(stockSymbol: string): Promise<boolean> {
    try {
      return await this.factoryContract.isStockTokenized(stockSymbol);
    } catch (error) {
      console.error("Failed to check if stock is tokenized:", error);
      return false;
    }
  }

  // Event filtering methods
  async getStockTokenCreatedEvents(
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    try {
      const filter = this.factoryContract.filters.StockTokenCreated();
      const events = await this.factoryContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      return events.map(event => ({
        tokenAddress: event.args?.tokenAddress,
        stockSymbol: event.args?.stockSymbol,
        creator: event.args?.creator,
        totalSupply: event.args?.totalSupply?.toString(),
        companyName: event.args?.companyName,
        verificationHash: event.args?.verificationHash,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      }));

    } catch (error) {
      console.error("Failed to get StockTokenCreated events:", error);
      throw error;
    }
  }

  // Utility methods
  formatTokenAmount(amount: string, decimals: number = 18): string {
    return ethers.formatUnits(amount, decimals);
  }

  parseTokenAmount(amount: string, decimals: number = 18): string {
    return ethers.parseUnits(amount, decimals).toString();
  }

  generateVerificationHash(documentContent: string): string {
    return crypto.createHash('sha256').update(documentContent).digest('hex');
  }
}
