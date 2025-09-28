# 🌉 Cross-Chain Trading Bot & Bridge

A comprehensive decentralized trading platform that enables cross-chain asset transfers, stock tokenization, and automated trading strategies with real-world asset (RWA) support.

## 🚀 Features

### Core Functionality
- **Cross-Chain Bridge**: Seamless token transfers between EVM and non-EVM chains
- **Stock Tokenization**: Convert real-world stocks into tradeable ERC20 tokens
- **Automated Trading**: AI-powered trading strategies with live simulation
- **Strategy Marketplace**: Buy, sell, and trade algorithmic trading strategies
- **Real-Time Monitoring**: Live portfolio tracking and performance analytics

### Supported Chains
- **EVM Chains**: Ethereum Sepolia, Arbitrum Sepolia, Polygon Mumbai
- **Non-EVM Chains**: Celo Alfajores, Polkadot Westend, Monad Testnet, Etherlink Testnet

## 🏗️ Architecture

### Cross-Chain Bridge System

The bridge implements a Hash Time-Locked Contract (HTLC) mechanism with competitive resolver selection:

![Cross-Chain Bridge Flow](https://via.placeholder.com/800x600/1a1a2e/ffffff?text=Cross-Chain+Bridge+Flow)

**Key Components:**
- **RWABridgeFactory**: Deploys escrow contracts for cross-chain transfers
- **RWAEscrow**: HTLC-based escrow contracts for atomic swaps
- **Resolver Service**: Competitive Dutch auction for optimal execution
- **Bridge Coordinator**: Orchestrates the entire cross-chain process

### Stock Tokenization Process

![Stock Tokenization Flow](https://via.placeholder.com/800x600/16213e/ffffff?text=Stock+Tokenization+Flow)

**Process Overview:**
1. User submits stock details and verification documents
2. Backend processes and stores documents on decentralized storage
3. Smart contract factory deploys new ERC20 token
4. Token metadata stored on OG Network
5. Optional linking to Strategy NFTs for trading strategies

### Trading Strategy System

![Trading Strategy Flow](https://via.placeholder.com/800x600/0f3460/ffffff?text=Trading+Strategy+Flow)

**Components:**
- **Strategy Generator**: AI-powered strategy creation
- **Live Simulation**: Real-time strategy testing
- **Strategy Marketplace**: NFT-based strategy trading
- **Performance Analytics**: Comprehensive strategy metrics

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library
- **State Management**: React hooks and context

### Backend
- **Language**: Python 3.9+
- **Framework**: FastAPI
- **Blockchain**: Web3.py, Ethers.js
- **Storage**: IPFS/OG Network for decentralized storage

### Smart Contracts
- **Language**: Solidity
- **Framework**: Hardhat
- **Standards**: ERC20, ERC721, ERC1155
- **Patterns**: Factory, Proxy, Escrow

### Infrastructure
- **Deployment**: Vercel (Frontend), Railway/Heroku (Backend)
- **Monitoring**: Custom status logging
- **APIs**: 1inch, Pyth Network, ZeroG

## 📁 Project Structure

```
ethglobal-trading-bot/
├── ethdelhi/                    # Main application
│   ├── src/                     # Frontend source
│   │   ├── app/                 # Next.js app router
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks
│   │   └── lib/                 # Utilities and configs
│   ├── backend/                 # Python backend
│   │   ├── src/                 # Backend source
│   │   │   ├── bridge_coordinator.py
│   │   │   ├── resolver_service.py
│   │   │   ├── trading_strategy.py
│   │   │   └── ...
│   │   └── requirements.txt
│   ├── contracts/               # Smart contracts
│   │   ├── RWABridgeFactory.sol
│   │   ├── RWAEscrow.sol
│   │   ├── StockERC20.sol
│   │   └── StrategyINFT.sol
│   └── pages/api/               # API routes
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Git
- MetaMask or compatible wallet

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/eth-trading-bot.git
cd eth-trading-bot/ethdelhi
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
cp env.example .env.local
cp env.bridge.example .env.bridge
```

5. **Start the development servers**
```bash
# Frontend (Terminal 1)
npm run dev

# Backend (Terminal 2)
cd backend
python -m src.main
```

### Environment Setup

Create `.env.local` with:
```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY=your_private_key
```

Create `.env.bridge` with:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
ARBITRUM_RPC_URL=https://arbitrum-sepolia.infura.io/v3/your_key
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
```

## 🔧 Usage

### Cross-Chain Bridge

1. **Access the bridge interface**
   - Navigate to `/bridge` in the application
   - Connect your wallet to the source chain

2. **Initiate a transfer**
   - Select source and destination chains
   - Enter amount and recipient address
   - Confirm the transaction

3. **Monitor progress**
   - View real-time transaction status
   - Check explorer links for verification
   - Receive notifications on completion

### Stock Tokenization

1. **Navigate to stock tokenization**
   - Go to `/stokes` page
   - Connect your wallet to Sepolia

2. **Submit stock details**
   - Fill in stock information
   - Upload verification documents
   - Submit the tokenization request

3. **Deploy and trade**
   - Wait for contract deployment
   - View your tokenized stock
   - Start trading on the marketplace

### Trading Strategies

1. **Create a strategy**
   - Use the AI strategy generator
   - Customize parameters and rules
   - Test with live simulation

2. **Deploy and monetize**
   - Mint as Strategy NFT
   - List on the marketplace
   - Earn from strategy usage

## 🔒 Security Features

### Smart Contract Security
- **HTLC Escrows**: Atomic cross-chain swaps
- **Time Locks**: Automatic refund mechanisms
- **Multi-signature**: Enhanced security for large transfers
- **Audit Ready**: Clean, documented code

### Bridge Security
- **Competitive Resolvers**: Decentralized execution
- **Dutch Auctions**: Fair pricing mechanisms
- **Secret Sharing**: Cryptographic security
- **State Verification**: On-chain validation

## 📊 API Endpoints

### Bridge API
- `POST /api/bridge/initiate-transfer` - Start cross-chain transfer
- `POST /api/bridge/execute-transfer` - Execute the transfer
- `GET /api/bridge/status` - Check transfer status
- `POST /api/bridge/resolver-bid` - Submit resolver bid

### Trading API
- `POST /api/trading/mint-stock-token` - Tokenize a stock
- `POST /api/trading/strategy-executor` - Execute trading strategy
- `GET /api/trading/live-simulation` - Get simulation data
- `POST /api/trading/mint-strategy-inft` - Mint strategy NFT

### Bot API
- `POST /api/bot/start` - Start trading bot
- `POST /api/bot/stop` - Stop trading bot
- `GET /api/bot-status` - Get bot status

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests
npm run test

# Contract tests
cd contracts
npx hardhat test
```

### Simulation Mode
```bash
# Run bridge simulator
cd backend/src
python interactive_bridge.py

# Run trading simulator
python real_time_trader.py
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
vercel --prod
```

### Backend (Railway/Heroku)
```bash
# Railway
railway login
railway link
railway up

# Heroku
heroku create your-app-name
git push heroku main
```

### Smart Contracts
```bash
# Deploy to testnets
cd contracts
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/deploy.js --network celo
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript/Python best practices
- Write comprehensive tests
- Update documentation
- Ensure security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **1inch Protocol** for DEX aggregation
- **Pyth Network** for price feeds
- **ZeroG Network** for decentralized storage
- **OpenZeppelin** for secure smart contract libraries
- **Ethereum Foundation** for blockchain infrastructure

