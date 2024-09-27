"use client";

import { useEffect, useState, useMemo } from 'react';
import { Collection } from './utils/mockData';
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, ArrowRightLeft, Users, Search, Filter, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type TimeRange = '24h' | '7d' | '30d'
type FilterOption = 'all' | 'topFloorPrice' | 'topBidDepth' | 'topFloorBuys'
type ViewMode = 'card' | 'table'

export default function NFTTradingDashboard() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [filterOption, setFilterOption] = useState<FilterOption | null>(null);
  const [displayedFilterOption, setDisplayedFilterOption] = useState<string>("Sort by");
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = viewMode === 'card' ? 12 : 20

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const timestamp = new Date().getTime();
        const [collectionsResponse, historyResponse] = await Promise.all([
          fetch(`/api/collections?t=${timestamp}`),
          fetch(`/api/collections/floor-price-history?t=${timestamp}`)
        ]);

        if (!collectionsResponse.ok || !historyResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const collectionsData = await collectionsResponse.json();
        const historyData = await historyResponse.json();

        setCollections(collectionsData.map((item: any) => {
          const currentBidPrice = item.bestBid ? parseFloat(item.bestBid.price) : 0;
          const currentFloorPrice = parseFloat(item.current_floor_price);
          const bidPriceChange = item.bidPrice24HoursAgo ? (currentBidPrice - item.bidPrice24HoursAgo) / item.bidPrice24HoursAgo : 0;
          return {
            id: item.collection_id,
            name: item.name,
            floorPrice: currentFloorPrice,
            floorPriceChange: 0, // This will be calculated in the CardView component
            bidPrice: currentBidPrice,
            bidPriceChange: bidPriceChange,
            floorSales24h: item.floorAskTaken || 0,
            floorBidSpread: currentBidPrice ? currentFloorPrice - currentBidPrice : 0,
            bidToFloorRatio: currentBidPrice ? currentBidPrice / currentFloorPrice : 0,
            bidDepth: item.bestBid ? item.bestBid.executable_size : 0,
            floorAskTaken: item.floorAskTaken || 0,
            floorAskAvgPrice24h: item.floorAskAvgPrice24h || '0',
            bidSales24h: item.bidSales24h || 0,
            bidSalesAvgPrice24h: item.bidSalesAvgPrice24h || '0',
            priceHistory: historyData[item.collection_id] || []
          };
        }));

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []);

  useEffect(() => {
    // Set initial sorting to floor price without changing the displayed text
    setFilterOption('topFloorPrice');
  }, []);

  const handleFilterChange = (value: string) => {
    setFilterOption(value as FilterOption);
    setDisplayedFilterOption(value === 'topFloorPrice' ? 'Floor Price' :
      value === 'topBidDepth' ? 'Bid Depth' :
        value === 'topFloorBuys' ? 'Floor Buys' : 'All Collections');
  };

  const filteredCollections = useMemo(() => {
    let filtered = [...collections]

    if (searchQuery) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Always sort by floor price initially
    filtered = filtered.sort((a, b) => b.floorPrice - a.floorPrice)

    switch (filterOption) {
      case 'topFloorPrice':
      case null: 
        filtered = filtered //.slice(0, 20)
        break
      case 'topBidDepth':
        filtered = filtered.sort((a, b) => b.bidDepth - a.bidDepth)//.slice(0, 20)
        break
      case 'topFloorBuys':
        filtered = filtered.sort((a, b) => b.floorSales24h - a.floorSales24h)//.slice(0, 20)
        break
    }

    return filtered
  }, [filterOption, searchQuery, collections])

  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCollections.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCollections, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage)

  const CardView = ({ collection }: { collection: Collection }) => {
    const calculateFloorPriceChange = () => {
      if (collection.priceHistory.length < 2) return 0;
      const sortedHistory = [...collection.priceHistory].sort((a, b) => a.timestamp - b.timestamp);
      const oldestPrice = sortedHistory[0].floorPrice;
      const currentPrice = collection.floorPrice;
      return (currentPrice - oldestPrice) / oldestPrice;
    };

    const floorPriceChange = calculateFloorPriceChange();

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <h2 className="text-xl font-semibold mb-4">{collection.name}</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="flex items-center mb-2">
              <DollarSign className="mr-2 text-blue-400" size={20} />
              <span className="text-sm text-gray-400">Floor Price</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold mr-1">{collection.floorPrice.toFixed(2)}</span>
              <span className="text-lg">ETH</span>
            </div>
            <div className={`text-sm ${floorPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {floorPriceChange >= 0 ? (
                <TrendingUp size={16} className="inline mr-1" />
              ) : (
                <TrendingDown size={16} className="inline mr-1" />
              )}
              {(floorPriceChange * 100).toFixed(2)}%
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
              {collection.bidPriceChange >= 0 ? (
                <TrendingUp size={16} className="inline mr-1" />
              ) : (
                <TrendingDown size={16} className="inline mr-1" />
              )}
              {collection.bidPriceChange < 0 && '-'}
              {Math.abs(collection.bidPriceChange * 100).toFixed(2)}%
            </div>
          </div>
          <div className="flex flex-col justify-between h-24">
            <div>
              <div className="flex items-center mb-2">
                <ArrowRightLeft className="mr-2 text-yellow-400 flex-shrink-0" size={20} />
                <span className="text-sm text-gray-400">Floor-Bid Spread</span>
              </div>
              <div className={`text-2xl font-bold ${((1 - collection.bidToFloorRatio) * 100) <= 2 ? 'text-green-500' :
                  ((1 - collection.bidToFloorRatio) * 100) <= 5 ? 'text-yellow-500' :
                    'text-red-500'
                }`}>
                {((1 - collection.bidToFloorRatio) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {collection.floorBidSpread.toFixed(2)} ETH
            </div>
          </div>
          <div className="flex flex-col justify-between h-24">
            <div>
              <div className="flex items-center mb-2">
                <Users className="mr-2 text-green-400 flex-shrink-0" size={20} />
                <span className="text-sm text-gray-400">Collection Bid Depth</span>
              </div>
              <div className="text-2xl font-bold">{collection.bidDepth}</div>
            </div>
            <div className="text-sm text-gray-400">
              {(collection.bidDepth * collection.bidPrice).toFixed(2)} ETH
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col justify-between h-24">
            <div>
              <div className="flex items-center mb-2">
                <Zap className="mr-2 text-yellow-400" size={20} />
                <span className="text-sm text-gray-400 whitespace-nowrap">Floor Sales (avg)</span>
              </div>
              <div className="text-xl font-bold">{collection.floorAskTaken}</div>
              <div className="text-sm text-gray-400">
                Avg {parseFloat(collection.floorAskAvgPrice24h).toFixed(4)} ETH
              </div>
            </div>
          </div>
          {collection.bidSales24h !== undefined && (
            <div className="flex flex-col justify-between h-24">
              <div>
                <div className="flex items-center mb-2">
                  <Zap className="mr-2 text-purple-400" size={20} />
                  <span className="text-sm text-gray-400 whitespace-nowrap">Bid Sales (avg)</span>
                </div>
                <div className="text-xl font-bold">{collection.bidSales24h}</div>
                <div className="text-sm text-gray-400">
                  Avg {parseFloat(collection.bidSalesAvgPrice24h).toFixed(4)} ETH
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="flex items-center mb-2">
            <Zap className="mr-2 text-blue-400" size={20} />
            <span className="text-sm text-gray-400">Floor Price Trend</span>
          </div>
          {collection.priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={collection.priceHistory}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(timestamp) => format(new Date(timestamp), 'HH:mm')}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  dataKey="floorPrice"
                  tickFormatter={(value) => value.toFixed(3)}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  labelFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd, HH:mm')}
                  formatter={(value: number) => [value.toFixed(4) + ' ETH', 'Floor Price']}
                />
                <Line
                  type="monotone"
                  dataKey="floorPrice"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-400">No floor price data available</div>
          )}
        </div>
        <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">View Details</Button>
      </motion.div>
    )
  }

  const TableView = () => {
    const calculateFloorPriceChange = (collection: Collection) => {
      if (collection.priceHistory.length < 2) return 0;
      const sortedHistory = [...collection.priceHistory].sort((a, b) => a.timestamp - b.timestamp);
      const oldestPrice = sortedHistory[0].floorPrice;
      const currentPrice = collection.floorPrice;
      return (currentPrice - oldestPrice) / oldestPrice;
    };

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Collection</TableHead>
            <TableHead>Floor Price</TableHead>
            <TableHead>Bid Price</TableHead>
            <TableHead>Floor-Bid Spread</TableHead>
            <TableHead>Floor Sales</TableHead>
            <TableHead>Bid Sales</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedCollections.map((collection) => {
            const floorPriceChange = calculateFloorPriceChange(collection);
            return (
              <TableRow key={collection.id}>
                <TableCell className="font-medium">{collection.name}</TableCell>
                <TableCell>
                  <div>{collection.floorPrice.toFixed(2)} ETH</div>
                  <div className={`text-sm ${floorPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {floorPriceChange >= 0 ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
                    {floorPriceChange < 0 && '-'}
                    {Math.abs(floorPriceChange * 100).toFixed(2)}%
                  </div>
                </TableCell>
                <TableCell>
                  <div>{collection.bidPrice.toFixed(2)} ETH</div>
                  <div className={`text-sm ${collection.bidPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {collection.bidPriceChange >= 0 ? (
                      <TrendingUp size={12} className="inline mr-1" />
                    ) : (
                      <TrendingDown size={12} className="inline mr-1" />
                    )}
                    {collection.bidPriceChange < 0 && '-'}
                    {Math.abs(collection.bidPriceChange * 100).toFixed(2)}%
                  </div>
                </TableCell>
                <TableCell>
                  {((1 - collection.bidToFloorRatio) * 100).toFixed(1)}% ({collection.floorBidSpread.toFixed(2)} ETH)
                </TableCell>
                <TableCell>
                  {collection.floorSales24h} ({parseFloat(collection.floorAskAvgPrice24h).toFixed(4)} ETH)
                </TableCell>
                <TableCell>
                  {collection.bidSales24h} ({parseFloat(collection.bidSalesAvgPrice24h).toFixed(4)} ETH)
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-gray-900 transition-colors duration-200"
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const TimeRangeButton = ({ range }: { range: TimeRange }) => {
    const isDisabled = range !== '24h';

    return (
      <div className="relative inline-block">
        <Badge
          variant={timeRange === range ? "default" : "secondary"}
          className={`cursor-pointer rounded-full px-3 py-1 ${timeRange === range ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !isDisabled && setTimeRange(range)}
        >
          {range}
        </Badge>
        {isDisabled && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            Not enough data
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Schrank Dashboard</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <Select onValueChange={handleFilterChange} value={filterOption || undefined}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
            <SelectValue>{displayedFilterOption}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* <SelectItem value="all">All Collections</SelectItem> */}
            <SelectItem value="topFloorPrice">Floor Price</SelectItem>
            <SelectItem value="topBidDepth">Bid Depth</SelectItem>
            <SelectItem value="topFloorBuys">Floor Buys</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex space-x-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <TimeRangeButton key={range} range={range} />
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