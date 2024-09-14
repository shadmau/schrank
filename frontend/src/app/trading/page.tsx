"use client";

import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { LockIcon, ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Mock data
const mockCollection = {
  id: '123',
  name: 'Mock Collection',
  floorPrice: 1.5,
  floorPriceChange: 0.05,
  highPrice: 2.0,
  lowPrice: 1.2,
  volume: 100,
  bidDepth: 5,
  bidPrice: 1.45,
}

const mockChartData = Array.from({ length: 100 }, (_, i) => ({
  time: new Date(Date.now() - (99 - i) * 15 * 60 * 1000).toISOString(),
  price: Math.random() * 100 + 50,
}))

const mockOrderbook = {
  bids: Array.from({ length: 10 }, (_, i) => ({ price: (100 - i * 0.5).toFixed(2), amount: (Math.random() * 10 + 1).toFixed(2), total: ((100 - i * 0.5) * (Math.random() * 10 + 1)).toFixed(2) })),
  asks: Array.from({ length: 10 }, (_, i) => ({ price: (100 + (i + 1) * 0.5).toFixed(2), amount: (Math.random() * 10 + 1).toFixed(2), total: ((100 + (i + 1) * 0.5) * (Math.random() * 10 + 1)).toFixed(2) }))
}

const mockTrades = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  price: (Math.random() * 100 + 50).toFixed(2),
  amount: (Math.random() * 5 + 0.1).toFixed(2),
  time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
  type: Math.random() > 0.5 ? 'buy' : 'sell'
}))

const mockNews = [
  { id: 1, text: "BAYC announces new partnership", link: "#" },
  { id: 2, text: "Ethereum gas fees hit new low", link: "#" },
  { id: 3, text: "NFT market shows signs of recovery", link: "#" },
  { id: 4, text: "Major auction house to accept BAYC bids", link: "#" },
  { id: 5, text: "BAYC floor price reaches 100 ETH", link: "#" },
]

const TradingInterfaceClient = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const collectionId = searchParams.get('id')

  const [collection, setCollection] = useState<any>(null)
  const [orderType, setOrderType] = useState('limit')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellAmount, setSellAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('orderbook')
  const [newsIndex, setNewsIndex] = useState(0)

  useEffect(() => {
    // Simulate fetching collection data
    setCollection(mockCollection)

    // Commented out API fetch for future use
    // const fetchCollectionData = async () => {
    //   if (!collectionId) return
    //   try {
    //     const response = await fetch(`/api/collections/${collectionId}`)
    //     if (!response.ok) {
    //       throw new Error('Failed to fetch collection data')
    //     }
    //     const data = await response.json()
    //     setCollection(data)
    //   } catch (error) {
    //     console.error('Error fetching collection data:', error)
    //     setError('Failed to load collection data')
    //   }
    // }
    // fetchCollectionData()
  }, [collectionId])

  const handleOrder = (action: 'buy' | 'sell') => {
    setIsLoading(true)
    setError(null)
    setTimeout(() => {
      setIsLoading(false)
      setError('This feature is not available yet.')
    }, 1000)
  }

  const handleBack = () => {
    router.back()
  }

  const calculateBidAskRatio = () => {
    const totalBids = mockOrderbook.bids.reduce((sum, bid) => sum + parseFloat(bid.amount), 0)
    const totalAsks = mockOrderbook.asks.reduce((sum, ask) => sum + parseFloat(ask.amount), 0)
    const total = totalBids + totalAsks
    const bidPercentage = (totalBids / total * 100).toFixed(0)
    const askPercentage = (totalAsks / total * 100).toFixed(0)
    return { bidPercentage, askPercentage }
  }

  const { bidPercentage, askPercentage } = calculateBidAskRatio()

  if (!collection) {
    return <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <header className="bg-gray-800 p-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <span className="font-bold">{collection.name}/ETH</span>
          <span className="font-bold text-lg">{collection.floorPrice.toFixed(4)}</span>
          <span className={collection.floorPriceChange >= 0 ? "text-green-500" : "text-red-500"}>
            {(collection.floorPriceChange * 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div><span className="text-gray-400 mr-1">24h High</span>{collection.highPrice.toFixed(4)}</div>
          <div><span className="text-gray-400 mr-1">24h Low</span>{collection.lowPrice.toFixed(4)}</div>
          <div><span className="text-gray-400 mr-1">24h Volume</span>{collection.volume.toFixed(2)} ETH</div>
        </div>
      </header>

      <div className="bg-gray-800 p-2 overflow-hidden whitespace-nowrap border-t border-b border-gray-700">
        <div className="animate-marquee inline-block">
          {mockNews.map((item) => (
            <a key={item.id} href={item.link} className="text-blue-400 hover:text-blue-300 mr-8">
              {item.text}
            </a>
          ))}
        </div>
      </div>

      <main className="flex-grow flex">
        {/* Left column: Chart and Trading Interface */}
        <div className="w-3/4 p-4">
          <div className="h-[400px] bg-gray-800 rounded-lg mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} itemStyle={{ color: '#E5E7EB' }} />
                <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center z-10 rounded-lg">
                <LockIcon className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-400">Feature not enabled yet</span>
              </div>
              <h3 className="text-sm font-semibold mb-1">Buy {collection.name}</h3>
              <Tabs value={orderType} onValueChange={setOrderType} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="limit" className="flex-1">Limit</TabsTrigger>
                  <TabsTrigger value="market" className="flex-1">Market</TabsTrigger>
                </TabsList>
                <TabsContent value="limit" className="space-y-1">
                  <Input type="number" placeholder="Price" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className="h-8" />
                  <Input type="number" placeholder="Amount" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} className="h-8" />
                  <Button className="w-full h-8 bg-green-600 hover:bg-green-700" onClick={() => handleOrder('buy')} disabled={isLoading}>
                    {isLoading ? <Skeleton className="h-4 w-20" /> : 'Buy {collection.name}'}
                  </Button>
                </TabsContent>
                <TabsContent value="market" className="space-y-1">
                  <Input type="number" placeholder="Amount" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} className="h-8" />
                  <Button className="w-full h-8 bg-green-600 hover:bg-green-700" onClick={() => handleOrder('buy')} disabled={isLoading}>
                    {isLoading ? <Skeleton className="h-4 w-20" /> : 'Buy {collection.name}'}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center z-10 rounded-lg">
                <LockIcon className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-400">Feature not enabled yet</span>
              </div>
              <h3 className="text-sm font-semibold mb-1">Sell {collection.name}</h3>
              <Tabs value={orderType} onValueChange={setOrderType} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="limit" className="flex-1">Limit</TabsTrigger>
                  <TabsTrigger value="market" className="flex-1">Market</TabsTrigger>
                </TabsList>
                <TabsContent value="limit" className="space-y-1">
                  <Input type="number" placeholder="Price" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="h-8" />
                  <Input type="number" placeholder="Amount" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} className="h-8" />
                  <Button className="w-full h-8 bg-red-600 hover:bg-red-700" onClick={() => handleOrder('sell')} disabled={isLoading}>
                    {isLoading ? <Skeleton className="h-4 w-20" /> : 'Sell {collection.name}'}
                  </Button>
                </TabsContent>
                <TabsContent value="market" className="space-y-1">
                  <Input type="number" placeholder="Amount" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} className="h-8" />
                  <Button className="w-full h-8 bg-red-600 hover:bg-red-700" onClick={() => handleOrder('sell')} disabled={isLoading}>
                    {isLoading ? <Skeleton className="h-4 w-20" /> : 'Sell {collection.name}'}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
        </div>

        {/* Right column: Orderbook and Market Trades */}
        <div className="w-1/4 p-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-2 bg-gray-700 p-0.5 rounded-md">
                <TabsTrigger 
                  value="orderbook" 
                  className="flex-1 text-xs py-1 px-2 data-[state=active]:bg-gray-600 data-[state=active]:text-white rounded transition-all duration-200 ease-in-out"
                >
                  Order Book
                </TabsTrigger>
                <TabsTrigger 
                  value="trades" 
                  className="flex-1 text-xs py-1 px-2 data-[state=active]:bg-gray-600 data-[state=active]:text-white rounded transition-all duration-200 ease-in-out"
                >
                  Market Trades
                </TabsTrigger>
              </TabsList>
              <TabsContent value="orderbook">
                <div className="flex">
                  <div className="w-1/2 pr-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Price</span>
                      <span>Amount</span>
                      <span>Total</span>
                    </div>
                    {mockOrderbook.asks.reverse().map((ask, index) => (
                      <div key={index} className="flex justify-between text-xs mb-1 relative">
                        <span className="text-red-500">{ask.price}</span>
                        <span>{ask.amount}</span>
                        <span>{ask.total}</span>
                        <div 
                          className="absolute inset-0 bg-red-500 opacity-10" 
                          style={{width: `${(parseFloat(ask.amount) / 10) * 100}%`, zIndex: 0}}
                        ></div>
                      </div>
                    ))}
                  </div>
                  <div className="w-1/2 pl-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Price</span>
                      <span>Amount</span>
                      <span>Total</span>
                    </div>
                    {mockOrderbook.bids.map((bid, index) => (
                      <div key={index} className="flex justify-between text-xs mb-1 relative">
                        <span className="text-green-500">{bid.price}</span>
                        <span>{bid.amount}</span>
                        <span>{bid.total}</span>
                        <div 
                          className="absolute inset-0 bg-green-500 opacity-10" 
                          style={{width: `${(parseFloat(bid.amount) / 10) * 100}%`, zIndex: 0}}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-center items-center text-xs">
                  <div className="bg-red-500 px-2 py-1 rounded-l">{bidPercentage}% bids</div>
                  <div className="bg-green-500 px-2 py-1 rounded-r">{askPercentage}% asks</div>
                </div>
              </TabsContent>
              <TabsContent value="trades">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1">
                    {mockTrades.map((trade) => (
                      <div key={trade.id} className="flex justify-between text-xs">
                        <span className={`w-1/3 ${trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.price}
                        </span>
                        <span className="w-1/3 text-center">{trade.amount}</span>
                        <span className="w-1/3 text-right text-gray-400">{trade.time}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function TradingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TradingInterfaceClient />
    </Suspense>
  )
}