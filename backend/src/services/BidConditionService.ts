import { ethers } from 'ethers';
import { UserBid } from '../models/UserBid.js';
import { DatabaseService } from './DatabaseService.js';
import { BidManagementService } from './BidManagementService.js';
import logger from '../utils/logger.js';


class BidConditionService {
    private dbService: DatabaseService;
    private bidService: BidManagementService;

    constructor(bidService: BidManagementService) {
        this.dbService = DatabaseService.getInstance();
        this.bidService = bidService
    }


    /**
     * Checks active bids against floor price conditions and cancels bids if conditions are met.
     */
    async checkAndCancelBids(): Promise<void> {
        try {
            const activeBids: UserBid[] = await this.dbService.getActiveUserBids();
            const logInterval = 120000; // 2 minutes in milliseconds
            let lastLogTime = Date.now();

            for (const bid of activeBids) {
                // Get the current floor price for the collection
                const currentFloorPrice = ethers.parseUnits((await this.dbService.getCurrentFloorPrice(bid.collection.collection_id)).toString());
                const minimumFloorPrice = ethers.parseUnits(bid.minFloorPrice.toString(), 18);

                // Check if the current floor price meets or exceeds the bid's minimum floor price
                if (currentFloorPrice < minimumFloorPrice) {
                    logger.info(`Cancelling bid ${bid.id} for collection ${bid.collection.collection_id} with current floor price ${ethers.formatEther(currentFloorPrice)} ETH and minimum floor price ${ethers.formatEther(minimumFloorPrice)} ETH`);
                    await this.bidService.cancelBid(bid.id);
                    // Logging the cancellation
                    // console.info(`Bid ID ${bid.id} canceled successfully. Collection: ${bid.collection.collection_id}, Bid Price: ${ethers.formatEther(bid.minFloorPrice)} ETH`);
                }
            }

            // Log every 2 minutes that bids are being checked
            const currentTime = Date.now();
            if (currentTime - lastLogTime >= logInterval) {
                for (const bid of activeBids) {
                    const currentFloorPrice = ethers.parseUnits((await this.dbService.getCurrentFloorPrice(bid.collection.collection_id)).toString());
                    const minimumFloorPrice = ethers.formatEther(bid.minFloorPrice);
                    logger.debug(`Checked bids at ${new Date(currentTime).toISOString()}. Collection: ${bid.collection.collection_id}, Current Floor Price: ${ethers.formatEther(currentFloorPrice)} ETH, Minimum Floor Price: ${minimumFloorPrice} ETH`);
                }
                lastLogTime = currentTime; 
            }
        } catch (error: any) {
            logger.error(`BidConditionService Error: ${error.message}`);
        }
    }
}

export default BidConditionService;