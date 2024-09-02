import { BidService } from "./BidService.js";
import { DatabaseService } from "./DatabaseService.js";
import { EventProcessingService } from "./EventProcessingService.js";
import { FloorPriceService } from "./FloorUpdateService.js";

class MarketUpdateService {
    constructor(
        private floorPriceService: FloorPriceService,
        private bidOfferService: BidService,
        private eventProcessingService: EventProcessingService,
        private dbService: DatabaseService
    ) { }

    async updateMarketData() {
        const collections = await this.dbService.getAllCollections();
        for (const collection of collections) {
            await this.eventProcessingService.processEvents(collection);
            await this.floorPriceService.updateFloorPrices(collection);
            await this.bidOfferService.updateCollectionBids(collection);
        }
    }
}

export { MarketUpdateService };