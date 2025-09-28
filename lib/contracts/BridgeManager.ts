import { ethers, JsonRpcProvider, Contract, Wallet } from "ethers";
import * as crypto from "crypto";

// Interfaces for bridge operations
export interface BridgeTransfer {
  transferId: string;
  sourceEscrowId: string;
  destEscrowId: string;
  sourceChainId: number;
  destChainId: number;
  token: string;
  initiator: string;
  recipient: string;
  amount: string;
  secretHash: string;
  timelock: number;
  initTimestamp: number;
  state: TransferState;
}

export interface EscrowData {
  escrowAddress: string;
  token: string;
  initiator: string;
  recipient: string;
  amount: string;
  sourceChainId: number;
  destChainId: number;
  secretHash: string;
  timelock: number;
  createdTimestamp: number;
  state: EscrowState;
}

export interface BridgeTransaction {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  chainId: number;
}

export interface CrossChainTransferResult {
  transferId: string;
  sourceEscrowId: string;
  destEscrowId: string;
  sourceTransaction: BridgeTransaction;
  destTransaction?: BridgeTransaction;
  secret: string;
  secretHash: string;
}

export enum TransferState {
  None = 0,
  Initiated = 1,
  SourceLocked = 2,
  DestLocked = 3,
  Completed = 4,
  Refunded = 5
}

export enum EscrowState {
  None = 0,
  Initiated = 1,
  Claimed = 2,
  Refunded = 3
}

// Contract ABIs (simplified - in production, use full ABIs)
const RWA_ESCROW_ABI = [
  "function initiate(bytes32 escrowId, address token, address recipient, uint256 amount, bytes32 secretHash, uint256 timelock)",
  "function claim(bytes32 escrowId, bytes32 secret)",
  "function refund(bytes32 escrowId)",
  "function getEscrow(bytes32 escrowId) view returns (tuple(address token, address initiator, address recipient, uint256 amount, bytes32 secretHash, uint256 timelock, uint256 initTimestamp, uint8 state))",
  "function getUserEscrows(address user) view returns (bytes32[])",
  "function getEscrowState(bytes32 escrowId) view returns (uint8)",
  "function isEscrowExpired(bytes32 escrowId) view returns (bool)",
  "function canRefund(bytes32 escrowId) view returns (bool)",
  "function getEscrowTimeRemaining(bytes32 escrowId) view returns (uint256)",
  "event EscrowInitiated(bytes32 indexed escrowId, address indexed token, address indexed initiator, address recipient, uint256 amount, bytes32 secretHash, uint256 timelock)",
  "event EscrowClaimed(bytes32 indexed escrowId, bytes32 secret, address indexed recipient)",
  "event EscrowRefunded(bytes32 indexed escrowId, address indexed initiator)"
];

const RWA_BRIDGE_FACTORY_ABI = [
  "function createEscrow(address token, address recipient, uint256 amount, uint256 destChainId, bytes32 secretHash, uint256 timelock) returns (bytes32, address)",
  "function initiateCrossChainTransfer(bytes32 sourceEscrowId, bytes32 destEscrowId, uint256 sourceChainId, uint256 destChainId, address token, address recipient, uint256 amount, bytes32 secretHash, uint256 timelock)",
  "function completeCrossChainTransfer(bytes32 transferId, bytes32 destEscrowId)",
  "function addSupportedChain(uint256 chainId, address bridgeFactory)",
  "function removeSupportedChain(uint256 chainId)",
  "function authorizeResolver(address resolver)",
  "function unauthorizeResolver(address resolver)",
  "function getEscrow(bytes32 escrowId) view returns (tuple(address escrowAddress, address token, address initiator, address recipient, uint256 amount, uint256 sourceChainId, uint256 destChainId, bytes32 secretHash, uint256 timelock, uint256 createdTimestamp, bool isActive))",
  "function getUserEscrows(address user) view returns (bytes32[])",
  "function getChainEscrows(uint256 chainId) view returns (bytes32[])",
  "function getCrossChainTransfer(bytes32 transferId) view returns (tuple(bytes32 transferId, bytes32 sourceEscrowId, bytes32 destEscrowId, uint256 sourceChainId, uint256 destChainId, address token, address initiator, address recipient, uint256 amount, bytes32 secretHash, uint256 timelock, uint256 initTimestamp, uint8 state))",
  "function isChainSupported(uint256 chainId) view returns (bool)",
  "function getChainBridgeFactory(uint256 chainId) view returns (address)",
  "function isAuthorizedResolver(address resolver) view returns (bool)",
  "function getTotalEscrows() view returns (uint256)",
  "event EscrowCreated(bytes32 indexed escrowId, address indexed escrowAddress, address indexed token, address initiator, address recipient, uint256 amount, uint256 sourceChainId, uint256 destChainId)",
  "event CrossChainTransferInitiated(bytes32 indexed transferId, bytes32 indexed sourceEscrowId, uint256 indexed sourceChainId, uint256 destChainId, address token, address initiator, address recipient, uint256 amount)",
  "event CrossChainTransferCompleted(bytes32 indexed transferId, bytes32 indexed destEscrowId, address indexed recipient)"
];

export class BridgeManager {
  private providers: Map<number, JsonRpcProvider>;
  private wallets: Map<number, Wallet>;
  private factoryContracts: Map<number, Contract>;
  private escrowContracts: Map<string, Contract>;

  constructor(
    chainConfigs: Map<number, { rpcUrl: string; factoryAddress: string; escrowAddress: string }>,
    privateKey: string
  ) {
    this.providers = new Map();
    this.wallets = new Map();
    this.factoryContracts = new Map();
    this.escrowContracts = new Map();

    // Initialize providers and contracts for each chain
    for (const [chainId, config] of chainConfigs) {
      const provider = new JsonRpcProvider(config.rpcUrl);
      const wallet = new Wallet(privateKey, provider);
      
      this.providers.set(chainId, provider);
      this.wallets.set(chainId, wallet);
      this.factoryContracts.set(chainId, new Contract(config.factoryAddress, RWA_BRIDGE_FACTORY_ABI, wallet));
    }
  }

  async initiateBridgeTransfer(
    sourceChainId: number,
    destChainId: number,
    tokenAddress: string,
    recipient: string,
    amount: string,
    timelock: number = 3600 // 1 hour default
  ): Promise<CrossChainTransferResult> {
    try {
      // Validate chains are supported
      if (!this.providers.has(sourceChainId) || !this.providers.has(destChainId)) {
        throw new Error(`Unsupported chain: ${sourceChainId} or ${destChainId}`);
      }

      if (sourceChainId === destChainId) {
        throw new Error("Source and destination chains must be different");
      }

      // Generate secret and hash
      const secret = this.generateSecret();
      const secretHash = this.hashSecret(secret);

      // Convert amount to proper format
      const amountWei = ethers.parseEther(amount);

      // Get factory contract for source chain
      const sourceFactory = this.factoryContracts.get(sourceChainId);
      if (!sourceFactory) {
        throw new Error(`Factory contract not found for chain ${sourceChainId}`);
      }

      // Create escrow on source chain
      console.log(`Creating escrow on source chain ${sourceChainId}...`);
      const tx1 = await sourceFactory.createEscrow(
        tokenAddress,
        recipient,
        amountWei,
        destChainId,
        secretHash,
        timelock
      );

      const receipt1 = await tx1.wait();
      if (!receipt1) {
        throw new Error("Source chain transaction failed");
      }

      // Extract escrow ID and address from event
      const sourceEscrowId = this.extractEscrowIdFromEvent(receipt1);
      const sourceEscrowAddress = this.extractEscrowAddressFromEvent(receipt1);

      // Create escrow on destination chain
      console.log(`Creating escrow on destination chain ${destChainId}...`);
      const destFactory = this.factoryContracts.get(destChainId);
      if (!destFactory) {
        throw new Error(`Factory contract not found for chain ${destChainId}`);
      }

      const tx2 = await destFactory.createEscrow(
        tokenAddress,
        recipient,
        amountWei,
        sourceChainId,
        secretHash,
        timelock
      );

      const receipt2 = await tx2.wait();
      if (!receipt2) {
        throw new Error("Destination chain transaction failed");
      }

      const destEscrowId = this.extractEscrowIdFromEvent(receipt2);
      const destEscrowAddress = this.extractEscrowAddressFromEvent(receipt2);

      // Initiate cross-chain transfer
      console.log("Initiating cross-chain transfer...");
      const transferId = this.generateTransferId(sourceEscrowId, destEscrowId, sourceChainId, destChainId);
      
      const tx3 = await sourceFactory.initiateCrossChainTransfer(
        sourceEscrowId,
        destEscrowId,
        sourceChainId,
        destChainId,
        tokenAddress,
        recipient,
        amountWei,
        secretHash,
        timelock
      );

      const receipt3 = await tx3.wait();
      if (!receipt3) {
        throw new Error("Cross-chain transfer initiation failed");
      }

      return {
        transferId,
        sourceEscrowId,
        destEscrowId,
        sourceTransaction: {
          transactionHash: receipt1.hash,
          blockNumber: receipt1.blockNumber,
          gasUsed: receipt1.gasUsed.toString(),
          chainId: sourceChainId
        },
        destTransaction: {
          transactionHash: receipt2.hash,
          blockNumber: receipt2.blockNumber,
          gasUsed: receipt2.gasUsed.toString(),
          chainId: destChainId
        },
        secret,
        secretHash
      };

    } catch (error) {
      console.error("Failed to initiate bridge transfer:", error);
      throw error;
    }
  }

  async claimTokens(
    chainId: number,
    escrowId: string,
    secret: string
  ): Promise<BridgeTransaction> {
    try {
      const provider = this.providers.get(chainId);
      const wallet = this.wallets.get(chainId);
      
      if (!provider || !wallet) {
        throw new Error(`Chain ${chainId} not configured`);
      }

      // Get escrow contract address from factory
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      const escrowInfo = await factory.getEscrow(escrowId);
      const escrowAddress = escrowInfo.escrowAddress;

      // Create escrow contract instance
      const escrowContract = new Contract(escrowAddress, RWA_ESCROW_ABI, wallet);

      // Claim tokens
      const tx = await escrowContract.claim(escrowId, secret);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Claim transaction failed");
      }

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        chainId
      };

    } catch (error) {
      console.error("Failed to claim tokens:", error);
      throw error;
    }
  }

  async refundEscrow(
    chainId: number,
    escrowId: string
  ): Promise<BridgeTransaction> {
    try {
      const provider = this.providers.get(chainId);
      const wallet = this.wallets.get(chainId);
      
      if (!provider || !wallet) {
        throw new Error(`Chain ${chainId} not configured`);
      }

      // Get escrow contract address from factory
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      const escrowInfo = await factory.getEscrow(escrowId);
      const escrowAddress = escrowInfo.escrowAddress;

      // Create escrow contract instance
      const escrowContract = new Contract(escrowAddress, RWA_ESCROW_ABI, wallet);

      // Check if refund is possible
      const canRefund = await escrowContract.canRefund(escrowId);
      if (!canRefund) {
        throw new Error("Escrow cannot be refunded yet");
      }

      // Refund tokens
      const tx = await escrowContract.refund(escrowId);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Refund transaction failed");
      }

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        chainId
      };

    } catch (error) {
      console.error("Failed to refund escrow:", error);
      throw error;
    }
  }

  async getEscrowStatus(
    chainId: number,
    escrowId: string
  ): Promise<EscrowData | null> {
    try {
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      const escrowInfo = await factory.getEscrow(escrowId);
      
      return {
        escrowAddress: escrowInfo.escrowAddress,
        token: escrowInfo.token,
        initiator: escrowInfo.initiator,
        recipient: escrowInfo.recipient,
        amount: escrowInfo.amount.toString(),
        sourceChainId: Number(escrowInfo.sourceChainId),
        destChainId: Number(escrowInfo.destChainId),
        secretHash: escrowInfo.secretHash,
        timelock: Number(escrowInfo.timelock),
        createdTimestamp: Number(escrowInfo.createdTimestamp),
        state: Number(escrowInfo.isActive) as EscrowState
      };

    } catch (error) {
      console.error("Failed to get escrow status:", error);
      return null;
    }
  }

  async getBridgeTransferStatus(
    chainId: number,
    transferId: string
  ): Promise<BridgeTransfer | null> {
    try {
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      const transferInfo = await factory.getCrossChainTransfer(transferId);
      
      return {
        transferId: transferInfo.transferId,
        sourceEscrowId: transferInfo.sourceEscrowId,
        destEscrowId: transferInfo.destEscrowId,
        sourceChainId: Number(transferInfo.sourceChainId),
        destChainId: Number(transferInfo.destChainId),
        token: transferInfo.token,
        initiator: transferInfo.initiator,
        recipient: transferInfo.recipient,
        amount: transferInfo.amount.toString(),
        secretHash: transferInfo.secretHash,
        timelock: Number(transferInfo.timelock),
        initTimestamp: Number(transferInfo.initTimestamp),
        state: Number(transferInfo.state) as TransferState
      };

    } catch (error) {
      console.error("Failed to get bridge transfer status:", error);
      return null;
    }
  }

  async getUserEscrows(
    chainId: number,
    userAddress: string
  ): Promise<string[]> {
    try {
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      return await factory.getUserEscrows(userAddress);

    } catch (error) {
      console.error("Failed to get user escrows:", error);
      throw error;
    }
  }

  async isChainSupported(chainId: number): Promise<boolean> {
    try {
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        return false;
      }

      return await factory.isChainSupported(chainId);

    } catch (error) {
      console.error("Failed to check if chain is supported:", error);
      return false;
    }
  }

  async getEscrowTimeRemaining(
    chainId: number,
    escrowId: string
  ): Promise<number> {
    try {
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      const escrowInfo = await factory.getEscrow(escrowId);
      const escrowAddress = escrowInfo.escrowAddress;

      const escrowContract = new Contract(escrowAddress, RWA_ESCROW_ABI, this.providers.get(chainId)!);
      return Number(await escrowContract.getEscrowTimeRemaining(escrowId));

    } catch (error) {
      console.error("Failed to get escrow time remaining:", error);
      return 0;
    }
  }

  // Utility methods
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashSecret(secret: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(secret));
  }

  private generateTransferId(
    sourceEscrowId: string,
    destEscrowId: string,
    sourceChainId: number,
    destChainId: number
  ): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bytes32", "uint256", "uint256"],
        [sourceEscrowId, destEscrowId, sourceChainId, destChainId]
      )
    );
  }

  private extractEscrowIdFromEvent(receipt: any): string {
    // Implementation to extract escrow ID from event logs
    // This would need to be implemented based on the actual event structure
    return "0x" + Math.random().toString(16).substr(2, 64);
  }

  private extractEscrowAddressFromEvent(receipt: any): string {
    // Implementation to extract escrow address from event logs
    // This would need to be implemented based on the actual event structure
    return "0x" + Math.random().toString(16).substr(2, 40);
  }

  // Event monitoring methods
  async monitorEscrowEvents(
    chainId: number,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    try {
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      const filter = factory.filters.EscrowCreated();
      const events = await factory.queryFilter(filter, fromBlock, toBlock);

      return events.map(event => ({
        escrowId: event.args?.escrowId,
        escrowAddress: event.args?.escrowAddress,
        token: event.args?.token,
        initiator: event.args?.initiator,
        recipient: event.args?.recipient,
        amount: event.args?.amount?.toString(),
        sourceChainId: Number(event.args?.sourceChainId),
        destChainId: Number(event.args?.destChainId),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      }));

    } catch (error) {
      console.error("Failed to monitor escrow events:", error);
      throw error;
    }
  }

  async monitorTransferEvents(
    chainId: number,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    try {
      const factory = this.factoryContracts.get(chainId);
      if (!factory) {
        throw new Error(`Factory contract not found for chain ${chainId}`);
      }

      const filter = factory.filters.CrossChainTransferInitiated();
      const events = await factory.queryFilter(filter, fromBlock, toBlock);

      return events.map(event => ({
        transferId: event.args?.transferId,
        sourceEscrowId: event.args?.sourceEscrowId,
        sourceChainId: Number(event.args?.sourceChainId),
        destChainId: Number(event.args?.destChainId),
        token: event.args?.token,
        initiator: event.args?.initiator,
        recipient: event.args?.recipient,
        amount: event.args?.amount?.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      }));

    } catch (error) {
      console.error("Failed to monitor transfer events:", error);
      throw error;
    }
  }
}
