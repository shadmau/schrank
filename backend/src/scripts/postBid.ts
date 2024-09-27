import { BidManagementService } from '../services/BidManagementService.js';
import { DatabaseService } from '../services/DatabaseService.js';
import dotenv from 'dotenv';
import { PuppeteerService } from '../services/PuppeteerService.js';
import { ethers } from 'ethers';

dotenv.config();

const dbService = DatabaseService.getInstance();

async function postBid() {
    await dbService.initialize();
    const puppeteerService = PuppeteerService.getInstance();

    const bidService = new BidManagementService(dbService, puppeteerService);
    await bidService.login(true).then(console.log).catch(console.error);
    const bidDetails = {
        collectionAddress: '0xCollectionAddress',
        bidPrice: ethers.parseEther('0.29'),
        minFloorPrice: 0.3099,
    }
    const bidResponse = await bidService.postBid(bidDetails, true)
    console.log(bidResponse);

}

postBid();
