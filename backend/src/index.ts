import { CollectionCrawlerService } from "./services/CollectionCrawlerService.js";
import { DatabaseService } from "./services/DatabaseService.js";
import { FloorPriceService } from "./services/FloorUpdateService.js";
import { PuppeteerService } from "./services/PuppeteerService.js";
import { EventProcessingService } from "./services/EventProcessingService.js";
import { MarketUpdateService } from "./services/MarketUpdateService.js";
import { BidService } from "./services/BidService.js";
import { sleep } from "./utils/utils.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds
const delayBetweenUpdates = 5000; // 5 seconds

let puppeteerService = new PuppeteerService();
const dbService = new DatabaseService();
let isUpdatingMarket = false;

async function initializeServices() {
  console.log('Initializing Services...');
  await dbService.initialize();
  await puppeteerService.initialize();
  console.log('Services initialized successfully');
}

async function updateMarketDataCycle(marketUpdateService: MarketUpdateService) {
  if (isUpdatingMarket) {
    console.log('Market update already in progress. Skipping this cycle.');
    return;
  }

  try {
    isUpdatingMarket = true;
    console.log('Starting market data update...');
    await marketUpdateService.updateMarketData();
    console.log('Market data updated successfully');
  } catch (error) {
    console.error('Error updating market data:', error);
    if (error instanceof Error && error.message.includes('detached Frame')) {
      throw error;
    }
  } finally {
    isUpdatingMarket = false;
  }
}

async function main() {
  await initializeServices();

  // Crawl current top 100 collections
  console.log('Starting collection crawl...');
  const collectionCrawler = new CollectionCrawlerService(dbService, puppeteerService);
  await collectionCrawler.crawlCollections();
  console.log('Collection crawl completed');

  let retryCount = 0;
  while (retryCount < MAX_RETRIES) {
    try {
      const eventProcessingService = new EventProcessingService(dbService, puppeteerService);
      const floorPriceService = new FloorPriceService(dbService, puppeteerService);
      const bidOfferService = new BidService(dbService, puppeteerService);
      const marketUpdateService = new MarketUpdateService(floorPriceService, bidOfferService, eventProcessingService, dbService);

      console.log('Starting market update cycle...');
      while (true) {
        await updateMarketDataCycle(marketUpdateService);
        await sleep(delayBetweenUpdates);
      }

    } catch (error) {
      console.error(`Error in main function (attempt ${retryCount + 1}):`, error);
      retryCount++;

      if (retryCount < MAX_RETRIES) {
        console.log(`Restarting in ${RETRY_DELAY / 1000} seconds...`);
        await sleep(RETRY_DELAY);
        await puppeteerService.close();
        puppeteerService = new PuppeteerService();
        await puppeteerService.initialize();
      } else {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
    }
  }
}

main().catch(console.error);

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await puppeteerService.close();
  process.exit(0);
});