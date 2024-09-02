import { Repository } from "typeorm";
import { Sale, NFT, Listing, Collection, CollectionMetrics, CurrentBid, BidHistory } from '../models/entities.js';
import { dataSource } from "../config/database.js";


export class DatabaseService {
  private collectionRepo!: Repository<Collection>;
  private nftRepo!: Repository<NFT>;
  private listingRepo!: Repository<Listing>;
  private saleRepo!: Repository<Sale>;
  private metricsRepo!: Repository<CollectionMetrics>;
  private currentBidRepo!: Repository<CurrentBid>;
  private bidHistoryRepo!: Repository<BidHistory>;

  async initialize() {
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
  
  // async updateNFTOwner(nftId: string, newOwnerAddress: string): Promise<void> {
  //   await this.nftRepo.update(nftId, { owner_address: newOwnerAddress });
  // }

}