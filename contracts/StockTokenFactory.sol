// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./StockERC20.sol";

contract StockTokenFactory is Ownable, ReentrancyGuard {
    struct TokenMetadata {
        address tokenAddress;
        string stockSymbol;
        string companyName;
        string verificationHash;
        uint256 totalSupply;
        uint256 tokenizationDate;
        address creator;
    }

    mapping(string => address) public stockTokens; // stockSymbol => tokenAddress
    mapping(address => address[]) public userTokens; // user => tokenAddress[]
    mapping(address => TokenMetadata) public tokenMetadata; // tokenAddress => metadata
    mapping(address => bool) public authorizedFactories;

    address public strategyINFTContract;

    event StockTokenCreated(
        address indexed tokenAddress,
        string indexed stockSymbol,
        address indexed creator,
        uint256 totalSupply,
        string companyName,
        string verificationHash
    );

    event StockTokenLinked(
        address indexed tokenAddress,
        uint256 indexed strategyTokenId
    );

    event StrategyINFTContractUpdated(
        address indexed oldContract,
        address indexed newContract
    );

    modifier onlyAuthorized() {
        require(
            owner() == msg.sender || authorizedFactories[msg.sender],
            "StockTokenFactory: Not authorized"
        );
        _;
    }

    constructor() {}

    function createStockToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory stockSymbol,
        string memory companyName,
        string memory verificationHash,
        uint256 pricePerShare
    ) external nonReentrant returns (address) {
        require(stockTokens[stockSymbol] == address(0), "StockTokenFactory: Stock already tokenized");
        require(bytes(stockSymbol).length > 0, "StockTokenFactory: Invalid stock symbol");
        require(initialSupply > 0, "StockTokenFactory: Invalid supply");

        StockERC20.StockMetadata memory metadata = StockERC20.StockMetadata({
            stockSymbol: stockSymbol,
            companyName: companyName,
            verificationHash: verificationHash,
            totalShares: initialSupply,
            pricePerShare: pricePerShare,
            tokenizationDate: block.timestamp,
            creator: msg.sender
        });

        StockERC20 newToken = new StockERC20(name, symbol, initialSupply, metadata);
        address tokenAddress = address(newToken);

        stockTokens[stockSymbol] = tokenAddress;
        userTokens[msg.sender].push(tokenAddress);

        tokenMetadata[tokenAddress] = TokenMetadata({
            tokenAddress: tokenAddress,
            stockSymbol: stockSymbol,
            companyName: companyName,
            verificationHash: verificationHash,
            totalSupply: initialSupply,
            tokenizationDate: block.timestamp,
            creator: msg.sender
        });

        emit StockTokenCreated(
            tokenAddress,
            stockSymbol,
            msg.sender,
            initialSupply,
            companyName,
            verificationHash
        );

        return tokenAddress;
    }

    function linkToStrategyINFT(
        address stockTokenAddress,
        uint256 strategyTokenId
    ) external onlyAuthorized {
        require(stockTokenAddress != address(0), "StockTokenFactory: Invalid token address");
        require(tokenMetadata[stockTokenAddress].tokenAddress != address(0), "StockTokenFactory: Token not found");

        // Call the StrategyINFT contract to create the link
        (bool success, ) = strategyINFTContract.call(
            abi.encodeWithSignature(
                "linkStockToken(uint256,address)",
                strategyTokenId,
                stockTokenAddress
            )
        );

        require(success, "StockTokenFactory: Failed to link to StrategyINFT");

        emit StockTokenLinked(stockTokenAddress, strategyTokenId);
    }

    function setStrategyINFTContract(address _strategyINFTContract) external onlyOwner {
        address oldContract = strategyINFTContract;
        strategyINFTContract = _strategyINFTContract;
        emit StrategyINFTContractUpdated(oldContract, _strategyINFTContract);
    }

    function addAuthorizedFactory(address factory) external onlyOwner {
        authorizedFactories[factory] = true;
    }

    function removeAuthorizedFactory(address factory) external onlyOwner {
        authorizedFactories[factory] = false;
    }

    function getUserStockTokens(address user) external view returns (address[] memory) {
        return userTokens[user];
    }

    function getStockTokenBySymbol(string memory stockSymbol) external view returns (address) {
        return stockTokens[stockSymbol];
    }

    function getTokenMetadata(address tokenAddress) external view returns (TokenMetadata memory) {
        return tokenMetadata[tokenAddress];
    }

    function isStockTokenized(string memory stockSymbol) external view returns (bool) {
        return stockTokens[stockSymbol] != address(0);
    }

    function getTotalUserTokens(address user) external view returns (uint256) {
        return userTokens[user].length;
    }

    function getAllStockSymbols() external view returns (string[] memory) {
        // Note: This is expensive and should be used carefully
        // In production, consider using events for indexing
        return new string[](0); // Placeholder - implement with off-chain indexing
    }
}
