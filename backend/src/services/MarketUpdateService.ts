import { DatabaseService } from "./DatabaseService.js";
import { EventProcessingService } from "./EventProcessingService.js";
import { FloorPriceService } from "./FloorUpdateService.js";

class MarketUpdateService {
    constructor(
        private floorPriceService: FloorPriceService,
        private eventProcessingService: EventProcessingService,
        private dbService: DatabaseService
    ) { }

    async updateMarketData() {
        const collections = await this.dbService.getAllCollections();
        for (const collection of collections) {
            await this.floorPriceService.updateFloorPrices(collection);
            await this.eventProcessingService.processEvents(collection);
            process.exit(1)
        }
    }
}

export { MarketUpdateService };