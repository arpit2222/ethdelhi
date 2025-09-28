const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of Stock Tokenization contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy StockTokenFactory
  console.log("\n📦 Deploying StockTokenFactory...");
  const StockTokenFactory = await ethers.getContractFactory("StockTokenFactory");
  const factory = await StockTokenFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ StockTokenFactory deployed to:", factoryAddress);

  // Deploy StrategyINFT (if not already deployed)
  console.log("\n📦 Deploying StrategyINFT...");
  const StrategyINFT = await ethers.getContractFactory("StrategyINFT");
  const mockOracle = "0x0000000000000000000000000000000000000000"; // Mock oracle address
  const platformWallet = deployer.address; // Use deployer as platform wallet
  const strategyINFT = await StrategyINFT.deploy(
    "Strategy INFT",
    "SINFT",
    mockOracle,
    platformWallet
  );
  await strategyINFT.waitForDeployment();
  const strategyINFTAddress = await strategyINFT.getAddress();
  console.log("✅ StrategyINFT deployed to:", strategyINFTAddress);

  // Link factory with StrategyINFT
  console.log("\n🔗 Linking Factory with StrategyINFT...");
  await factory.setStrategyINFTContract(strategyINFTAddress);
  console.log("✅ Factory linked with StrategyINFT");

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  const factoryCode = await deployer.provider.getCode(factoryAddress);
  const strategyINFTCode = await deployer.provider.getCode(strategyINFTAddress);
  
  if (factoryCode === "0x") {
    throw new Error("Factory contract deployment failed");
  }
  if (strategyINFTCode === "0x") {
    throw new Error("StrategyINFT contract deployment failed");
  }
  console.log("✅ All contracts verified");

  // Save deployment addresses
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    contracts: {
      StockTokenFactory: factoryAddress,
      StrategyINFT: strategyINFTAddress
    },
    deploymentTime: new Date().toISOString(),
    gasUsed: {
      StockTokenFactory: "estimated",
      StrategyINFT: "estimated"
    }
  };

  const envPath = path.join(__dirname, "..", ".env.local");
  const envContent = `
# Stock Tokenization Contract Addresses
NEXT_PUBLIC_STOCK_TOKEN_FACTORY_ADDRESS=${factoryAddress}
NEXT_PUBLIC_STRATEGY_INFT_ADDRESS=${strategyINFTAddress}

# Sepolia Testnet Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_CHAIN_ID=11155111

# Wallet Configuration
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

# 0G Network Configuration
ZERO_G_RPC_URL=YOUR_ZERO_G_ENDPOINT
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID
`;

  // Write to .env.local
  try {
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Environment variables written to .env.local");
  } catch (error) {
    console.log("⚠️  Could not write to .env.local:", error.message);
  }

  // Write deployment info to file
  const deploymentPath = path.join(__dirname, "deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to deployment-info.json");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Summary:");
  console.log("┌─────────────────────────┬──────────────────────────────────────────────┐");
  console.log("│ Contract                │ Address                                      │");
  console.log("├─────────────────────────┼──────────────────────────────────────────────┤");
  console.log(`│ StockTokenFactory       │ ${factoryAddress} │`);
  console.log(`│ StrategyINFT            │ ${strategyINFTAddress} │`);
  console.log("└─────────────────────────┴──────────────────────────────────────────────┘");

  console.log("\n🔗 Etherscan Links:");
  console.log(`StockTokenFactory: https://sepolia.etherscan.io/address/${factoryAddress}`);
  console.log(`StrategyINFT: https://sepolia.etherscan.io/address/${strategyINFTAddress}`);

  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env file with the contract addresses");
  console.log("2. Fund the contracts if needed");
  console.log("3. Test the tokenization functionality");
  console.log("4. Verify contracts on Etherscan (optional)");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
