
'use client'
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, TrendingUp, TrendingDown, ChevronRight, Star, BarChart2, BookOpen, Activity, Settings, DollarSign, Users, CreditCard, Package2 } from 'lucide-react'
import TradingChart from '@/components/TradingChart';
type CheckedState = boolean | 'indeterminate';


// Mock data (unchanged)
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

const mockWatchlist = [
  { symbol: "BAYC/ETH", price: "95.5000", change: "+2.5%" },
  { symbol: "MAYC/ETH", price: "45.2300", change: "+1.2%" },
  { symbol: "BAKC/ETH", price: "8.7500", change: "-0.5%" },
  { symbol: "PUNK/ETH", price: "65.1000", change: "+3.7%" },
  { symbol: "AZUKI/ETH", price: "12.3000", change: "-2.1%" },
]

const mockOpenOrders = [
  { id: 1, type: 'buy', price: '94.5000', amount: '1.5000', total: '141.7500', status: 'open', timestamp: '2023-06-05T14:30:00Z' },
  { id: 2, type: 'sell', price: '96.0000', amount: '0.5000', total: '48.0000', status: 'open', timestamp: '2023-06-05T15:45:00Z' },
]

const mockOrderHistory = [
  { id: 1, type: 'buy', price: '93.0000', amount: '2.0000', total: '186.0000', status: 'filled', date: '2023-06-01 14:30:00' },
  { id: 2, type: 'sell', price: '97.5000', amount: '1.0000', total: '97.5000', status: 'filled', date: '2023-06-02 09:15:00' },
]

const mockTradeHistory = [
  { id: 1, type: 'buy', price: '95.2000', amount: '1.2000', total: '114.2400', fee: '0.2284', date: '2023-06-03 11:45:00' },
  { id: 2, type: 'sell', price: '96.8000', amount: '0.8000', total: '77.4400', fee: '0.1548', date: '2023-06-04 16:20:00' },
]

export default function ProfessionalBoredApeTradingInterface() {
  const [orderType, setOrderType] = useState('limit')
  const [buyPrice, setBuyPrice] = useState('95.5000')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellPrice, setSellPrice] = useState('95.5000')
  const [sellAmount, setSellAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPostOnly, setIsPostOnly] = useState(false)
  const [isPostOnlyBuy, setIsPostOnlyBuy] = useState<boolean>(false);
  const [isPostOnlySell, setIsPostOnlySell] = useState<boolean>(false);
  const [availableETH, setAvailableETH] = useState(10)
  const [availableBAYC, setAvailableBAYC] = useState(5)

  const handlePostOnlyBuyChange = (checked: CheckedState) => {
    setIsPostOnlyBuy(checked === true);
  };

  const handlePostOnlySellChange = (checked: CheckedState) => {
    setIsPostOnlySell(checked === true);
  };

  const handleOrder = (action: 'buy' | 'sell') => {
    setIsLoading(true)
    setError(null)
    setTimeout(() => {
      setIsLoading(false)
      setError('Order submission is currently unavailable.')
    }, 1000)
  }

  const handleBack = () => {
    console.log("Navigating back...")
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

  const handlePercentageClick = (percentage: number, action: 'buy' | 'sell') => {
    if (action === 'buy') {
      const maxAmount = availableETH / parseFloat(buyPrice || '0')
      setBuyAmount((maxAmount * percentage / 100).toFixed(4))
    } else {
      const maxAmount = availableBAYC
      setSellAmount((maxAmount * percentage / 100).toFixed(4))
    }
  }

  const handleMaxClick = (action: 'buy' | 'sell') => {
    if (action === 'buy') {
      const maxAmount = availableETH / parseFloat(buyPrice || '0')
      setBuyAmount(maxAmount.toFixed(4))
    } else {
      setSellAmount(availableBAYC.toFixed(4))
    }
  }

  const calculateTotal = (price: string, amount: string) => {
    return (parseFloat(price || '0') * parseFloat(amount || '0')).toFixed(4)
  }

  const calculateFee = (total: string) => {
    return (parseFloat(total) * 0.002).toFixed(4) // Assuming 0.2% fee
  }

  const preventWheelChange = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex text-base font-sans">
      <aside className="w-48 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-gray-800">
          <span className="font-bold text-base">BAYC Trading</span>
          <Button variant="ghost" size="sm" onClick={handleBack} className="text-sm p-1 hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-2 py-2">
            {mockWatchlist.map((item, index) => (
              <div key={index} className="flex flex-col p-2 hover:bg-gray-800 rounded cursor-pointer transition-colors duration-150">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.symbol}</span>
                  <span className={`text-xs ${item.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{item.change}</span>
                </div>
                <span className="text-right text-sm">{item.price}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
        <nav className="p-2 border-t border-gray-800">
          <Button variant="ghost" className="w-full justify-start text-sm hover:bg-gray-800 transition-colors duration-150">
            <BarChart2 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm hover:bg-gray-800 transition-colors duration-150">
            <BookOpen className="h-4 w-4 mr-2" />
            Order Book
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm hover:bg-gray-800 transition-colors duration-150">
            <Activity className="h-4 w-4 mr-2" />
            Trade History
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm hover:bg-gray-800 transition-colors duration-150">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center space-x-4">
            <span className="font-bold text-base">BAYC/ETH</span>
            <span className="font-bold text-lg text-green-400">95.5000</span>
            <span className="text-green-400 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              2.5%
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div><span className="text-gray-400 mr-1">24h High</span><span className="font-semibold">98.7500</span></div>
            <div><span className="text-gray-400 mr-1">24h Low</span><span className="font-semibold">92.0000</span></div>
            <div><span className="text-gray-400 mr-1">24h Volume</span><span className="font-semibold">1,245 ETH</span></div>
          </div>
        </header>

        <main className="flex-1 flex gap-2 p-2 overflow-hidden">
          <div className="w-2/3 flex flex-col gap-2">
            <div className="bg-gray-900 rounded border border-gray-800 p-2">
              <h2 className="text-sm font-semibold mb-2">Price Chart</h2>
              <div className="h-[250px]">
              <TradingChart />

                {/* <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                    <XAxis dataKey="time" stroke="#718096" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#718096" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: 'none' }} itemStyle={{ color: '#E2E8F0' }} />
                    <Line type="monotone" dataKey="price" stroke="#4299E1" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer> */}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-900 p-2 rounded border border-gray-800">
                <h3 className="text-sm font-semibold mb-2">Buy BAYC</h3>
                <Tabs value={orderType} onValueChange={setOrderType} className="w-full">
                  <TabsList className="w-full mb-2 bg-gray-800">
                    <TabsTrigger value="limit" className="flex-1 text-sm data-[state=active]:bg-gray-700 data-[state=active]:text-white">Limit</TabsTrigger>
                    <TabsTrigger value="market" className="flex-1 text-sm data-[state=active]:bg-gray-700 data-[state=active]:text-white">Market</TabsTrigger>
                  </TabsList>
                  <TabsContent value="limit" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Available: {availableETH.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="buy-price" className="text-sm text-gray-400">Price:</label>
                      <Input
                        id="buy-price"
                        type="number"
                        step="any"
                        placeholder="0.0000"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                        onWheel={preventWheelChange}
                        className="text-sm h-8 bg-gray-800 border-gray-700 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="buy-amount" className="text-sm text-gray-400">Amount:</label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="buy-amount"
                          type="number"
                          step="any"
                          placeholder="0.0000"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                          onWheel={preventWheelChange}
                          className="text-sm h-8 bg-gray-800 border-gray-700 flex-grow text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button size="sm" variant="outline" onClick={() => handleMaxClick('buy')} className="text-sm h-8 bg-gray-800 hover:bg-gray-700">Max</Button>
                      </div>
                    </div>
                    <Slider
                      value={[parseFloat(buyAmount) || 0]}
                      max={availableETH / parseFloat(buyPrice || '1')}
                      step={0.0001}
                      onValueChange={(value) => setBuyAmount(value[0].toFixed(4))}
                      className="my-4 [&>.bg-primary]:bg-green-500 [&>.bg-background]:bg-gray-700 [&>span]:bg-white [&>span]:border-2 [&>span]:border-green-500 [&>span]:h-4 [&>span]:w-4 [&>span]:top-[-3px]"
                    />
                    <div className="flex justify-between space-x-1">
                      {[25, 50, 75, 100].map((percentage) => (
                        <Button
                          key={percentage}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePercentageClick(percentage, 'buy')}
                          className="flex-1 text-sm h-9 bg-gray-800 hover:bg-gray-700"
                        >
                          {percentage}%
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="post-only-buy"
                        checked={isPostOnlyBuy}
                        onCheckedChange={handlePostOnlyBuyChange}
                        className="w-4 h-4 border-gray-600"
                      />
                      {/* <Checkbox id="post-only-buy" checked={isPostOnly} onCheckedChange={setIsPostOnly} className="w-4 h-4 border-gray-600" /> */}
                      <label htmlFor="post-only-buy" className="text-sm text-gray-300">Post Only</label>
                    </div>
                    <div className="text-sm text-gray-400">
                      <div>Total: <span className="text-right">{calculateTotal(buyPrice, buyAmount)} ETH</span></div>
                      <div className="mt-1">Fee: <span className="text-right">{calculateFee(calculateTotal(buyPrice, buyAmount))} ETH</span></div>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-sm h-9" onClick={() => handleOrder('buy')} disabled={isLoading}>
                      {isLoading ? 'Processing...' : 'Buy BAYC'}
                    </Button>
                  </TabsContent>
                  <TabsContent value="market" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Available: {availableETH.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="buy-amount-market" className="text-sm text-gray-400">Amount:</label>
                      <Input
                        id="buy-amount-market"
                        type="number"
                        step="any"
                        placeholder="0.0000"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        onWheel={preventWheelChange}
                        className="text-sm h-8 bg-gray-800 border-gray-700 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <Slider
                      value={[parseFloat(buyAmount) || 0]}
                      max={availableETH / 95.5} // Using current market price
                      step={0.0001}
                      onValueChange={(value) => setBuyAmount(value[0].toFixed(4))}
                      className="my-4 [&>.bg-primary]:bg-green-500 [&>.bg-background]:bg-gray-700 [&>span]:bg-white [&>span]:border-2 [&>span]:border-green-500 [&>span]:h-4 [&>span]:w-4 [&>span]:top-[-3px]"
                    />
                    <div className="flex justify-between space-x-1">
                      {[25, 50, 75, 100].map((percentage) => (
                        <Button
                          key={percentage}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePercentageClick(percentage, 'buy')}
                          className="flex-1 text-sm h-9 bg-gray-800 hover:bg-gray-700"
                        >
                          {percentage}%
                        </Button>
                      ))}
                    </div>
                    <div className="text-sm text-gray-400">
                      <div>Estimated Total: <span className="text-right">{calculateTotal('95.5', buyAmount)} ETH</span></div>
                      <div className="mt-1">Estimated Fee: <span className="text-right">{calculateFee(calculateTotal('95.5', buyAmount))} ETH</span></div>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-sm h-9" onClick={() => handleOrder('buy')} disabled={isLoading}>
                      {isLoading ? 'Processing...' : 'Buy BAYC'}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="bg-gray-900 p-2 rounded border border-gray-800">
                <h3 className="text-sm font-semibold mb-2">Sell BAYC</h3>
                <Tabs value={orderType} onValueChange={setOrderType} className="w-full">
                  <TabsList className="w-full mb-2 bg-gray-800">
                    <TabsTrigger value="limit" className="flex-1 text-sm data-[state=active]:bg-gray-700 data-[state=active]:text-white">Limit</TabsTrigger>
                    <TabsTrigger value="market" className="flex-1 text-sm data-[state=active]:bg-gray-700 data-[state=active]:text-white">Market</TabsTrigger>
                  </TabsList>
                  <TabsContent value="limit" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Available: {availableBAYC.toFixed(4)} BAYC</span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="sell-price" className="text-sm text-gray-400">Price:</label>
                      <Input
                        id="sell-price"
                        type="number"
                        step="any"
                        placeholder="0.0000"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        onWheel={preventWheelChange}
                        className="text-sm h-8 bg-gray-800 border-gray-700 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="sell-amount" className="text-sm text-gray-400">Amount:</label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="sell-amount"
                          type="number"
                          step="any"
                          placeholder="0.0000"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(e.target.value)}
                          onWheel={preventWheelChange}
                          className="text-sm h-8 bg-gray-800 border-gray-700 flex-grow text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button size="sm" variant="outline" onClick={() => handleMaxClick('sell')} className="text-sm h-8 bg-gray-800 hover:bg-gray-700">Max</Button>
                      </div>
                    </div>
                    <Slider
                      value={[parseFloat(sellAmount) || 0]}
                      max={availableBAYC}
                      step={0.0001}
                      onValueChange={(value) => setSellAmount(value[0].toFixed(4))}
                      className="my-4 [&>.bg-primary]:bg-red-500 [&>.bg-background]:bg-gray-700 [&>span]:bg-white [&>span]:border-2 [&>span]:border-red-500 [&>span]:h-4 [&>span]:w-4 [&>span]:top-[-3px]"
                    />
                    <div className="flex justify-between space-x-1">
                      {[25, 50, 75, 100].map((percentage) => (
                        <Button
                          key={percentage}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePercentageClick(percentage, 'sell')}
                          className="flex-1 text-sm h-9 bg-gray-800 hover:bg-gray-700"
                        >
                          {percentage}%
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="post-only-sell"
                        checked={isPostOnlySell}
                        onCheckedChange={handlePostOnlySellChange}
                        className="w-4 h-4 border-gray-600"
                      />

                      {/* <Checkbox id="post-only-sell" checked={isPostOnly} onCheckedChange={setIsPostOnly} className="w-4 h-4 border-gray-600" /> */}
                      <label htmlFor="post-only-sell" className="text-sm text-gray-300">Post Only</label>
                    </div>
                    <div className="text-sm text-gray-400">
                      <div>Total: <span className="text-right">{calculateTotal(sellPrice, sellAmount)} ETH</span></div>
                      <div className="mt-1">Fee: <span className="text-right">{calculateFee(calculateTotal(sellPrice, sellAmount))} ETH</span></div>
                    </div>
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-sm h-9" onClick={() => handleOrder('sell')} disabled={isLoading}>
                      {isLoading ? 'Processing...' : 'Sell BAYC'}
                    </Button>
                  </TabsContent>
                  <TabsContent value="market" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Available: {availableBAYC.toFixed(4)} BAYC</span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="sell-amount-market" className="text-sm text-gray-400">Amount:</label>
                      <Input
                        id="sell-amount-market"
                        type="number"
                        step="any"
                        placeholder="0.0000"
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        onWheel={preventWheelChange}
                        className="text-sm h-8 bg-gray-800 border-gray-700 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <Slider
                      value={[parseFloat(sellAmount) || 0]}
                      max={availableBAYC}
                      step={0.0001}
                      onValueChange={(value) => setSellAmount(value[0].toFixed(4))}
                      className="my-4 [&>.bg-primary]:bg-red-500 [&>.bg-background]:bg-gray-700 [&>span]:bg-white [&>span]:border-2 [&>span]:border-red-500 [&>span]:h-4 [&>span]:w-4 [&>span]:top-[-3px]"
                    />
                    <div className="flex justify-between space-x-1">
                      {[25, 50, 75, 100].map((percentage) => (
                        <Button
                          key={percentage}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePercentageClick(percentage, 'sell')}
                          className="flex-1 text-sm h-9 bg-gray-800 hover:bg-gray-700"
                        >
                          {percentage}%
                        </Button>
                      ))}
                    </div>
                    <div className="text-sm text-gray-400">
                      <div>Estimated Total: <span className="text-right">{calculateTotal('95.5', sellAmount)} ETH</span></div>
                      <div className="mt-1">Estimated Fee: <span className="text-right">{calculateFee(calculateTotal('95.5', sellAmount))} ETH</span></div>
                    </div>
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-sm h-9" onClick={() => handleOrder('sell')} disabled={isLoading}>
                      {isLoading ? 'Processing...' : 'Sell BAYC'}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
          <div className="w-1/3 flex flex-col gap-2">
            <div className="bg-gray-900 rounded border border-gray-800 p-2 flex-grow">
              <h2 className="text-sm font-semibold mb-2">Order Book</h2>
              <div className="space-y-1 h-[calc(100%-2rem)] flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-xs font-medium text-gray-400 mb-1">Asks</h3>
                  <div className="space-y-[1px] overflow-y-auto max-h-[calc(100%-1.5rem)]">
                    {mockOrderbook.asks.map((ask, index) => (
                      <div key={index} className="flex justify-between text-xs relative p-[2px]">
                        <span className="text-red-400 z-10 flex-shrink-0 text-right">{ask.price}</span>
                        <span className="z-10 flex-shrink-0 text-right">{ask.amount}</span>
                        <span className="z-10 flex-shrink-0 text-right">{ask.total}</span>
                        <div
                          className="absolute inset-0 bg-red-500 opacity-10"
                          style={{ width: `${Math.min((parseFloat(ask.amount) / 10) * 100, 100)}%`, zIndex: 0 }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="py-1 text-center font-bold text-sm text-green-400 border-y border-gray-800">
                  95.5000
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-xs font-medium text-gray-400 mb-1">Bids</h3>
                  <div className="space-y-[1px] overflow-y-auto max-h-[calc(100%-1.5rem)]">
                    {mockOrderbook.bids.map((bid, index) => (
                      <div key={index} className="flex justify-between text-xs relative p-[2px]">
                        <span className="text-green-400 z-10 flex-shrink-0 text-right">{bid.price}</span>
                        <span className="z-10 flex-shrink-0 text-right">{bid.amount}</span>
                        <span className="z-10 flex-shrink-0 text-right">{bid.total}</span>
                        <div
                          className="absolute inset-0 bg-green-500 opacity-10"
                          style={{ width: `${Math.min((parseFloat(bid.amount) / 10) * 100, 100)}%`, zIndex: 0 }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-center items-center text-xs">
                  <div className="bg-red-500 bg-opacity-20 px-1 py-[2px] rounded-l">{askPercentage}% asks</div>
                  <div className="bg-green-500 bg-opacity-20 px-1 py-[2px] rounded-r">{bidPercentage}% bids</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded border border-gray-800 p-2">
              <h2 className="text-sm font-semibold mb-2">Recent Trades</h2>
              <ScrollArea className="h-[150px]">
                <div className="space-y-[1px]">
                  {mockTrades.map((trade) => (
                    <div key={trade.id} className="flex justify-between text-xs hover:bg-gray-800 transition-colors duration-150 ease-in-out p-[2px] rounded">
                      <span className={`${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'} text-right`}>
                        {trade.price}
                      </span>
                      <span className="text-right">{trade.amount}</span>
                      <span className="text-gray-400 text-right">{trade.time}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </main>
        {error && (
          <p className="text-red-400 text-sm mt-2 px-2">{error}</p>
        )}
        <div className="mt-2 px-2">
          <Tabs defaultValue="open-orders" className="w-full">
            <TabsList className="w-full mb-2 bg-gray-800">
              <TabsTrigger value="open-orders" className="flex-1 text-sm data-[state=active]:bg-gray-700 data-[state=active]:text-white">Open Orders</TabsTrigger>
              <TabsTrigger value="order-history" className="flex-1 text-sm data-[state=active]:bg-gray-700 data-[state=active]:text-white">Order History</TabsTrigger>
              <TabsTrigger value="trade-history" className="flex-1 text-sm data-[state=active]:bg-gray-700 data-[state=active]:text-white">Trade History</TabsTrigger>
            </TabsList>
            <TabsContent value="open-orders">
              <ScrollArea className="h-[150px]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="bg-gray-800">
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Time</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOpenOrders.map((order, index) => (
                      <tr key={order.id} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'} hover:bg-gray-800`}>
                        <td className={`p-2 ${order.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {order.type === 'buy' ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                          {order.type}
                        </td>
                        <td className="p-2 text-right">{order.price}</td>
                        <td className="p-2 text-right">{order.amount}</td>
                        <td className="p-2 text-right">{order.total}</td>
                        <td className="p-2">{order.status}</td>
                        <td className="p-2">{new Date(order.timestamp).toLocaleString()}</td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm" className="text-xs h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-400/20">
                            Cancel
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="order-history">
              <ScrollArea className="h-[150px]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="bg-gray-800">
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOrderHistory.map((order, index) => (
                      <tr key={order.id} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'} hover:bg-gray-800`}>
                        <td className={`p-2 ${order.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {order.type === 'buy' ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                          {order.type}
                        </td>
                        <td className="p-2 text-right">{order.price}</td>
                        <td className="p-2 text-right">{order.amount}</td>
                        <td className="p-2 text-right">{order.total}</td>
                        <td className="p-2">{order.status}</td>
                        <td className="p-2">{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="trade-history">
              <ScrollArea className="h-[150px]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="bg-gray-800">
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Fee</th>
                      <th className="p-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTradeHistory.map((trade, index) => (
                      <tr key={trade.id} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'} hover:bg-gray-800`}>
                        <td className={`p-2 ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.type === 'buy' ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                          {trade.type}
                        </td>
                        <td className="p-2 text-right">{trade.price}</td>
                        <td className="p-2 text-right">{trade.amount}</td>
                        <td className="p-2 text-right">{trade.total}</td>
                        <td className="p-2 text-right">{trade.fee}</td>
                        <td className="p-2">{trade.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}