import { BidHistory, Collection, CurrentBid } from "../models/entities.js";
import { DatabaseService } from "./DatabaseService.js";
import { PuppeteerService } from "./PuppeteerService.js";


interface BidData {
    criteriaType: string;
    criteriaValue: any;
    price: string;
    executableSize: number;
    numberBidders: number;
    bidderAddressesSample: string[];
}

export class BidService {
    constructor(
        private dbService: DatabaseService,
        private puppeteerService: PuppeteerService
    ) { }


    private async fetchBids(contractAddress: string) {
        const url = `https://core-api.prod.blur.io/v1/collections/${contractAddress}/executable-bids?filters={"criteria":{"type":"COLLECTION","value":{}}}`;

        try {
            const content = await this.puppeteerService.fetchJSON(url);
            const bids = content.priceLevels.filter((bid: BidData) => bid.criteriaType === 'COLLECTION'); // only collection bids for now
            if (content.success && Array.isArray(content.priceLevels)) {
                return {
                    success: content.success,
                    bids: bids
                };
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Error fetching bids:', error);
            throw error;
        }
    }

    private async processBids(bids: any, collection: Collection) {
        await this.dbService.clearCurrentBids(collection.collection_id);
        
        const timestamp = new Date();
        for (const bid of bids) {
            const currentBidRecord: Partial<CurrentBid> = {
                collection: collection,
                price: parseFloat(bid.price),
                executable_size: bid.executableSize,
                number_bidders: bid.numberBidders,
                bidder_addresses_sample: JSON.stringify(bid.bidderAddressesSample),
                criteria_type: bid.criteriaType,
                criteria_value: bid.criteriaValue,
                last_updated: timestamp
            };

            // Insert into current_bids table
            await this.dbService.insertCurrentBid(currentBidRecord);

            // Insert into bid_history table
            const bidHistoryRecord: Partial<BidHistory> = {
                ...currentBidRecord,
                timestamp: timestamp
            };
            await this.dbService.insertBidHistory(bidHistoryRecord);
        }
    }

    public async updateCollectionBids(collection: Collection) {
        const { bids } = await this.fetchBids(collection.contract_address);
        await this.processBids(bids, collection);
    }
}
