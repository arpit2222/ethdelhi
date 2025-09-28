"use client"

import React, { useState, useEffect } from 'react'
import { Plus, TrendingUp, DollarSign, Package, ExternalLink, Settings, BarChart3, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { WalletConnect } from '../../components/ui/wallet-connect'
import { ChainSelector } from '../../components/ui/chain-selector'
import { CrossChainPortfolio } from '../../components/ui/cross-chain-portfolio'
import { BridgeInterface } from '../../components/ui/bridge-interface'
import { TransactionStatus, TransactionStatusProps } from '../../components/ui/transaction-status'
import { useStockTokens, StockTokenData } from '../../hooks/useStockTokens'
import { useCrossChainBridge } from '../../hooks/useCrossChainBridge'
import Footer from '../component/Footer/Footer'

interface FormData {
  name: string;
  symbol: string;
  quantity: string;
  pricePerShare: string;
  stockSymbol: string;
  companyName: string;
  verificationDocumentHash: string;
  chainId: number;
  verified: boolean;
}

type TabType = 'portfolio' | 'bridge' | 'mint' | 'analytics';

export default function StocksPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('portfolio')
  const [isMintDialogOpen, setIsMintDialogOpen] = useState<boolean>(false)
  const [isBridgeDialogOpen, setIsBridgeDialogOpen] = useState<boolean>(false)
  const [selectedToken, setSelectedToken] = useState<StockTokenData | null>(null)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatusProps | null>(null)

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<FormData>({
    defaultValues: {
      name: '',
      symbol: '',
      quantity: '',
      pricePerShare: '',
      stockSymbol: '',
      companyName: '',
      verificationDocumentHash: '',
      chainId: 11155111, // Default to Sepolia
      verified: false,
    }
  })

  const { mintStockToken, isLoading: isMinting, error: mintError } = useStockTokens()
  const { activeTransfers } = useCrossChainBridge()

  const watchedChainId = watch('chainId')

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      setTransactionStatus({
        status: 'pending',
        transactionHash: undefined
      })

      const response = await mintStockToken({
        name: data.name,
        symbol: data.symbol,
        quantity: data.quantity,
        pricePerShare: data.pricePerShare,
        stockSymbol: data.stockSymbol,
        companyName: data.companyName,
        verificationDocumentHash: data.verificationDocumentHash,
        chainId: data.chainId,
      })

      if (response.success && response.token) {
        setTransactionStatus({
          status: 'success',
          transactionHash: response.token.transactionHash,
          
        })
        reset()
        setIsMintDialogOpen(false)
      } else {
        setTransactionStatus({
          status: 'error',
          transactionHash: undefined
        })
      }
    } catch (error) {
      setTransactionStatus({
        status: 'error',
        transactionHash: undefined
      })
    }
  }

  const handleBridgeToken = (token: StockTokenData) => {
    setSelectedToken(token)
    setIsBridgeDialogOpen(true)
  }

  const handleViewDetails = (token: StockTokenData) => {
    // TODO: Implement token details view
    console.log('View details for token:', token)
  }

  const handleBridgeComplete = (transferId: string) => {
    setIsBridgeDialogOpen(false)
    setSelectedToken(null)
    // TODO: Show success notification
    console.log('Bridge completed:', transferId)
  }

  const generateVerificationHash = (documentContent: string): string => {
    // Simple hash generation - in production, use crypto libraries
    let hash = 0
    for (let i = 0; i < documentContent.length; i++) {
      const char = documentContent.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: Package },
    { id: 'bridge', label: 'Bridge', icon: ArrowRightLeft },
    { id: 'mint', label: 'Mint Token', icon: Plus },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <main className="p-6 pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold">Cross-Chain RWA Portfolio</h1>
                <p className="text-gray-400 mt-2">Manage your tokenized real-world assets across 5 testnet chains</p>
              </div>
              <div className="flex items-center gap-3">
                <WalletConnect className="w-80" />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'portfolio' && (
            <CrossChainPortfolio
              onBridgeToken={handleBridgeToken}
              onViewDetails={handleViewDetails}
            />
          )}

          {activeTab === 'bridge' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BridgeInterface
                onBridgeComplete={handleBridgeComplete}
              />
              
              {/* Active Transfers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ArrowRightLeft className="w-5 h-5 mr-2" />
                    Active Bridge Transfers
                  </CardTitle>
                  <CardDescription>
                    Monitor your ongoing cross-chain transfers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeTransfers.length === 0 ? (
                    <div className="text-center py-8">
                      <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No active bridge transfers</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeTransfers.map((transfer) => (
                        <div key={transfer.transferId} className="p-4 bg-gray-800 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">Transfer #{transfer.transferId.slice(-8)}</p>
                              <p className="text-sm text-gray-400">
                                {transfer.amount} tokens
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              transfer.status === 'completed' ? 'bg-green-900 text-green-300' :
                              transfer.status === 'failed' ? 'bg-red-900 text-red-300' :
                              'bg-yellow-900 text-yellow-300'
                            }`}>
                              {transfer.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            <p>From: {transfer.sourceChain}</p>
                            <p>To: {transfer.destChain}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'mint' && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Mint New Stock Token
                  </CardTitle>
                  <CardDescription>
                    Tokenize a real-world asset on your selected blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Chain Selection */}
                    <div className="space-y-2">
                      <Label>Target Blockchain</Label>
                      <ChainSelector
                        selectedChainId={watchedChainId}
                        onChainSelect={(chainId) => {
                          // Update form value
                          const event = { target: { value: chainId } }
                          register('chainId').onChange(event)
                        }}
                        label="Select blockchain for tokenization"
                      />
                    </div>

                    {/* Stock Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stockSymbol">Stock Symbol</Label>
                        <Input
                          id="stockSymbol"
                          placeholder="e.g., AAPL"
                          {...register('stockSymbol', { required: 'Stock symbol is required' })}
                        />
                        {errors.stockSymbol && (
                          <p className="text-sm text-red-400">{errors.stockSymbol.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          placeholder="e.g., Apple Inc."
                          {...register('companyName', { required: 'Company name is required' })}
                        />
                        {errors.companyName && (
                          <p className="text-sm text-red-400">{errors.companyName.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Token Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Token Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Apple Stock Token"
                          {...register('name', { required: 'Token name is required' })}
                        />
                        {errors.name && (
                          <p className="text-sm text-red-400">{errors.name.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="symbol">Token Symbol</Label>
                        <Input
                          id="symbol"
                          placeholder="e.g., AST"
                          {...register('symbol', { required: 'Token symbol is required' })}
                        />
                        {errors.symbol && (
                          <p className="text-sm text-red-400">{errors.symbol.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Financial Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Number of Shares</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          placeholder="100"
                          {...register('quantity', {
                            required: 'Quantity is required',
                            valueAsNumber: true,
                            validate: (v) => (Number.isInteger(v) && v > 0) || 'Quantity must be a positive integer'
                          })}
                        />
                        {errors.quantity && (
                          <p className="text-sm text-red-400">{errors.quantity.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pricePerShare">Price per Share ($)</Label>
                        <Input
                          id="pricePerShare"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="175.50"
                          {...register('pricePerShare', {
                            required: 'Price per share is required',
                            valueAsNumber: true,
                            validate: (v) => (v > 0) || 'Price must be greater than 0'
                          })}
                        />
                        {errors.pricePerShare && (
                          <p className="text-sm text-red-400">{errors.pricePerShare.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Verification */}
                    <div className="space-y-2">
                      <Label htmlFor="verificationDocumentHash">Verification Document Hash</Label>
                      <Input
                        id="verificationDocumentHash"
                        placeholder="Enter document content to generate hash"
                        {...register('verificationDocumentHash', { required: 'Verification document hash is required' })}
                      />
                      {errors.verificationDocumentHash && (
                        <p className="text-sm text-red-400">{errors.verificationDocumentHash.message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        id="verified"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        {...register('verified', { required: 'Please confirm you have verified the documents' })}
                      />
                      <Label htmlFor="verified" className="text-sm text-gray-300">
                        I confirm I have verified the ownership/identity documents for this stock tokenization.
                      </Label>
                    </div>
                    {errors.verified && (
                      <p className="text-sm text-red-400">{errors.verified.message}</p>
                    )}
                    
                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="submit" 
                        disabled={isMinting}
                        className="flex-1"
                      >
                        {isMinting ? "Minting..." : "Mint Stock Token"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Portfolio Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">+12.5%</div>
                  <p className="text-xs text-gray-500">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cross-Chain Activity</CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeTransfers.length}</div>
                  <p className="text-xs text-gray-500">Active transfers</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Diversification</CardTitle>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                  <p className="text-xs text-gray-500">Supported chains</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transaction Status */}
          {transactionStatus && (
            <div className="fixed bottom-4 right-4 z-50">
              <TransactionStatus {...transactionStatus} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

