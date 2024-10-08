import { Repository } from "typeorm";
import { Sale, NFT, Listing, Collection, CollectionMetrics, CurrentBid, BidHistory, UserBid } from '../models/entities.js';
import { dataSource } from "../config/database.js";
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

export class DatabaseService {
  private static instance: DatabaseService;
  private initialized: boolean = false;

  private collectionRepo!: Repository<Collection>;
  private nftRepo!: Repository<NFT>;
  private listingRepo!: Repository<Listing>;
  private saleRepo!: Repository<Sale>;
  private metricsRepo!: Repository<CollectionMetrics>;
  private currentBidRepo!: Repository<CurrentBid>;
  private bidHistoryRepo!: Repository<BidHistory>;
  private userBidRepo!: Repository<UserBid>;

  private constructor() { }
  public isInitialized(): boolean {
    return this.initialized;
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      try {
        await dataSource.initialize();
        console.log("Data Source has been initialized!");
      } catch (err) {
        console.error("Error during Data Source initialization:", err);
      }
      this.collectionRepo = dataSource.getRepository(Collection);
      this.nftRepo = dataSource.getRepository(NFT);
      this.listingRepo = dataSource.getRepository(Listing);
      this.saleRepo = dataSource.getRepository(Sale);
      this.metricsRepo = dataSource.getRepository(CollectionMetrics);
      this.currentBidRepo = dataSource.getRepository(CurrentBid);
      this.bidHistoryRepo = dataSource.getRepository(BidHistory);
      this.userBidRepo = dataSource.getRepository(UserBid);

      this.initialized = true;
      console.log("Database connection established");
    } catch (error) {
      console.error("Error connecting to database:", error);
      throw error;
    }
  }

  async storeCollection(collection: Partial<Collection>) {
    return this.collectionRepo.save(collection);
  }

  async storeCollections(collections: Partial<Collection>[]) {
    return this.collectionRepo.save(collections);
  }

  async storeNFT(nft: Partial<NFT>) {
    return this.nftRepo.save(nft);
  }

  async storeListing(listing: Partial<Listing>) {
    return this.listingRepo.save(listing);
  }

  async storeSale(sale: Partial<Sale>) {
    return this.saleRepo.save(sale);
  }

  async storeMetrics(metrics: Partial<CollectionMetrics>) {
    return this.metricsRepo.save(metrics);
  }

  async getAllCollections(): Promise<Collection[]> {
    return this.collectionRepo.find();
  }
  async updateCollectionCurrentFloorPrice(collectionId: string, floorPrice: number): Promise<void> {
    try {
      await this.collectionRepo.update(collectionId, { current_floor_price: floorPrice });

      console.log(`Updated floor price for collection ${collectionId} to ${floorPrice}`);
    } catch (error) {
      console.error(`Error updating floor price for collection ${collectionId}:`, error);
      throw error;
    }
  }

  async storeFloorPriceMetrics(metrics: Partial<CollectionMetrics>): Promise<void> {
    try {
      if (!metrics.collection || !metrics.timestamp || metrics.floor_price === undefined) {
        throw new Error('Missing required fields for CollectionMetrics');
      }

      await this.metricsRepo.save(metrics);
      console.log(`Stored floor price metrics for collection ${metrics.collection.collection_id}`);
    } catch (error) {
      console.error('Error storing floor price metrics:', error);
      throw error;
    }
  }

  async updateNonFloorListings(collectionId: string, floorTokenIds: string[]): Promise<void> {
    try {
      const subQuery = this.listingRepo.createQueryBuilder("listing")
        .select("listing.listing_id")
        .innerJoin("listing.nft", "nft")
        .innerJoin("nft.collection", "collection")
        .where("collection.collection_id = :collectionId", { collectionId })
        .andWhere("nft.token_id NOT IN (:...floorTokenIds)", { floorTokenIds });

      await this.listingRepo.createQueryBuilder()
        .update(Listing)
        .set({ is_floor: false, last_updated_at: new Date() })
        .where(`listing_id IN (${subQuery.getQuery()})`)
        .andWhere("status = :status", { status: 'ACTIVE' })
        .setParameters(subQuery.getParameters())
        .execute();

      console.log(`Updated non-floor listings for collection ${collectionId}`);
    } catch (error) {
      console.error(`Error updating non-floor listings for collection ${collectionId}:`, error);
      throw error;
    }
  }

  async upsertListing(listingData: Partial<Listing>): Promise<void> {
    try {
      const collection = await this.collectionRepo.findOneOrFail({
        where: { collection_id: listingData.nft?.collection?.collection_id }
      });

      // Check if the NFT exists, if not create it
      let nft = await this.nftRepo.findOne({
        where: {
          token_id: listingData.nft?.token_id,
          collection: { collection_id: collection.collection_id }
        }
      });

      if (!nft) {
        nft = this.nftRepo.create({
          nft_id: `${collection.collection_id}-${listingData.nft?.token_id}`,
          token_id: listingData.nft?.token_id,
          collection: collection
        });
        await this.nftRepo.save(nft);
      }

      // Find existing listing
      const existingListing = await this.listingRepo.findOne({
        where: { nft: { nft_id: nft.nft_id } }
      });

      if (existingListing) {
        // Update existing listing
        await this.listingRepo.update(existingListing.listing_id, {
          seller_address: listingData.seller_address,
          current_price: listingData.current_price,
          marketplace: listingData.marketplace,
          listed_at: listingData.listed_at,
          last_updated_at: new Date(),
          is_floor: listingData.is_floor,
          status: listingData.status,
          rarity_score: listingData.rarity_score,
          update_count: existingListing.update_count + 1
        });
      } else {
        // Create new listing
        const newListing = this.listingRepo.create({
          nft: nft,
          seller_address: listingData.seller_address,
          current_price: listingData.current_price,
          initial_price: listingData.current_price,
          marketplace: listingData.marketplace,
          listed_at: listingData.listed_at,
          last_updated_at: new Date(),
          is_floor: listingData.is_floor,
          status: listingData.status,
          rarity_score: listingData.rarity_score,
          update_count: 0
        });
        await this.listingRepo.save(newListing);
      }
    } catch (error) {
      console.error('Error upserting listing:', error);
      throw error;
    }
  }

  async getNFTById(nftId: string): Promise<NFT | null> {
    return this.nftRepo.findOne({ where: { nft_id: nftId } });
  }

  async getActiveListingForNFT(nftId: string): Promise<Listing | null> {
    return this.listingRepo.findOne({
      where: { nft: { nft_id: nftId }, status: 'ACTIVE' }
    });
  }

  async getActiveFloorListingForNFT(nftId: string): Promise<Listing | null> {
    return this.listingRepo.findOne({
      where: {
        nft: { nft_id: nftId },
        status: 'ACTIVE',
        is_floor: true
      }
    });
  }

  async updateListing(listingId: number, updateData: Partial<Listing>): Promise<void> {
    await this.listingRepo.update(listingId, updateData);
  }

  async createSale(saleData: Partial<Sale>): Promise<Sale> {
    try {
      const newSale = this.saleRepo.create(saleData);
      const savedSale = await this.saleRepo.save(newSale);
      console.log(`Created new sale record with ID ${savedSale.sale_id}`);
      return savedSale;
    } catch (error) {
      console.error('Error creating sale record:', error);
      throw error;
    }
  }


  async saleExists(transactionHash: string): Promise<boolean> {
    const sale = await this.saleRepo.findOne({
      where: { transaction_hash: transactionHash }
    });
    return !!sale;
  }

  async clearCurrentBids(collectionId: string): Promise<void> {
    await this.currentBidRepo.delete({ collection: { collection_id: collectionId } });
  }

  async insertCurrentBid(bidRecord: Partial<CurrentBid>): Promise<void> {
    await this.currentBidRepo.save(bidRecord);
  }

  async insertBidHistory(bidRecord: Partial<BidHistory>): Promise<void> {
    await this.bidHistoryRepo.save(bidRecord);
  }

  async getCurrentBestBid(collectionId: string): Promise<CurrentBid | null> {
    return await this.currentBidRepo.createQueryBuilder("bid")
      .where("bid.collection_id = :collectionId", { collectionId })
      .orderBy("bid.price", "DESC")
      .addOrderBy("bid.last_updated", "DESC")
      .getOne();
  }

  async getBestCurrentBidsForCollections(): Promise<{ [key: string]: CurrentBid }> {
    const bestBids = await this.currentBidRepo.createQueryBuilder("bid")
      .innerJoinAndSelect("bid.collection", "collection")
      .where((qb) => {
        const subQuery = qb.subQuery()
          .select("MAX(sub_bid.price)")
          .from(CurrentBid, "sub_bid")
          .where("sub_bid.collection_id = bid.collection_id")
          .getQuery();
        return "bid.price = " + subQuery;
      })
      .getMany();

    return bestBids.reduce((acc, bid) => {
      acc[bid.collection.collection_id] = bid;
      return acc;
    }, {} as { [key: string]: CurrentBid });
  }

  async getCollectionSalesLast24Hours(collectionId: string) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const sales = await this.saleRepo.createQueryBuilder('sale')
      .innerJoinAndSelect('sale.nft', 'nft')
      .innerJoinAndSelect('nft.collection', 'collection')
      .where('collection.collection_id = :collectionId', { collectionId })
      .andWhere('sale.sold_at > :twentyFourHoursAgo', { twentyFourHoursAgo })
      .getMany();

    const askSales = sales.filter(sale => sale.side === 'ASK');
    const bidSales = sales.filter(sale => sale.side === 'BID'); // todo: Fix data input, currently its not correct as only bids are counted where the nft has been listed for floor before

    const askCount = askSales.length;
    const bidCount = bidSales.length;


    // Calculate total prices
    const askTotalPrice = askSales.reduce((sum, sale) => {
      const price = parseFloat(sale.price.toString());
      if (isNaN(price)) {
        console.error('Invalid price:', sale.price);
        return sum;
      }
      return sum + price;
    }, 0);

    const bidTotalPrice = bidSales.reduce((sum, sale) => {
      const price = parseFloat(sale.price.toString());
      if (isNaN(price)) {
        console.error('Invalid price:', sale.price);
        return sum;
      }
      return sum + price;
    }, 0);



    // Calculate average prices, handling division by zero
    const askAvgPrice = askCount > 0 ? askTotalPrice / askCount : 0;
    const bidAvgPrice = bidCount > 0 ? bidTotalPrice / bidCount : 0;

    return {
      askTaken: askCount,
      askAvgPrice: askAvgPrice,
      bidsTaken: bidCount,
      bidAvgPrice: bidAvgPrice
    };
  }
  async getAllCollectionsFloorPriceHistory(range: '24h' | '7d' | '30d' = '24h') {
    const now = new Date();
    let fromDate: Date;
    switch (range) {
        case '7d':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default: // '24h'
            fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const metrics = await this.metricsRepo.createQueryBuilder('metrics')
        .innerJoinAndSelect('metrics.collection', 'collection')
        .where('metrics.timestamp > :fromDate', { fromDate })
        .orderBy('metrics.timestamp', 'ASC')
        .getMany();

    const floorPriceHistory: Record<string, Record<number, { sum: number, count: number }>> = {};
    metrics.forEach(metric => {
        const collectionId = metric.collection.collection_id;
        let timeGroup: number;

        // Group by hour for '24h', otherwise by day for '7d' and '30d'
        if (range === '24h') {
            timeGroup = new Date(metric.timestamp).setMinutes(0, 0, 0); // Hourly
        } else {
            timeGroup = new Date(metric.timestamp).setHours(0, 0, 0, 0); // Daily
        }

        const floorPrice = parseFloat(metric.floor_price.toString());

        if (!floorPriceHistory[collectionId]) {
            floorPriceHistory[collectionId] = {};
        }

        if (!floorPriceHistory[collectionId][timeGroup]) {
            floorPriceHistory[collectionId][timeGroup] = { sum: 0, count: 0 };
        }

        floorPriceHistory[collectionId][timeGroup].sum += floorPrice;
        floorPriceHistory[collectionId][timeGroup].count += 1;
    });

    // Calculate average and format the data
    const formattedHistory: Record<string, Array<{ timestamp: number, floorPrice: number }>> = {};
    
    Object.entries(floorPriceHistory).forEach(([collectionId, timeData]) => {
        formattedHistory[collectionId] = Object.entries(timeData).map(([timestamp, data]) => ({
            timestamp: parseInt(timestamp),
            floorPrice: data.sum / data.count
        }));

        // Ensure we have the required number of data points based on the range
        const data = formattedHistory[collectionId];
        const requiredPoints = range === '24h' ? 24 : (range === '7d' ? 7 : 30);

        if (data.length < requiredPoints) {
            const firstTimestamp = data[0]?.timestamp || fromDate.getTime();
            const lastKnownPrice = data[data.length - 1]?.floorPrice || 0;

            for (let i = 0; i < requiredPoints; i++) {
                const timestamp = range === '24h'
                    ? firstTimestamp + (i * 60 * 60 * 1000) // Hourly intervals
                    : firstTimestamp + (i * 24 * 60 * 60 * 1000); // Daily intervals

                if (!data.find(d => d.timestamp === timestamp)) {
                    data.push({ timestamp, floorPrice: lastKnownPrice });
                }
            }

            // Sort after adding missing data points
            data.sort((a, b) => a.timestamp - b.timestamp);
        }

        // Keep only the required number of data points
        formattedHistory[collectionId] = data.slice(-requiredPoints);
    });

    return formattedHistory;
}

  async getBidPrice24HoursAgo(collectionId: string): Promise<number | null> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const bidHistory = await this.bidHistoryRepo.createQueryBuilder('bidHistory')
      .where('bidHistory.collection = :collectionId', { collectionId })
      .andWhere('bidHistory.timestamp <= :twentyFourHoursAgo', { twentyFourHoursAgo })
      .orderBy('bidHistory.timestamp', 'DESC')
      .getOne();

    return bidHistory ? bidHistory.price : null;
  }

  async getBidPrices24HoursAgoForAllCollections(): Promise<Record<string, number | null>> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const metrics = await this.metricsRepo.createQueryBuilder('metrics')
      .innerJoinAndSelect('metrics.collection', 'collection')
      .where('metrics.timestamp <= :twentyFourHoursAgo', { twentyFourHoursAgo })
      .orderBy('metrics.timestamp', 'DESC')
      .getMany();

    const result: Record<string, number | null> = {};
    for (const metric of metrics) {
      if (!result[metric.collection.collection_id]) {
        result[metric.collection.collection_id] = metric.best_bid_price;
      }
    }

    return result;
  }

  async getAllCollectionsBidPrices(): Promise<Record<string, { currentBidPrice: number, bidPrice24hAgo: number | null }>> {
    const collections = await this.collectionRepo.find();
    const result: Record<string, { currentBidPrice: number, bidPrice24hAgo: number | null }> = {};

    for (const collection of collections) {
      const currentBid = await this.currentBidRepo.findOne({ where: { collection: { collection_id: collection.collection_id } } });
      const bidPrice24hAgo = await this.getBidPrice24HoursAgo(collection.collection_id);

      result[collection.collection_id] = {
        currentBidPrice: currentBid ? currentBid.price : 0,
        bidPrice24hAgo: bidPrice24hAgo
      };
    }

    return result;
  }

  /**
   * Aggregates price data for the given collection and timeframe.
   * @param collectionAddress - Collection ID (contract address).
   * @param timeframe - Timeframe interval (e.g., '1h', '4h', '1d').
   * @param from - Start Unix timestamp in seconds.
   * @param to - End Unix timestamp in seconds.
   * @returns Array of aggregated price data.
   */
  async getPriceData(collectionAddress: string, timeframe: string, from: number, to: number): Promise<Array<{ time: number, open: number, high: number, low: number, close: number }>> {
    const collection = await this.collectionRepo.findOne({ where: { collection_id: collectionAddress } });
    if (!collection) {
      throw new Error(`Collection with symbol ${collectionAddress} not found`);
    }

    // Define timeframe in milliseconds
    const timeframeMs = this.parseTimeframe(timeframe);
    if (!timeframeMs) {
      throw new Error(`Invalid timeframe: ${timeframe}`);
    }

    // Convert Unix timestamps to JavaScript Date objects
    const fromDate = new Date(from * 1000);
    const toDate = new Date(to * 1000);

    // Fetch sales data
    const sales = await this.saleRepo.find({
      where: {
        nft: { collection: { collection_id: collectionAddress } },
        sold_at: Between(fromDate, toDate)
      },
      order: { sold_at: 'ASC' }
    });

    // Fetch floor price data
    const floorPrices = await this.metricsRepo.find({
      where: {
        collection: { collection_id: collectionAddress },
        timestamp: Between(fromDate, toDate)
      },
      order: { timestamp: 'ASC' }
    });

    // Initialize intervals
    const intervals: { [key: number]: { open?: number, high?: number, low?: number, close?: number } } = {};
    for (let timestamp = from; timestamp <= to; timestamp += timeframeMs / 1000) {
      intervals[timestamp] = {};
    }

    // Aggregate open and close from sales
    sales.forEach(sale => {
      const saleTime = Math.floor(sale.sold_at.getTime() / 1000);
      const intervalStart = from + Math.floor((saleTime - from) / (timeframeMs / 1000)) * (timeframeMs / 1000);
      const interval = intervals[intervalStart];
      if (interval) {
        if (!interval.open) {
          interval.open = Number(sale.price);
        }
        interval.close = Number(sale.price);
      }
    });

    // Aggregate high and low from floor prices
    floorPrices.forEach((metric) => {
      const metricTime = Math.floor(metric.timestamp.getTime() / 1000);
      const intervalStart =
        from + Math.floor((metricTime - from) / (timeframeMs / 1000)) * (timeframeMs / 1000);
      const interval = intervals[intervalStart];
      if (interval && metric.floor_price !== null) {
        if (interval.high === undefined || metric.floor_price > interval.high) {
          interval.high = Number(metric.floor_price);
        }
        if (interval.low === undefined || metric.floor_price < interval.low) {
          interval.low = Number(metric.floor_price);
        }
      }
    });
    // Handle missing close prices and carry forward the last known close price
    let lastClosePrice = 0;
    // Fetch the last close price before the 'from' timestamp
    const lastSaleBeforeFrom = await this.saleRepo.findOne({
      where: {
        nft: { collection: { collection_id: collectionAddress } },
        sold_at: LessThanOrEqual(fromDate),
      },
      order: { sold_at: 'DESC' },
    });

    if (lastSaleBeforeFrom) {
      lastClosePrice = Number(lastSaleBeforeFrom.price);
    } else {
      // If no sales before 'from', check floor price metrics
      const lastMetricBeforeFrom = await this.metricsRepo.findOne({
        where: {
          collection: { collection_id: collectionAddress },
          timestamp: LessThanOrEqual(fromDate),
        },
        order: { timestamp: 'DESC' },
      });
      if (lastMetricBeforeFrom && lastMetricBeforeFrom.floor_price !== null) {
        lastClosePrice = Number(lastMetricBeforeFrom.floor_price);
      }
    }


    // Prepare the final price data with fallback logic
    const priceData: { time: number; open: number; high: number; low: number; close: number; }[] | PromiseLike<{ time: number; open: number; high: number; low: number; close: number; }[]> = [];

    // Sort the interval keys to ensure chronological order
    const sortedTimestamps = Object.keys(intervals)
      .map((ts) => parseInt(ts))
      .sort((a, b) => a - b);

    sortedTimestamps.forEach((ts) => {
      const data = intervals[ts];
      let open = data.open !== undefined ? data.open : lastClosePrice;
      let close = data.close !== undefined ? data.close : lastClosePrice;
      let high = data.high !== undefined ? data.high : lastClosePrice;
      let low = data.low !== undefined ? data.low : lastClosePrice;

      // Update lastClosePrice for the next interval
      if (close !== undefined && close !== 0) {
        lastClosePrice = close;
      }

      priceData.push({
        time: ts,
        open: open,
        high: high,
        low: low,
        close: close,
      });
    });

    return priceData;

  }

  /**
   * Parses a timeframe string into milliseconds.
   * @param timeframe - Timeframe string (e.g., '1h', '4h', '1d').
   * @returns Timeframe in milliseconds or null if invalid.
   */
  private parseTimeframe(timeframe: string): number | null {
    const match = timeframe.match(/^(\d+)([hdm])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      default:
        return null;
    }
  }
  /**
   * Retrieves the current floor price for a specific collection.
   * @param collectionId - The ID of the collection.
   * @returns The current floor price.
   */
  async getCurrentFloorPrice(collectionId: string): Promise<number> {
    try {
      const collection = await this.collectionRepo.findOne({
        where: { collection_id: collectionId },
      });

      if (!collection) {
        throw new Error(`Collection with ID ${collectionId} not found.`);
      }

      return collection.current_floor_price || 0;
    } catch (error) {
      console.error(`Error fetching floor price for collection ${collectionId}:`, error);
      throw error;
    }
  }

  /**
 * Save a new user bid.
 * @param userBid - Partial<any> object containing bid details.
 * @returns The saved UserBid entity.
 */
  async saveUserBid(userBid: Partial<UserBid>): Promise<UserBid> { // Using any for flexibility
    try {
      const savedBid = await this.userBidRepo.save(userBid);
      console.log(`Saved UserBid with ID ${savedBid.id}`);
      return savedBid;
    } catch (error) {
      console.error("Error saving UserBid:", error);
      throw error;
    }
  }

  /**
 * Retrieve all active user bids.
 * @returns An array of active UserBid entities.
 */
  async getActiveUserBids(): Promise<UserBid[]> { // Using any[] for consistency
    try {
      return await this.userBidRepo.find({
        where: { status: "ACTIVE" },
        relations: ["collection"],
      });
    } catch (error) {
      console.error("Error fetching active UserBids:", error);
      throw error;
    }
  }

  /**
 * Update the status of a user bid.
 * @param bidId - The ID of the bid to update.
 * @param status - The new status ("CANCELED" or "COMPLETED").
 */
  async updateUserBidStatus(bidId: number, status: "CANCELED" | "COMPLETED"): Promise<void> {
    try {
      const updateData: Partial<any> = { status };
      if (status === "CANCELED") {
        updateData.canceledAt = new Date();
      }
      await this.userBidRepo.update(bidId, updateData);
      console.log(`Updated UserBid ID ${bidId} to status ${status}`);
    } catch (error) {
      console.error(`Error updating UserBid ID ${bidId}:`, error);
      throw error;
    }
  }

     /**
     * Retrieves a user bid by its ID.
     * @param bidId - The ID of the bid to retrieve.
     * @returns The user bid if found, or null if not found.
     */
     async getUserBidById(bidId: number): Promise<UserBid | null> {
      try {
          const userBid = await this.userBidRepo.findOne({ where: { id: bidId }, relations: ["collection"] });
          return userBid || null; 
      } catch (error) {
          console.error(`Error retrieving UserBid ID ${bidId}:`, error);
          throw error;
      }
  }

}


