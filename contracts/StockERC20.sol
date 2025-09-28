// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StockERC20 is ERC20, Ownable, ReentrancyGuard {
    struct StockMetadata {
        string stockSymbol;
        string companyName;
        string verificationHash;
        uint256 totalShares;
        uint256 pricePerShare;
        uint256 tokenizationDate;
        address creator;
    }

    StockMetadata public stockMetadata;
    mapping(address => bool) public authorizedMinters;

    event StockTokenized(address indexed to, uint256 amount, string stockSymbol);
    event StockBurned(address indexed from, uint256 amount, string stockSymbol);
    event AuthorizedMinterAdded(address indexed minter);
    event AuthorizedMinterRemoved(address indexed minter);

    modifier onlyAuthorized() {
        require(
            owner() == msg.sender || authorizedMinters[msg.sender],
            "StockERC20: Not authorized"
        );
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        StockMetadata memory _stockMetadata
    ) ERC20(name, symbol) {
        stockMetadata = _stockMetadata;
        _mint(msg.sender, initialSupply);
        emit StockTokenized(msg.sender, initialSupply, _stockMetadata.stockSymbol);
    }

    function mint(address to, uint256 amount) external onlyAuthorized nonReentrant {
        _mint(to, amount);
        emit StockTokenized(to, amount, stockMetadata.stockSymbol);
    }

    function burn(uint256 amount) external nonReentrant {
        _burn(msg.sender, amount);
        emit StockBurned(msg.sender, amount, stockMetadata.stockSymbol);
    }

    function burnFrom(address account, uint256 amount) external onlyAuthorized nonReentrant {
        _burn(account, amount);
        emit StockBurned(account, amount, stockMetadata.stockSymbol);
    }

    function addAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit AuthorizedMinterAdded(minter);
    }

    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit AuthorizedMinterRemoved(minter);
    }

    function getStockMetadata() external view returns (StockMetadata memory) {
        return stockMetadata;
    }

    function getStockSymbol() external view returns (string memory) {
        return stockMetadata.stockSymbol;
    }

    function getCompanyName() external view returns (string memory) {
        return stockMetadata.companyName;
    }

    function getVerificationHash() external view returns (string memory) {
        return stockMetadata.verificationHash;
    }

    function getTotalShares() external view returns (uint256) {
        return stockMetadata.totalShares;
    }

    function getPricePerShare() external view returns (uint256) {
        return stockMetadata.pricePerShare;
    }

    function getTokenizationDate() external view returns (uint256) {
        return stockMetadata.tokenizationDate;
    }

    function getCreator() external view returns (address) {
        return stockMetadata.creator;
    }
}
