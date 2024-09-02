import { CollectionCrawlerService } from "./services/CollectionCrawlerService.js";
import { DatabaseService } from "./services/DatabaseService.js";
import { FloorPriceService } from "./services/FloorUpdateService.js";
import { PuppeteerService } from "./services/PuppeteerService.js";
import { EventProcessingService } from "./services/EventProcessingService.js";
import { MarketUpdateService } from "./services/MarketUpdateService.js";
import { BidService } from "./services/BidService.js";

const puppeteerService = new PuppeteerService();
const dbService = new DatabaseService();
const delayBetweenUpdates = 5000; // 5 seconds

async function main() {
  try {
    console.log('Initializing services...');
    await dbService.initialize();
    await puppeteerService.initialize();
    console.log('Services initialized successfully');

    // Initialize other services
    const eventProcessingService = new EventProcessingService(dbService, puppeteerService);
    const floorPriceService = new FloorPriceService(dbService, puppeteerService);
    const bidOfferService = new BidService(dbService, puppeteerService);

    const marketUpdateService = new MarketUpdateService(floorPriceService, bidOfferService, eventProcessingService, dbService);

    // Crawl current top 100 collections
    console.log('Starting collection crawl...');
    const collectionCrawler = new CollectionCrawlerService(dbService, puppeteerService);
    await collectionCrawler.crawlCollections();
    console.log('Collection crawl completed');

    async function updateMarketDataCycle() {
      try {
        console.log('Starting market data update...');
        await marketUpdateService.updateMarketData();
        console.log('Market data updated successfully');
      } catch (error) {
        console.error('Error updating market data:', error);
      } finally {
        setTimeout(updateMarketDataCycle, delayBetweenUpdates);
      }
    }

    console.log('Starting market update cycle...');
    updateMarketDataCycle();

  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main().catch(console.error);

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await puppeteerService.close();
  process.exit(0);
});
