"use client"

import React, { useEffect, useState } from 'react'
import { Plus, TrendingUp, DollarSign, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import Footer from '../component/Footer/Footer'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

interface Stock {
  id: number;
  name: string;
  price: number;
  quantity: number;
  totalValue: number;
  minted: boolean;
}

interface FormData {
  name: string;
  price: number;
  quantity: number;
  verified: boolean;
}

export default function StocksPage(): JSX.Element {
  const { address, isConnected } = useAccount()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      price: 0,
      quantity: 0,
      verified: false,
    }
  })

  const onSubmit = async (data: FormData): Promise<void> => {
    const baseItem = {
      name: data.name,
      price: data.price,
      quantity: data.quantity,
      minted: false,
    }

    // If connected, persist via API, else just update local state
    if (isConnected && address) {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/og-storage/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: address, item: baseItem }),
        })
        if (!res.ok) throw new Error(`Failed to save (${res.status})`)
        const json = await res.json()
        const items = Array.isArray(json?.items) ? json.items : []
        const mapped: Stock[] = items.map((it: any, idx: number) => ({
          id: Date.now() + idx,
          name: String(it?.name ?? ''),
          price: Number(it?.price ?? 0),
          quantity: Number(it?.quantity ?? 0),
          totalValue: Number(it?.price ?? 0) * Number(it?.quantity ?? 0),
          minted: Boolean(it?.minted ?? false),
        }))
        setStocks(mapped)
      } catch (e: any) {
        setError(e?.message || 'Failed to save to storage; added locally instead')
        const newStock: Stock = {
          id: Date.now(),
          name: baseItem.name,
          price: baseItem.price,
          quantity: baseItem.quantity,
          totalValue: baseItem.price * baseItem.quantity,
          minted: baseItem.minted,
        }
        setStocks(prev => [...prev, newStock])
      } finally {
        setLoading(false)
      }
    } else {
      const newStock: Stock = {
        id: Date.now(),
        name: baseItem.name,
        price: baseItem.price,
        quantity: baseItem.quantity,
        totalValue: baseItem.price * baseItem.quantity,
        minted: baseItem.minted,
      }
      setStocks(prev => [...prev, newStock])
    }

    reset()
    setIsDialogOpen(false)
  }

  // Load from 0G-like storage via API when connected
  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!isConnected || !address) return
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ wallet: address })
        const res = await fetch(`/api/og-storage/portfolio?${params.toString()}`)
        if (!res.ok) throw new Error(`Failed to load portfolio (${res.status})`)
        const json = await res.json()
        // Expect shape: { key: `${address}_total_shares`, items: [{ name, price, quantity, minted }] }
        const items = Array.isArray(json?.items) ? json.items : []
        const mapped: Stock[] = items.map((it: any, idx: number) => ({
          id: Date.now() + idx,
          name: String(it?.name ?? ""),
          price: Number(it?.price ?? 0),
          quantity: Number(it?.quantity ?? 0),
          totalValue: Number(it?.price ?? 0) * Number(it?.quantity ?? 0),
          minted: Boolean(it?.minted ?? false),
        }))
        setStocks(mapped)
      } catch (e: any) {
        setError(e?.message || 'Unable to load portfolio')
      } finally {
        setLoading(false)
      }
    }
    fetchPortfolio()
  }, [isConnected, address])

  const totalPortfolioValue = stocks.reduce((sum: number, stock: Stock) => sum + stock.totalValue, 0)

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <main className="p-6 ">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">Stock Portfolio</h1>
            <div className="ml-auto">
              {!isConnected ? (
                <ConnectButton />
              ) : (
                <Button type="button" onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-3 sm:px-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stock
                </Button>
              )}
            </div>
          </div>
          <p className="text-gray-400 mt-2">Manage your stock investments</p>
        </div>
        {/* Add Stock Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Stock</DialogTitle>
              <DialogDescription>
                Enter the details of the stock you want to add to your portfolio.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Stock Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Apple Inc."
                  {...register('name', { required: 'Stock name is required' })}
                />
                {errors.name && (<p className="text-sm text-red-400">{errors.name.message}</p>)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Share ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('price', {
                    required: 'Price is required',
                    valueAsNumber: true,
                    validate: (v) => (v > 0) || 'Price must be greater than 0'
                  })}
                />
                {errors.price && (<p className="text-sm text-red-400">{errors.price.message}</p>)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Number of Shares</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="0"
                  {...register('quantity', {
                    required: 'Quantity is required',
                    valueAsNumber: true,
                    validate: (v) => (Number.isInteger(v) && v > 0) || 'Quantity must be a positive integer'
                  })}
                />
                {errors.quantity && (<p className="text-sm text-red-400">{errors.quantity.message}</p>)}
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
              {errors.verified && (<p className="text-sm text-red-400">{errors.verified.message}</p>)}
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Add Stock
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                ${totalPortfolioValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
              <Package className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stocks.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stocks.reduce((sum: number, stock: Stock) => sum + stock.quantity, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Stocks Grid */}
        {isConnected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              {loading ? (
                <>
                  <h3 className="text-lg font-medium text-gray-400 mb-2">Loading your portfolio…</h3>
                  <p className="text-gray-500">Please wait</p>
                </>
              ) : error ? (
                <>
                  <h3 className="text-lg font-medium text-red-400 mb-2">{error}</h3>
                  <p className="text-gray-500">Try again later or add a stock manually</p>
                  <Button type="button" onClick={() => setIsDialogOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stock
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No stocks added yet</h3>
                  <p className="text-gray-500 mb-4">Click the button below to add your first stock</p>
                  <Button type="button" onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stock
                  </Button>
                </>
              )}
            </div>
          ) : (
            stocks.map((stock) => (
              <Card key={stock.id} className="hover:bg-gray-700 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{stock.name}</CardTitle>
                  <CardDescription>
                    Stock Investment {stock.minted ? '(Minted)' : '(Not minted)'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Price per Share</span>
                    <span className="font-medium">${stock.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Shares Owned</span>
                    <span className="font-medium">{stock.quantity}</span>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Value</span>
                      <span className="text-lg font-bold text-green-400">
                        ${stock.totalValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Connect your wallet to view your tokenized stocks</h3>
              <p className="text-gray-500 mb-6">We'll fetch your portfolio from 0G Network storage</p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
