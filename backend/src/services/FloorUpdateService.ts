import { DatabaseService } from './DatabaseService.js';
import { PuppeteerService } from './PuppeteerService.js';
import { Collection, CollectionMetrics, Listing } from '../models/entities.js';
import { sleep } from '../utils/utils.js';
interface TokenData {
    tokenId: string;
    price: {
        amount: string;
        unit: string;
        listedAt: string;
        marketplace: string;
    };
    rarityScore: number;
    owner: {
        address: string;
    };
}

export class FloorPriceService {
    private static instance: FloorPriceService;
    private dbService: DatabaseService;
    private puppeteerService: PuppeteerService;

     private constructor(dbService: DatabaseService, puppeteerService: PuppeteerService) {
        this.dbService = dbService;
        this.puppeteerService = puppeteerService;
    }

    public static getInstance(dbService?: DatabaseService, puppeteerService?: PuppeteerService): FloorPriceService {
        if (!FloorPriceService.instance) {
            if (!dbService || !puppeteerService) {
                throw new Error("DatabaseService and PuppeteerService must be provided for initialization.");
            }
            FloorPriceService.instance = new FloorPriceService(dbService, puppeteerService);
        }
        return FloorPriceService.instance;
    }
    
    async updateFloorPrices(collection: Collection) {
        const floorData = await this.fetchFloorData(collection.contract_address, 20);
        await this.dbService.updateCollectionCurrentFloorPrice(collection.collection_id, floorData.floorPrice);

        // Get the current best bid
        const bestBid = await this.dbService.getCurrentBestBid(collection.collection_id);

        const currentTimestamp = new Date();
        let bestBidAge = null;
        let bestBidWarning = null;

        if (bestBid) {
            bestBidAge = (currentTimestamp.getTime() - bestBid.last_updated.getTime()) / 60000; // Age in minutes
            if (bestBidAge > 5) { // Warning if bid is older than 5 minutes
                bestBidWarning = `Best bid is ${bestBidAge.toFixed(2)} minutes old`;
                console.warn(`Collection ${collection.collection_id}: ${bestBidWarning}`);
            }
        } else {
            console.warn(`Collection ${collection.collection_id}: No best bid found`);
        }

        // Store floor price history, depth, and best bid in collectionMetrics table
        const metrics: Partial<CollectionMetrics> = {
            collection: collection,
            timestamp: currentTimestamp,
            floor_price: floorData.floorPrice,
            floor_depth: floorData.floorListings.length,
            best_bid_price: bestBid ? bestBid.price : 0,
            best_bid_depth: bestBid ? bestBid.executable_size : 0,
        };
        await this.dbService.storeFloorPriceMetrics(metrics);

        // Update listings
        for (const token of floorData.floorListings) {
            const listingData: Partial<Listing> = {
                nft: { token_id: token.tokenId, collection: { collection_id: collection.collection_id } },
                seller_address: token.owner.address,
                current_price: parseFloat(token.price.amount),
                marketplace: token.price.marketplace,
                listed_at: new Date(token.price.listedAt),
                last_updated_at: new Date(),
                is_floor: true,
                status: 'ACTIVE',
                rarity_score: token.rarityScore
            };
            await this.dbService.upsertListing(listingData);

            // Get all token IDs from floor listings
            const floorTokenIds = floorData.floorListings.map(token => token.tokenId);

            await this.dbService.updateNonFloorListings(collection.collection_id, floorTokenIds);

            await sleep(500)
        }
    }

    private async fetchFloorData(contractAddress: string, floorMarginBPS: number): Promise<{ floorPrice: number, floorListings: TokenData[] }> {
        const url = `https://core-api.prod.blur.io/v1/collections/${contractAddress}/tokens?filters=${encodeURIComponent(JSON.stringify({ traits: [], hasAsks: true }))}`;
        const data = await this.puppeteerService.fetchWithRetry(url, { method: 'GET' });

        if (!data.success || !data.tokens || data.tokens.length === 0) {
            throw new Error(`Failed to fetch floor data for collection ${contractAddress}`);
        }

        const floorPrice = parseFloat(data.tokens[0].price.amount);
        const maxFloorPrice = floorPrice * (1 + floorMarginBPS / 10000);

        const floorListings = data.tokens.filter((token: TokenData) =>
            parseFloat(token.price.amount) <= maxFloorPrice
        );
        console.log(`Contract Address: ${contractAddress}, Max floor: ${maxFloorPrice}`);

        return { floorPrice, floorListings };
    }
}