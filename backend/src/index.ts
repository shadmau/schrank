import { CollectionCrawlerService } from "./services/CollectionCrawlerService.js";
import { DatabaseService } from "./services/DatabaseService.js";
import { FloorPriceService } from "./services/FloorUpdateService.js";
import { PuppeteerService } from "./services/PuppeteerService.js";
import { EventProcessingService } from "./services/EventProcessingService.js";
import { MarketUpdateService } from "./services/MarketUpdateService.js";
const puppeteerService = new PuppeteerService();
const dbService = new DatabaseService();

async function main() {
  try {
    await dbService.initialize();
    await puppeteerService.initialize();

    // Crawl current top 100 collections
    const collectionCrawler = new CollectionCrawlerService(dbService, puppeteerService);
    await collectionCrawler.crawlCollections();

    // Process floor prices & events for all collections
    const eventProcessingService = new EventProcessingService(dbService, puppeteerService);
    const floorPriceService = new FloorPriceService(dbService, puppeteerService);

    const marketUpdateService = new MarketUpdateService(floorPriceService, eventProcessingService, dbService);
    await marketUpdateService.updateMarketData();



  } finally {
    await puppeteerService.close();
  }
}

main().catch(console.error);