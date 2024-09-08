import { Repository } from "typeorm";
import { Sale, NFT, Listing, Collection, CollectionMetrics, CurrentBid, BidHistory } from '../models/entities.js';
import { dataSource } from "../config/database.js";
import { Between } from 'typeorm';
import BigNumber from 'bignumber.js';

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
      bidAvgPrice:bidAvgPrice
    };
  }

  async getAllCollectionsFloorPriceHistory() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
    const metrics = await this.metricsRepo.createQueryBuilder('metrics')
      .innerJoinAndSelect('metrics.collection', 'collection')
      .where('metrics.timestamp > :twentyFourHoursAgo', { twentyFourHoursAgo })
      .orderBy('metrics.timestamp', 'ASC')
      .getMany();
  
    const floorPriceHistory: Record<string, Record<number, { sum: number, count: number }>> = {};
  
    metrics.forEach(metric => {
      const collectionId = metric.collection.collection_id;
      const hourTimestamp = new Date(metric.timestamp).setMinutes(0, 0, 0);
      const floorPrice = parseFloat(metric.floor_price.toString());
  
  
      if (!floorPriceHistory[collectionId]) {
        floorPriceHistory[collectionId] = {};
      }
  
      if (!floorPriceHistory[collectionId][hourTimestamp]) {
        floorPriceHistory[collectionId][hourTimestamp] = { sum: 0, count: 0 };
      }
  
      floorPriceHistory[collectionId][hourTimestamp].sum += floorPrice;
      floorPriceHistory[collectionId][hourTimestamp].count += 1;
    });
    
  
    // Calculate average and format the data
    const formattedHistory: Record<string, Array<{ timestamp: number, floorPrice: number }>> = {};
  
    Object.entries(floorPriceHistory).forEach(([collectionId, hourlyData]) => {
      formattedHistory[collectionId] = Object.entries(hourlyData).map(([timestamp, data]) => ({
        timestamp: parseInt(timestamp),
        floorPrice: data.sum / data.count
      }));
  
      // Ensure we have 24 data points
      const data = formattedHistory[collectionId];
      if (data.length < 24) {
        const firstTimestamp = data[0]?.timestamp || twentyFourHoursAgo.getTime();
        const lastKnownPrice = data[data.length - 1]?.floorPrice || 0;
  
        for (let i = 0; i < 24; i++) {
          const timestamp = firstTimestamp + (i * 60 * 60 * 1000); // 1 hour intervals
          if (!data.find(d => d.timestamp === timestamp)) {
            data.push({ timestamp, floorPrice: lastKnownPrice });
          }
        }
  
        // Sort after adding missing data points
        data.sort((a, b) => a.timestamp - b.timestamp);
      }
  
      // Keep only the last 24 data points
      formattedHistory[collectionId] = data.slice(-24);
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


  

  // async updateNFTOwner(nftId: string, newOwnerAddress: string): Promise<void> {
  //   await this.nftRepo.update(nftId, { owner_address: newOwnerAddress });
  // }

}
