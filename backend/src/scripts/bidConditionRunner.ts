import dotenv from 'dotenv';
import BidConditionService from '../services/BidConditionService.js';
import { BidManagementService } from '../services/BidManagementService.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { PuppeteerService } from '../services/PuppeteerService.js';
import { sleep } from '../utils/utils.js';

dotenv.config();

async function runBidConditionService() {
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    const puppeteerService = PuppeteerService.getInstance();
    const bidManagementService = new BidManagementService(dbService, puppeteerService);
    const bidConditionService = new BidConditionService(bidManagementService);
    const executeEvery = 6000;
    console.log('BidConditionService Runner started.');
    await bidManagementService.login(true).then(console.log).catch(console.error);

    while (true) {
        try {
            console.log('Running checkAndCancelBids...');
            await bidConditionService.checkAndCancelBids();
            console.log('Completed checkAndCancelBids.');
        } catch (error) {
            console.error('Error during checkAndCancelBids:', error);
        }
        await sleep(executeEvery);
    }
}

runBidConditionService().catch(error => {
    console.error('Fatal error in BidConditionService Runner:', error);
    process.exit(1);
});