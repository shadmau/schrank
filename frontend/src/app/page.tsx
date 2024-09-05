"use client";


import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, ArrowRightLeft, Users, Search, Filter, ChevronDown, ChevronUp, ListPlus, Zap } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious, } from "@/components/ui/pagination"
import { mockCollections, Collection } from './utils/mockData'

type TimeRange = '24h' | '7d' | '30d'
type FilterOption = 'all' | 'topFloorPrice' | 'topBidDepth' | 'topFloorBuys'
type ViewMode = 'card' | 'table'

export default function NFTTradingDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [filterOption, setFilterOption] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = viewMode === 'card' ? 12 : 20

  const filteredCollections = useMemo(() => {
    let filtered = [...mockCollections]

    if (searchQuery) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    switch (filterOption) {
      case 'topFloorPrice':
        filtered = filtered.sort((a, b) => b.floorPrice - a.floorPrice).slice(0, 20)
        break
      case 'topBidDepth':
        filtered = filtered.sort((a, b) => b.bidDepth - a.bidDepth).slice(0, 20)
        break
      case 'topFloorBuys':
        filtered = filtered.sort((a, b) => b.floorBuys - a.floorBuys).slice(0, 20)
        break
    }

    return filtered
  }, [filterOption, searchQuery])

  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCollections.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCollections, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage)

const CardView = ({ collection }: { collection: Collection }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl font-semibold mb-4">{collection.name}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center mb-2">
            <DollarSign className="mr-2 text-blue-400" size={20} />
            <span className="text-sm text-gray-400">Floor Price</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold mr-1">{collection.floorPrice.toFixed(2)}</span>
            <span className="text-lg">ETH</span>
          </div>
          <div className={`text-sm ${collection.floorPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {collection.floorPriceChange >= 0 ? <TrendingUp size={16} className="inline mr-1" /> : <TrendingDown size={16} className="inline mr-1" />}
            {Math.abs(collection.floorPriceChange).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="flex items-center mb-2">
            <BarChart2 className="mr-2 text-purple-400" size={20} />
            <span className="text-sm text-gray-400">Bid Price</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold mr-1">{collection.bidPrice.toFixed(2)}</span>
            <span className="text-lg">ETH</span>
          </div>
          <div className={`text-sm ${collection.bidPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {collection.bidPriceChange >= 0 ? <TrendingUp size={16} className="inline mr-1" /> : <TrendingDown size={16} className="inline mr-1" />}
            {Math.abs(collection.bidPriceChange).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="flex items-center mb-2">
            <ArrowRightLeft className="mr-2 text-yellow-400 flex-shrink-0" size={20} />
            <span className="text-sm text-gray-400">Floor-Bid Spread</span>
          </div>
          <div className={`text-2xl font-bold mb-1 ${collection.floorBidSpread <= 0.3 ? 'text-green-500' : collection.floorBidSpread >= 0.7 ? 'text-red-500' : 'text-yellow-500'}`}>
            {(collection.bidToFloorRatio * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">
            {collection.floorBidSpread.toFixed(2)} ETH
          </div>
        </div>
        <div>
          <div className="flex items-center mb-2">
            <Users className="mr-2 text-green-400 flex-shrink-0" size={20} />
            <span className="text-sm text-gray-400">Collection Bid Depth</span>
          </div>
          <div className="text-2xl font-bold mb-1">{collection.bidDepth.toFixed(1)}</div>
          <div className="text-sm text-gray-400">
            {(collection.bidDepth * collection.bidPrice).toFixed(2)} ETH
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center mb-2">
          <ListPlus className="mr-2 text-blue-400" size={20} />
          <span className="text-sm text-gray-400">Listing Velocity</span>
        </div>
        <div className="text-xl font-bold">{collection.listingVelocity} / day</div>
      </div>
      <div className="mt-4">
        <div className="flex items-center mb-2">
          <Zap className="mr-2 text-blue-400" size={20} />
          <span className="text-sm text-gray-400">Price Trend</span>
        </div>
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={collection.priceHistory.map((price, index) => ({ price, index }))}>
            <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">View Details</Button>
    </motion.div>
  )

  const TableView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Collection</TableHead>
          <TableHead>Floor Price</TableHead>
          <TableHead>Bid Price</TableHead>
          <TableHead>Floor-Bid Spread</TableHead>
          <TableHead>Bid/Floor Ratio</TableHead>
          <TableHead>Bid Depth</TableHead>
          <TableHead>Listing Velocity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedCollections.map((collection) => (
          <TableRow key={collection.id}>
            <TableCell className="font-medium">{collection.name}</TableCell>
            <TableCell>
              <div>{collection.floorPrice.toFixed(2)} ETH</div>
              <div className={`text-sm ${collection.floorPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {collection.floorPriceChange >= 0 ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
                {Math.abs(collection.floorPriceChange).toFixed(2)}%
              </div>
            </TableCell>
            <TableCell>
              <div>{collection.bidPrice.toFixed(2)} ETH</div>
              <div className={`text-sm ${collection.bidPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {collection.bidPriceChange >= 0 ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
                {Math.abs(collection.bidPriceChange).toFixed(2)}%
              </div>
            </TableCell>
            <TableCell className={`${collection.floorBidSpread <= 0.3 ? 'text-green-500' : collection.floorBidSpread >= 0.7 ? 'text-red-500' : 'text-yellow-500'}`}>
              {collection.floorBidSpread.toFixed(2)} ETH
            </TableCell>
            <TableCell>{(collection.bidToFloorRatio * 100).toFixed(1)}%</TableCell>
            <TableCell>{collection.bidDepth.toFixed(1)}</TableCell>
            <TableCell>{collection.listingVelocity} / day</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Schrank Dashboard</h1>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <Select onValueChange={(value) => setFilterOption(value as FilterOption)}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
            <SelectValue placeholder="Filter collections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            <SelectItem value="topFloorPrice">Top 20 by Floor Price</SelectItem>
            <SelectItem value="topBidDepth">Top 20 by Bid Depth</SelectItem>
            <SelectItem value="topFloorBuys">Top 20 by Floor Buys</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex space-x-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Badge
              key={range}
              variant={timeRange === range ? "default" : "secondary"}
              className={`cursor-pointer rounded-full px-3 py-1 ${
                timeRange === range ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Badge>
          ))}
        </div>
        
        <div className="flex-grow">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search collections..."
              className="pl-10 bg-gray-800 border-gray-700 text-gray-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm">Card</span>
          <Switch
            checked={viewMode === 'table'}
            onCheckedChange={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
          />
          <span className="text-sm">Table</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedCollections.map((collection) => (
                <CardView key={collection.id} collection={collection} />
              ))}
            </div>
          ) : (
            <TableView />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex justify-center">
      <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                // disabled={currentPage === 1}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink>{currentPage}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                // disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}