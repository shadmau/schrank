import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DatabaseService } from "./services/DatabaseService.js";
import { validatePriceDataParams } from "./utils/validators.js";

dotenv.config();

const app = express();
app.use(cors());

const dbService = DatabaseService.getInstance();

async function startServer() {
  if (!dbService.isInitialized()) {
    await dbService.initialize();
  }

  app.get('/api/collections', async (req, res) => {
    try {
      const collections = await dbService.getAllCollections();
      const bestBids = await dbService.getBestCurrentBidsForCollections();
      const bidPrices24HoursAgo = await dbService.getBidPrices24HoursAgoForAllCollections();

      const enrichedCollections = await Promise.all(collections.map(async collection => {
        const salesData = await dbService.getCollectionSalesLast24Hours(collection.collection_id);
        const currentBestBid = bestBids[collection.collection_id];
        const bidPrice24HoursAgo = bidPrices24HoursAgo[collection.collection_id];
        return {
          ...collection,
          bestBid: currentBestBid || null,
          bidPrice24HoursAgo: bidPrice24HoursAgo,
          floorAskTaken: salesData.askTaken,
          floorAskAvgPrice24h: salesData.askAvgPrice.toFixed(6),
          bidSales24h:salesData.bidsTaken,
          bidSalesAvgPrice24h:salesData.bidAvgPrice.toFixed(6)
        };
      }));
      
      res.json(enrichedCollections);
    } catch (error) {
      console.error('Error fetching collections:', error);
      res.status(500).json({ error: 'Error fetching collections' });
    }
  });

  app.get('/api/collections/floor-price-history', async (req, res) => {
    try {
      const history = await dbService.getAllCollectionsFloorPriceHistory();
      res.json(history);
    } catch (error) {
      console.error('Error fetching floor price history:', error);
      res.status(500).json({ error: 'Error fetching floor price history' });
    }
  });

  app.get('/api/price-data', async (req, res) => {
    try {
      const { collectionAddress, timeframe, from, to } = req.query;
      console.log(collectionAddress, timeframe, from, to);
      const validation = validatePriceDataParams(collectionAddress, timeframe, from, to);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.message });
      }

      const priceData = await dbService.getPriceData(
        collectionAddress as string,
        timeframe as string,
        parseInt(from as string),
        parseInt(to as string)
      );

      res.json(priceData);
    } catch (error) {
      console.error('Error fetching price data:', error);
      res.status(500).json({ error: 'Error fetching price data' });
    }
  });


  const port = process.env.API_PORT || 5000;
  const apiUrl = process.env.API_URL || `http://127.0.0.1:${port}`;

  app.listen(Number(port), '0.0.0.0', () => {
    console.log('API server running on ' + apiUrl);
  });
}

startServer().catch(console.error);