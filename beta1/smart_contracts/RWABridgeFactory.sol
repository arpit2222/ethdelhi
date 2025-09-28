// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./RWAEscrow.sol";

contract RWABridgeFactory is Ownable, ReentrancyGuard {
    struct EscrowInfo {
        address escrowAddress;
        address token;
        address initiator;
        address recipient;
        uint256 amount;
        uint256 sourceChainId;
        uint256 destChainId;
        bytes32 secretHash;
        uint256 timelock;
        uint256 createdTimestamp;
        bool isActive;
    }

    struct CrossChainTransfer {
        bytes32 transferId;
        bytes32 sourceEscrowId;
        bytes32 destEscrowId;
        uint256 sourceChainId;
        uint256 destChainId;
        address token;
        address initiator;
        address recipient;
        uint256 amount;
        bytes32 secretHash;
        uint256 timelock;
        uint256 initTimestamp;
        TransferState state;
    }

    enum TransferState {
        None,
        Initiated,
        SourceLocked,
        DestLocked,
        Completed,
        Refunded
    }

    mapping(bytes32 => EscrowInfo) public escrows;
    mapping(address => bytes32[]) public userEscrows;
    mapping(uint256 => bytes32[]) public chainEscrows;
    mapping(bytes32 => CrossChainTransfer) public crossChainTransfers;
    mapping(uint256 => bool) public supportedChains;
    mapping(uint256 => address) public chainBridgeFactories;
    mapping(address => bool) public authorizedResolvers;

    uint256 public constant MIN_TIMELOCK = 1 hours;
    uint256 public constant MAX_TIMELOCK = 30 days;
    uint256 public constant MAX_CHAIN_ID = 1000000;

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed escrowAddress,
        address indexed token,
        address initiator,
        address recipient,
        uint256 amount,
        uint256 sourceChainId,
        uint256 destChainId
    );

    event CrossChainTransferInitiated(
        bytes32 indexed transferId,
        bytes32 indexed sourceEscrowId,
        uint256 indexed sourceChainId,
        uint256 destChainId,
        address token,
        address initiator,
        address recipient,
        uint256 amount
    );

    event CrossChainTransferCompleted(
        bytes32 indexed transferId,
        bytes32 indexed destEscrowId,
        address indexed recipient
    );

    event ChainSupported(
        uint256 indexed chainId,
        address indexed bridgeFactory
    );

    event ChainUnsupported(
        uint256 indexed chainId
    );

    event ResolverAuthorized(
        address indexed resolver
    );

    event ResolverUnauthorized(
        address indexed resolver
    );

    modifier onlyAuthorized() {
        require(
            owner() == msg.sender || authorizedResolvers[msg.sender],
            "RWABridgeFactory: Not authorized"
        );
        _;
    }

    modifier validChain(uint256 chainId) {
        require(chainId > 0 && chainId <= MAX_CHAIN_ID, "RWABridgeFactory: Invalid chain ID");
        _;
    }

    constructor() {}

    function createEscrow(
        address token,
        address recipient,
        uint256 amount,
        uint256 destChainId,
        bytes32 secretHash,
        uint256 timelock
    ) external nonReentrant validChain(destChainId) returns (bytes32 escrowId, address escrowAddress) {
        require(token != address(0), "RWABridgeFactory: Invalid token address");
        require(recipient != address(0), "RWABridgeFactory: Invalid recipient address");
        require(amount > 0, "RWABridgeFactory: Amount must be greater than zero");
        require(supportedChains[destChainId], "RWABridgeFactory: Destination chain not supported");
        require(timelock >= MIN_TIMELOCK && timelock <= MAX_TIMELOCK, "RWABridgeFactory: Invalid timelock");

        // Generate unique escrow ID
        escrowId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            recipient,
            amount,
            destChainId,
            secretHash,
            timelock,
            block.timestamp,
            block.number
        ));

        require(escrows[escrowId].escrowAddress == address(0), "RWABridgeFactory: Escrow already exists");

        // Deploy new RWAEscrow instance
        RWAEscrow newEscrow = new RWAEscrow();
        escrowAddress = address(newEscrow);

        // Store escrow information
        escrows[escrowId] = EscrowInfo({
            escrowAddress: escrowAddress,
            token: token,
            initiator: msg.sender,
            recipient: recipient,
            amount: amount,
            sourceChainId: block.chainid,
            destChainId: destChainId,
            secretHash: secretHash,
            timelock: timelock,
            createdTimestamp: block.timestamp,
            isActive: true
        });

        userEscrows[msg.sender].push(escrowId);
        chainEscrows[block.chainid].push(escrowId);

        emit EscrowCreated(
            escrowId,
            escrowAddress,
            token,
            msg.sender,
            recipient,
            amount,
            block.chainid,
            destChainId
        );
    }

    function initiateCrossChainTransfer(
        bytes32 sourceEscrowId,
        bytes32 destEscrowId,
        uint256 sourceChainId,
        uint256 destChainId,
        address token,
        address recipient,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock
    ) external nonReentrant validChain(sourceChainId) validChain(destChainId) {
        require(sourceChainId != destChainId, "RWABridgeFactory: Source and destination chains must be different");
        require(escrows[sourceEscrowId].isActive, "RWABridgeFactory: Source escrow not active");
        require(supportedChains[destChainId], "RWABridgeFactory: Destination chain not supported");

        bytes32 transferId = keccak256(abi.encodePacked(
            sourceEscrowId,
            destEscrowId,
            sourceChainId,
            destChainId,
            block.timestamp
        ));

        require(crossChainTransfers[transferId].state == TransferState.None, "RWABridgeFactory: Transfer already exists");

        crossChainTransfers[transferId] = CrossChainTransfer({
            transferId: transferId,
            sourceEscrowId: sourceEscrowId,
            destEscrowId: destEscrowId,
            sourceChainId: sourceChainId,
            destChainId: destChainId,
            token: token,
            initiator: msg.sender,
            recipient: recipient,
            amount: amount,
            secretHash: secretHash,
            timelock: timelock,
            initTimestamp: block.timestamp,
            state: TransferState.Initiated
        });

        emit CrossChainTransferInitiated(
            transferId,
            sourceEscrowId,
            sourceChainId,
            destChainId,
            token,
            msg.sender,
            recipient,
            amount
        );
    }

    function completeCrossChainTransfer(
        bytes32 transferId,
        bytes32 destEscrowId
    ) external onlyAuthorized {
        CrossChainTransfer storage transfer = crossChainTransfers[transferId];
        require(transfer.state == TransferState.Initiated, "RWABridgeFactory: Transfer not in initiated state");

        transfer.state = TransferState.Completed;

        emit CrossChainTransferCompleted(
            transferId,
            destEscrowId,
            transfer.recipient
        );
    }

    function addSupportedChain(
        uint256 chainId,
        address bridgeFactory
    ) external onlyOwner validChain(chainId) {
        supportedChains[chainId] = true;
        chainBridgeFactories[chainId] = bridgeFactory;
        emit ChainSupported(chainId, bridgeFactory);
    }

    function removeSupportedChain(uint256 chainId) external onlyOwner validChain(chainId) {
        supportedChains[chainId] = false;
        chainBridgeFactories[chainId] = address(0);
        emit ChainUnsupported(chainId);
    }

    function authorizeResolver(address resolver) external onlyOwner {
        require(resolver != address(0), "RWABridgeFactory: Invalid resolver address");
        authorizedResolvers[resolver] = true;
        emit ResolverAuthorized(resolver);
    }

    function unauthorizeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = false;
        emit ResolverUnauthorized(resolver);
    }

    function getEscrow(bytes32 escrowId) external view returns (EscrowInfo memory) {
        return escrows[escrowId];
    }

    function getUserEscrows(address user) external view returns (bytes32[] memory) {
        return userEscrows[user];
    }

    function getChainEscrows(uint256 chainId) external view returns (bytes32[] memory) {
        return chainEscrows[chainId];
    }

    function getCrossChainTransfer(bytes32 transferId) external view returns (CrossChainTransfer memory) {
        return crossChainTransfers[transferId];
    }

    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    function getChainBridgeFactory(uint256 chainId) external view returns (address) {
        return chainBridgeFactories[chainId];
    }

    function isAuthorizedResolver(address resolver) external view returns (bool) {
        return authorizedResolvers[resolver];
    }

    function getTotalEscrows() external view returns (uint256) {
        return chainEscrows[block.chainid].length;
    }

    function getTotalCrossChainTransfers() external view returns (uint256) {
        // Note: This is expensive and should be used carefully
        // In production, consider using events for indexing
        return 0; // Placeholder - implement with off-chain indexing
    }

    // Batch operations for efficiency
    function batchCreateEscrows(
        address[] memory tokens,
        address[] memory recipients,
        uint256[] memory amounts,
        uint256[] memory destChainIds,
        bytes32[] memory secretHashes,
        uint256[] memory timelocks
    ) external nonReentrant returns (bytes32[] memory escrowIds, address[] memory escrowAddresses) {
        require(tokens.length == recipients.length, "RWABridgeFactory: Arrays length mismatch");
        require(tokens.length == amounts.length, "RWABridgeFactory: Arrays length mismatch");
        require(tokens.length == destChainIds.length, "RWABridgeFactory: Arrays length mismatch");
        require(tokens.length == secretHashes.length, "RWABridgeFactory: Arrays length mismatch");
        require(tokens.length == timelocks.length, "RWABridgeFactory: Arrays length mismatch");

        escrowIds = new bytes32[](tokens.length);
        escrowAddresses = new address[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            (escrowIds[i], escrowAddresses[i]) = createEscrow(
                tokens[i],
                recipients[i],
                amounts[i],
                destChainIds[i],
                secretHashes[i],
                timelocks[i]
            );
        }
    }
}

