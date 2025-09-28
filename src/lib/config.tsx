import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

// Define custom chains for bridge support
export const celoAlfajores = defineChain({
  id: 44787,
  name: 'Celo Alfajores',
  nativeCurrency: {
    decimals: 18,
    name: 'Celo',
    symbol: 'CELO',
  },
  rpcUrls: {
    default: {
      http: [process.env.CELO_ALFAJORES_RPC_URL || 'https://alfajores-forno.celo-testnet.org'],
    },
    public: {
      http: [process.env.CELO_ALFAJORES_RPC_URL || 'https://alfajores-forno.celo-testnet.org'],
    },
  },
  blockExplorers: {
    default: { name: 'CeloScan', url: 'https://alfajores.celoscan.io' },
  },
  testnet: true,
});

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: [process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet-explorer.monad.xyz' },
  },
  testnet: true,
});

export const etherlinkTestnet = defineChain({
  id: 128123,
  name: 'Etherlink Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Etherlink',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: {
      http: [process.env.ETHERLINK_TESTNET_RPC_URL || 'https://node.ghostnet.etherlink.com'],
    },
    public: {
      http: [process.env.ETHERLINK_TESTNET_RPC_URL || 'https://node.ghostnet.etherlink.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherlink Explorer', url: 'https://testnet.explorer.etherlink.com' },
  },
  testnet: true,
});

export const polkadotWestend = defineChain({
  id: 1000,
  name: 'Polkadot Westend Asset Hub',
  nativeCurrency: {
    decimals: 10,
    name: 'Westend',
    symbol: 'WND',
  },
  rpcUrls: {
    default: {
      http: [process.env.POLKADOT_WESTEND_RPC_URL || 'wss://westend-asset-hub-rpc.polkadot.io'],
    },
    public: {
      http: [process.env.POLKADOT_WESTEND_RPC_URL || 'wss://westend-asset-hub-rpc.polkadot.io'],
    },
  },
  blockExplorers: {
    default: { name: 'Subscan', url: 'https://westend.subscan.io' },
  },
  testnet: true,
});

// Contract addresses for stock tokenization
export const CONTRACT_ADDRESSES = {
  STOCK_TOKEN_FACTORY: process.env.NEXT_PUBLIC_STOCK_TOKEN_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
  STRATEGY_INFT: process.env.NEXT_PUBLIC_STRATEGY_INFT_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const;

// Bridge contract addresses
export const BRIDGE_CONTRACT_ADDRESSES = {
  // Ethereum Sepolia
  [sepolia.id]: {
    RWA_BRIDGE_FACTORY: process.env.SEPOLIA_BRIDGE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
    RWA_ESCROW: process.env.SEPOLIA_RWA_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000",
  },
  // Celo Alfajores
  [celoAlfajores.id]: {
    RWA_BRIDGE_FACTORY: process.env.CELO_ALFAJORES_BRIDGE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
    RWA_ESCROW: process.env.CELO_ALFAJORES_RWA_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000",
  },
  // Monad Testnet
  [monadTestnet.id]: {
    RWA_BRIDGE_FACTORY: process.env.MONAD_TESTNET_BRIDGE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
    RWA_ESCROW: process.env.MONAD_TESTNET_RWA_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000",
  },
  // Etherlink Testnet
  [etherlinkTestnet.id]: {
    RWA_BRIDGE_FACTORY: process.env.ETHERLINK_TESTNET_BRIDGE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
    RWA_ESCROW: process.env.ETHERLINK_TESTNET_RWA_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000",
  },
  // Polkadot Westend Asset Hub
  [polkadotWestend.id]: {
    RWA_BRIDGE_FACTORY: process.env.POLKADOT_WESTEND_BRIDGE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
    RWA_ESCROW: process.env.POLKADOT_WESTEND_RWA_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000",
  },
} as const;

// Supported chains for bridge
export const SUPPORTED_CHAINS = [
  sepolia,
  celoAlfajores,
  monadTestnet,
  etherlinkTestnet,
  polkadotWestend,
] as const;

export const config = createConfig({
  chains: SUPPORTED_CHAINS,
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID' }),
  ],
  transports: {
    [sepolia.id]: http(),
    [celoAlfajores.id]: http(),
    [monadTestnet.id]: http(),
    [etherlinkTestnet.id]: http(),
    [polkadotWestend.id]: http(),
  },
});

// Contract configuration for type-safe interactions
export const contractConfig = {
  stockTokenFactory: {
    address: CONTRACT_ADDRESSES.STOCK_TOKEN_FACTORY,
    abi: [], // Add ABI here when available
  },
  strategyINFT: {
    address: CONTRACT_ADDRESSES.STRATEGY_INFT,
    abi: [], // Add ABI here when available
  },
} as const;
