import dotenv from 'dotenv';
import BidConditionService from '../services/BidConditionService.js';
import { BidManagementService, BlurUserBid } from '../services/BidManagementService.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { PuppeteerService } from '../services/PuppeteerService.js';
import { sleep } from '../utils/utils.js';
import logger from '../utils/logger.js';

dotenv.config();

async function runBidConditionService() {
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    const puppeteerService = PuppeteerService.getInstance();
    const bidManagementService = new BidManagementService(dbService, puppeteerService);
    const bidConditionService = new BidConditionService(bidManagementService);
    
    const checkAndCancelInterval = 6000; // 6 seconds
    const removeInvalidBidsInterval = 120000; // 2 minutes
    
    logger.info('BidConditionService Runner started.');
    await bidManagementService.login(true).then(console.log).catch(console.error);

    let lastRemoveInvalidBidsTime = 0;

    while (true) {
        const currentTime = Date.now();

        try {
            logger.info('Running checkAndCancelBids...');
            await bidConditionService.checkAndCancelBids();
            logger.info('Completed checkAndCancelBids.');

            if (currentTime - lastRemoveInvalidBidsTime >= removeInvalidBidsInterval) {
                logger.info('Running removeInvalidBids...');
                await bidManagementService.removeInvalidBids();
                logger.info('Completed removeInvalidBids.');
                lastRemoveInvalidBidsTime = currentTime;
            }
        } catch (error) {
            console.error('Error during bid management operations:', error);
        }

        const elapsedTime = Date.now() - currentTime;
        const sleepTime = Math.max(0, checkAndCancelInterval - elapsedTime);
        
        await sleep(sleepTime);
    }
}

runBidConditionService().catch(error => {
    console.error('Fatal error in BidConditionService Runner:', error);
    process.exit(1);
});