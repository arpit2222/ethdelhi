const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Chain configurations
const CHAIN_CONFIGS = {
  11155111: { // Ethereum Sepolia
    name: "Ethereum Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    explorer: "https://sepolia.etherscan.io"
  },
  44787: { // Celo Alfajores
    name: "Celo Alfajores",
    rpcUrl: process.env.CELO_ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org",
    explorer: "https://alfajores.celoscan.io"
  },
  10143: { // Monad Testnet
    name: "Monad Testnet",
    rpcUrl: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
    explorer: "https://testnet-explorer.monad.xyz"
  },
  128123: { // Etherlink Testnet
    name: "Etherlink Testnet",
    rpcUrl: process.env.ETHERLINK_TESTNET_RPC_URL || "https://node.ghostnet.etherlink.com",
    explorer: "https://testnet.explorer.etherlink.com"
  },
  1000: { // Polkadot Westend Asset Hub
    name: "Polkadot Westend Asset Hub",
    rpcUrl: process.env.POLKADOT_WESTEND_RPC_URL || "wss://westend-asset-hub-rpc.polkadot.io",
    explorer: "https://westend.subscan.io"
  }
};

async function deployToChain(chainId) {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  console.log(`\n🌐 Deploying to ${config.name} (Chain ID: ${chainId})`);
  console.log("=" * 60);

  // Create provider for this chain
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  
  // Get deployer account
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deploying with account:", wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.log("⚠️  Warning: Account has no balance. Deployment may fail.");
  }

  const deployments = {};

  try {
    // Deploy RWABridgeFactory
    console.log("\n📦 Deploying RWABridgeFactory...");
    const RWABridgeFactory = await ethers.getContractFactory("RWABridgeFactory");
    const bridgeFactory = await RWABridgeFactory.connect(wallet).deploy();
    await bridgeFactory.waitForDeployment();
    const bridgeFactoryAddress = await bridgeFactory.getAddress();
    deployments.RWABridgeFactory = bridgeFactoryAddress;
    console.log("✅ RWABridgeFactory deployed to:", bridgeFactoryAddress);

    // Deploy RWAEscrow (template)
    console.log("\n📦 Deploying RWAEscrow template...");
    const RWAEscrow = await ethers.getContractFactory("RWAEscrow");
    const escrowTemplate = await RWAEscrow.connect(wallet).deploy();
    await escrowTemplate.waitForDeployment();
    const escrowTemplateAddress = await escrowTemplate.getAddress();
    deployments.RWAEscrow = escrowTemplateAddress;
    console.log("✅ RWAEscrow template deployed to:", escrowTemplateAddress);

    // Add supported chains to factory
    console.log("\n🔗 Configuring supported chains...");
    const supportedChains = [11155111, 44787, 10143, 128123, 1000];
    
    for (const supportedChainId of supportedChains) {
      if (supportedChainId !== chainId) {
        // For cross-chain setup, we'll use placeholder addresses
        // In production, these would be actual deployed factory addresses
        const placeholderFactory = "0x0000000000000000000000000000000000000000";
        
        try {
          await bridgeFactory.connect(wallet).addSupportedChain(supportedChainId, placeholderFactory);
          console.log(`✅ Added chain ${supportedChainId} to supported chains`);
        } catch (error) {
          console.log(`⚠️  Could not add chain ${supportedChainId}:`, error.message);
        }
      }
    }

    // Verify deployments
    console.log("\n🔍 Verifying deployments...");
    const factoryCode = await provider.getCode(bridgeFactoryAddress);
    const escrowCode = await provider.getCode(escrowTemplateAddress);
    
    if (factoryCode === "0x") {
      throw new Error("RWABridgeFactory deployment failed");
    }
    if (escrowCode === "0x") {
      throw new Error("RWAEscrow deployment failed");
    }
    console.log("✅ All contracts verified");

    // Save deployment info
    const deploymentInfo = {
      chainId: chainId,
      chainName: config.name,
      deployer: wallet.address,
      contracts: deployments,
      deploymentTime: new Date().toISOString(),
      rpcUrl: config.rpcUrl,
      explorer: config.explorer
    };

    return deploymentInfo;

  } catch (error) {
    console.error(`❌ Deployment failed for chain ${chainId}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting multi-chain bridge deployment...");
  console.log("=" * 60);

  const targetChains = [11155111, 44787, 10143, 128123, 1000];
  const allDeployments = {};
  const successfulDeployments = [];
  const failedDeployments = [];

  // Deploy to each chain
  for (const chainId of targetChains) {
    try {
      const deployment = await deployToChain(chainId);
      allDeployments[chainId] = deployment;
      successfulDeployments.push(chainId);
    } catch (error) {
      failedDeployments.push({ chainId, error: error.message });
      console.error(`Failed to deploy to chain ${chainId}:`, error.message);
    }
  }

  // Generate environment file
  console.log("\n📝 Generating environment configuration...");
  const envContent = generateEnvContent(allDeployments);
  
  const envPath = path.join(__dirname, "..", ".env.bridge");
  try {
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Bridge environment variables written to .env.bridge");
  } catch (error) {
    console.log("⚠️  Could not write to .env.bridge:", error.message);
  }

  // Save deployment summary
  const deploymentSummary = {
    successfulDeployments,
    failedDeployments,
    deployments: allDeployments,
    summaryTime: new Date().toISOString()
  };

  const summaryPath = path.join(__dirname, "bridge-deployment-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(deploymentSummary, null, 2));
  console.log("✅ Deployment summary saved to bridge-deployment-summary.json");

  // Print summary
  printDeploymentSummary(allDeployments, successfulDeployments, failedDeployments);

  console.log("\n🎉 Multi-chain bridge deployment completed!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env files with the bridge contract addresses");
  console.log("2. Configure cross-chain resolver service");
  console.log("3. Test bridge functionality on each chain");
  console.log("4. Verify contracts on respective explorers");

  return deploymentSummary;
}

function generateEnvContent(deployments) {
  let content = "# Multi-Chain Bridge Configuration\n\n";
  
  Object.entries(deployments).forEach(([chainId, deployment]) => {
    const config = CHAIN_CONFIGS[chainId];
    content += `# ${config.name}\n`;
    content += `${config.name.toUpperCase().replace(/\s+/g, '_')}_RPC_URL=${config.rpcUrl}\n`;
    content += `${config.name.toUpperCase().replace(/\s+/g, '_')}_CHAIN_ID=${chainId}\n`;
    content += `${config.name.toUpperCase().replace(/\s+/g, '_')}_BRIDGE_FACTORY_ADDRESS=${deployment.contracts.RWABridgeFactory}\n`;
    content += `${config.name.toUpperCase().replace(/\s+/g, '_')}_RWA_ESCROW_ADDRESS=${deployment.contracts.RWAEscrow}\n\n`;
  });

  content += "# Bridge Configuration\n";
  content += "BRIDGE_MIN_TIMELOCK=3600\n";
  content += "BRIDGE_MAX_TIMELOCK=2592000\n";
  content += "BRIDGE_RESOLVER_SERVICE_URL=https://your-resolver-service.com\n";
  content += "BRIDGE_COORDINATION_ENDPOINT=https://your-coordination-service.com\n";

  return content;
}

function printDeploymentSummary(deployments, successful, failed) {
  console.log("\n📋 Deployment Summary:");
  console.log("=" * 80);
  
  console.log("\n✅ Successful Deployments:");
  successful.forEach(chainId => {
    const config = CHAIN_CONFIGS[chainId];
    const deployment = deployments[chainId];
    console.log(`\n${config.name} (${chainId}):`);
    console.log(`  RWABridgeFactory: ${deployment.contracts.RWABridgeFactory}`);
    console.log(`  RWAEscrow:        ${deployment.contracts.RWAEscrow}`);
    console.log(`  Explorer:         ${config.explorer}/address/${deployment.contracts.RWABridgeFactory}`);
  });

  if (failed.length > 0) {
    console.log("\n❌ Failed Deployments:");
    failed.forEach(({ chainId, error }) => {
      const config = CHAIN_CONFIGS[chainId];
      console.log(`\n${config.name} (${chainId}): ${error}`);
    });
  }

  console.log(`\n📊 Total: ${successful.length} successful, ${failed.length} failed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Multi-chain deployment failed:", error);
    process.exit(1);
  });
