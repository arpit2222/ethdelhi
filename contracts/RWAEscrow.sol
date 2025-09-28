// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StockERC20.sol";

contract RWAEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum EscrowState {
        None,
        Initiated,
        Claimed,
        Refunded
    }

    struct EscrowData {
        address token;
        address initiator;
        address recipient;
        uint256 amount;
        bytes32 secretHash;
        uint256 timelock;
        uint256 initTimestamp;
        EscrowState state;
    }

    mapping(bytes32 => EscrowData) public escrows;
    mapping(address => bytes32[]) public userEscrows;
    
    uint256 public constant MIN_TIMELOCK = 1 hours;
    uint256 public constant MAX_TIMELOCK = 30 days;

    event EscrowInitiated(
        bytes32 indexed escrowId,
        address indexed token,
        address indexed initiator,
        address recipient,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock
    );

    event EscrowClaimed(
        bytes32 indexed escrowId,
        bytes32 secret,
        address indexed recipient
    );

    event EscrowRefunded(
        bytes32 indexed escrowId,
        address indexed initiator
    );

    modifier validEscrow(bytes32 escrowId) {
        require(escrows[escrowId].state != EscrowState.None, "RWAEscrow: Escrow does not exist");
        _;
    }

    modifier onlyInitiator(bytes32 escrowId) {
        require(escrows[escrowId].initiator == msg.sender, "RWAEscrow: Only initiator can perform this action");
        _;
    }

    modifier onlyRecipient(bytes32 escrowId) {
        require(escrows[escrowId].recipient == msg.sender, "RWAEscrow: Only recipient can perform this action");
        _;
    }

    function initiate(
        bytes32 escrowId,
        address token,
        address recipient,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock
    ) external nonReentrant {
        require(escrows[escrowId].state == EscrowState.None, "RWAEscrow: Escrow already exists");
        require(token != address(0), "RWAEscrow: Invalid token address");
        require(recipient != address(0), "RWAEscrow: Invalid recipient address");
        require(amount > 0, "RWAEscrow: Amount must be greater than zero");
        require(secretHash != bytes32(0), "RWAEscrow: Invalid secret hash");
        require(timelock >= MIN_TIMELOCK && timelock <= MAX_TIMELOCK, "RWAEscrow: Invalid timelock");

        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(msg.sender) >= amount, "RWAEscrow: Insufficient token balance");
        require(tokenContract.allowance(msg.sender, address(this)) >= amount, "RWAEscrow: Insufficient allowance");

        // Transfer tokens to escrow
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);

        // Create escrow data
        escrows[escrowId] = EscrowData({
            token: token,
            initiator: msg.sender,
            recipient: recipient,
            amount: amount,
            secretHash: secretHash,
            timelock: timelock,
            initTimestamp: block.timestamp,
            state: EscrowState.Initiated
        });

        userEscrows[msg.sender].push(escrowId);
        userEscrows[recipient].push(escrowId);

        emit EscrowInitiated(
            escrowId,
            token,
            msg.sender,
            recipient,
            amount,
            secretHash,
            timelock
        );
    }

    function claim(bytes32 escrowId, bytes32 secret) external nonReentrant validEscrow(escrowId) {
        EscrowData storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Initiated, "RWAEscrow: Escrow not in initiated state");
        require(escrow.recipient == msg.sender, "RWAEscrow: Only recipient can claim");
        
        // Verify secret matches hash
        require(keccak256(abi.encodePacked(secret)) == escrow.secretHash, "RWAEscrow: Invalid secret");

        escrow.state = EscrowState.Claimed;

        // Transfer tokens to recipient
        IERC20(escrow.token).safeTransfer(escrow.recipient, escrow.amount);

        emit EscrowClaimed(escrowId, secret, escrow.recipient);
    }

    function refund(bytes32 escrowId) external nonReentrant validEscrow(escrowId) {
        EscrowData storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Initiated, "RWAEscrow: Escrow not in initiated state");
        require(escrow.initiator == msg.sender, "RWAEscrow: Only initiator can refund");
        require(block.timestamp >= escrow.initTimestamp + escrow.timelock, "RWAEscrow: Timelock not expired");

        escrow.state = EscrowState.Refunded;

        // Transfer tokens back to initiator
        IERC20(escrow.token).safeTransfer(escrow.initiator, escrow.amount);

        emit EscrowRefunded(escrowId, escrow.initiator);
    }

    function getEscrow(bytes32 escrowId) external view returns (EscrowData memory) {
        return escrows[escrowId];
    }

    function getUserEscrows(address user) external view returns (bytes32[] memory) {
        return userEscrows[user];
    }

    function getEscrowState(bytes32 escrowId) external view returns (EscrowState) {
        return escrows[escrowId].state;
    }

    function isEscrowExpired(bytes32 escrowId) external view validEscrow(escrowId) returns (bool) {
        EscrowData storage escrow = escrows[escrowId];
        return block.timestamp >= escrow.initTimestamp + escrow.timelock;
    }

    function canRefund(bytes32 escrowId) external view validEscrow(escrowId) returns (bool) {
        EscrowData storage escrow = escrows[escrowId];
        return escrow.state == EscrowState.Initiated && 
               block.timestamp >= escrow.initTimestamp + escrow.timelock;
    }

    function getEscrowTimeRemaining(bytes32 escrowId) external view validEscrow(escrowId) returns (uint256) {
        EscrowData storage escrow = escrows[escrowId];
        if (escrow.state != EscrowState.Initiated) return 0;
        
        uint256 expirationTime = escrow.initTimestamp + escrow.timelock;
        if (block.timestamp >= expirationTime) return 0;
        
        return expirationTime - block.timestamp;
    }

    // Emergency function for owner to recover stuck tokens (only if escrow is in None state)
    function emergencyRecover(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "RWAEscrow: Invalid token address");
        IERC20(token).safeTransfer(owner(), amount);
    }
}
