#!/usr/bin/env node

/**
 * Real Cross-Chain Bridge Setup Script
 * 
 * This script helps you set up the bridge for REAL transactions:
 * 1. Deploy contracts to testnets
 * 2. Configure environment variables
 * 3. Set up wallet connections
 * 4. Test with real tokens
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require('readline');

// Testnet configurations
const TESTNETS = {
  11155111: { // Ethereum Sepolia
    name: "Ethereum Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    explorer: "https://sepolia.etherscan.io",
    faucet: "https://sepoliafaucet.com/",
    nativeToken: "ETH"
  },
  44787: { // Celo Alfajores
    name: "Celo Alfajores", 
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    explorer: "https://alfajores.celoscan.io",
    faucet: "https://faucet.celo.org/alfajores",
    nativeToken: "CELO"
  },
  80001: { // Polygon Mumbai (more reliable for testing)
    name: "Polygon Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    explorer: "https://mumbai.polygonscan.com",
    faucet: "https://faucet.polygon.technology/",
    nativeToken: "MATIC"
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function checkWallet() {
  console.log("\n🔑 WALLET SETUP");
  console.log("=" * 50);
  
  const privateKey = await question("Enter your private key (or press Enter to skip): ");
  if (!privateKey) {
    console.log("⚠️  No private key provided. You'll need to configure this manually.");
    return null;
  }
  
  try {
    const wallet = new ethers.Wallet(privateKey);
    console.log(`✅ Wallet address: ${wallet.address}`);
    return { wallet, privateKey };
  } catch (error) {
    console.log("❌ Invalid private key format");
    return null;
  }
}

async function checkRPCUrls() {
  console.log("\n🌐 RPC CONFIGURATION");
  console.log("=" * 50);
  
  const configs = {};
  
  for (const [chainId, config] of Object.entries(TESTNETS)) {
    console.log(`\n📡 ${config.name} (Chain ID: ${chainId})`);
    const customRpc = await question(`Custom RPC URL (or press Enter for default): `);
    configs[chainId] = {
      ...config,
      rpcUrl: customRpc || config.rpcUrl
    };
  }
  
  return configs;
}

async function deployContracts(wallet, chainConfigs) {
  console.log("\n📦 CONTRACT DEPLOYMENT");
  console.log("=" * 50);
  
  const deployments = {};
  
  for (const [chainId, config] of Object.entries(chainConfigs)) {
    console.log(`\n🚀 Deploying to ${config.name}...`);
    
    try {
      // Connect to the network
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const signer = wallet.connect(provider);
      
      // Check balance
      const balance = await provider.getBalance(wallet.address);
      const balanceEth = ethers.formatEther(balance);
      console.log(`💰 Balance: ${balanceEth} ${config.nativeToken}`);
      
      if (balance === 0n) {
        console.log(`⚠️  No ${config.nativeToken} balance! Get testnet tokens from: ${config.faucet}`);
        continue;
      }
      
      // Deploy RWABridgeFactory
      console.log("📦 Deploying RWABridgeFactory...");
      const RWABridgeFactory = await ethers.getContractFactory("RWABridgeFactory");
      const bridgeFactory = await RWABridgeFactory.connect(signer).deploy();
      await bridgeFactory.waitForDeployment();
      const bridgeFactoryAddress = await bridgeFactory.getAddress();
      
      // Deploy RWAEscrow template
      console.log("📦 Deploying RWAEscrow template...");
      const RWAEscrow = await ethers.getContractFactory("RWAEscrow");
      const escrowTemplate = await RWAEscrow.connect(signer).deploy();
      await escrowTemplate.waitForDeployment();
      const escrowTemplateAddress = await escrowTemplate.getAddress();
      
      deployments[chainId] = {
        chainId: parseInt(chainId),
        name: config.name,
        rpcUrl: config.rpcUrl,
        explorer: config.explorer,
        bridgeFactoryAddress,
        escrowTemplateAddress,
        deployedAt: new Date().toISOString()
      };
      
      console.log(`✅ Bridge Factory: ${bridgeFactoryAddress}`);
      console.log(`✅ Escrow Template: ${escrowTemplateAddress}`);
      console.log(`🔗 View on explorer: ${config.explorer}/address/${bridgeFactoryAddress}`);
      
    } catch (error) {
      console.log(`❌ Failed to deploy to ${config.name}: ${error.message}`);
    }
  }
  
  return deployments;
}

function generateEnvFile(deployments, privateKey) {
  console.log("\n📝 GENERATING ENVIRONMENT FILE");
  console.log("=" * 50);
  
  let envContent = "# Real Cross-Chain Bridge Configuration\n";
  envContent += "# Generated on: " + new Date().toISOString() + "\n\n";
  
  // Add wallet configuration
  if (privateKey) {
    envContent += "# Wallet Configuration\n";
    envContent += `PRIVATE_KEY=${privateKey}\n`;
    envContent += `PUBLIC_KEY=${new ethers.Wallet(privateKey).address}\n\n`;
  }
  
  // Add chain configurations
  for (const [chainId, deployment] of Object.entries(deployments)) {
    const config = TESTNETS[chainId];
    const prefix = config.name.toUpperCase().replace(/\s+/g, '_');
    
    envContent += `# ${config.name}\n`;
    envContent += `${prefix}_RPC_URL=${deployment.rpcUrl}\n`;
    envContent += `${prefix}_CHAIN_ID=${chainId}\n`;
    envContent += `${prefix}_BRIDGE_FACTORY_ADDRESS=${deployment.bridgeFactoryAddress}\n`;
    envContent += `${prefix}_RWA_ESCROW_ADDRESS=${deployment.escrowTemplateAddress}\n\n`;
  }
  
  // Add frontend environment variables
  envContent += "# Frontend Configuration\n";
  for (const [chainId, deployment] of Object.entries(deployments)) {
    const config = TESTNETS[chainId];
    const prefix = `NEXT_PUBLIC_${config.name.toUpperCase().replace(/\s+/g, '_')}`;
    
    envContent += `${prefix}_RPC_URL=${deployment.rpcUrl}\n`;
    envContent += `${prefix}_BRIDGE_FACTORY_ADDRESS=${deployment.bridgeFactoryAddress}\n`;
    envContent += `${prefix}_RWA_ESCROW_ADDRESS=${deployment.escrowTemplateAddress}\n`;
  }
  
  return envContent;
}

async function main() {
  console.log("🌉 REAL CROSS-CHAIN BRIDGE SETUP");
  console.log("=" * 60);
  console.log("This will help you set up REAL cross-chain transactions");
  console.log("You'll need:");
  console.log("1. A wallet with private key");
  console.log("2. Testnet tokens (ETH, CELO, MATIC)");
  console.log("3. RPC URLs for testnets");
  console.log("");
  
  const proceed = await question("Continue? (y/n): ");
  if (proceed.toLowerCase() !== 'y') {
    console.log("Setup cancelled.");
    rl.close();
    return;
  }
  
  try {
    // Step 1: Check wallet
    const walletInfo = await checkWallet();
    if (!walletInfo) {
      console.log("\n❌ Wallet setup failed. Please configure manually.");
      rl.close();
      return;
    }
    
    // Step 2: Configure RPC URLs
    const chainConfigs = await checkRPCUrls();
    
    // Step 3: Deploy contracts
    const deployments = await deployContracts(walletInfo.wallet, chainConfigs);
    
    if (Object.keys(deployments).length === 0) {
      console.log("\n❌ No contracts deployed. Check your wallet balance and RPC URLs.");
      rl.close();
      return;
    }
    
    // Step 4: Generate environment file
    const envContent = generateEnvFile(deployments, walletInfo.privateKey);
    
    // Save files
    const envPath = path.join(__dirname, "..", ".env.bridge");
    fs.writeFileSync(envPath, envContent);
    
    const summaryPath = path.join(__dirname, "real-bridge-deployment.json");
    fs.writeFileSync(summaryPath, JSON.stringify(deployments, null, 2));
    
    console.log(`\n✅ Environment file saved to: ${envPath}`);
    console.log(`✅ Deployment summary saved to: ${summaryPath}`);
    
    // Next steps
    console.log("\n🎉 SETUP COMPLETE!");
    console.log("=" * 50);
    console.log("Next steps:");
    console.log("1. Copy .env.bridge to your backend directory");
    console.log("2. Get testnet tokens from faucets:");
    for (const config of Object.values(TESTNETS)) {
      console.log(`   - ${config.name}: ${config.faucet}`);
    }
    console.log("3. Test the bridge with small amounts");
    console.log("4. Check transaction status on explorers");
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
