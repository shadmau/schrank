import { Collection } from "../models/entities";
import { DatabaseService } from "./DatabaseService";
import { PuppeteerService } from "./PuppeteerService";

interface EventData {
    id: number;
    contractAddress: string;
    tokenId: number;
    imageUrl: string;
    eventType: 'ORDER_CREATED' | 'ORDER_CANCELLED' | 'SALE' | string;
    price: {
        amount: number;
        unit: string;
    };
    fromTrader: {
        address: string;
        username: string | null;
    };
    toTrader: {
        address: string;
        username: string | null;
    } | null;
    createdAt: string;
    transactionHash: string | null;
    marketplace: string;
    makerSide: string | null;
}

export class EventProcessingService {
    constructor(
        private dbService: DatabaseService,
        private puppeteerService: PuppeteerService
    ) { }

    async processEvents(collection: Collection) {
        const { success, events } = await this.fetchEvents(collection.contract_address);
        if (!success) {
            console.log("Error fetching events");
            return;
        }

        for (const event of events) {

            if (event.eventType === 'ORDER_CREATED') {
                // No action needed
            } else if (event.eventType === 'SALE') {
                await this.processFloorSaleEvent(event, collection);
            }
            else if (event.eventType === 'TRANSFER') {
                //todo: Update listing, if Event is newer than last update
                await this.processTransferEvent(event, collection);
            }
        }
    }
    
    private async processFloorSaleEvent(event: EventData, collection: Collection) {
        try {
            if (!event.transactionHash) {
                console.log(`Sale Event does not have transaction hash ${collection.collection_id} - ${event.tokenId}`);
                return;
            }

            if (await this.dbService.saleExists(event.transactionHash)) {
                console.log(`Sale with transaction hash ${event.transactionHash} already exists. Skipping.`);
                return null;
            }

            const nftId = `${collection.collection_id}-${event.tokenId}`;
            const nft = await this.dbService.getNFTById(nftId);

            if (!nft) {
                console.log(`NFT not found for token ID ${event.tokenId} in collection ${collection.collection_id}`);
                return;
            }

            // Update the NFT's last sale information
            // await this.dbService.updateNFTSaleInfo(nftId, {
            //     last_sale_price: event.price.amount,
            //     last_sale_currency: event.price.unit,
            //     last_sale_date: new Date(event.createdAt),
            //     last_sale_marketplace: event.marketplace
            // });

            // Update the active listing if it exists
            const activeListing = await this.dbService.getActiveFloorListingForNFT(nftId);
            if (activeListing) {
                const eventDate = new Date(event.createdAt);
                const listingUpdateDate = new Date(activeListing.last_updated_at);

                if (eventDate > listingUpdateDate) {
                    // Update the listing
                    await this.dbService.updateListing(activeListing.listing_id, {
                        status: 'SOLD',
                        last_updated_at: new Date(event.createdAt)
                    });

                    console.log(`Updated listing ${activeListing.listing_id} for NFT ${nftId} due to sale event`);
                } else {
                    return;
                }

            } else {
                console.log(`No active listing found for NFT ${nftId}`);
                return;
            }

            const side = event.makerSide?.toUpperCase() === 'ASK' ? 'ASK' : 'BID';


            await this.dbService.createSale({
                nft: nft,
                listing: activeListing,
                buyer_address: event.toTrader?.address || '',
                seller_address: event.fromTrader.address,
                price: event.price.amount,
                marketplace: event.marketplace,
                transaction_hash: event.transactionHash || '',
                sold_at: new Date(event.createdAt),
                side: side
            });

            // Update NFT owner
            // if (event.toTrader) {
            //     await this.dbService.updateNFTOwner(nftId, event.toTrader.address);
            // }

            console.log(`Processed sale event for NFT ${nftId}`);
        } catch (error) {
            console.error('Error processing sale event:', error);
        }
    }

    private async processTransferEvent(event: EventData, collection: Collection) {
        try {
            // Find the NFT
            const nftId = `${collection.collection_id}-${event.tokenId}`;
            const nft = await this.dbService.getNFTById(nftId);

            if (!nft) {
                console.log(`NFT not found for token ID ${event.tokenId} in collection ${collection.collection_id}`);
                return;
            }
            console.log(`NFT found for token ID ${event.tokenId} in collection ${collection.contract_address}`);

            // Find the active listing for this NFT
            const activeListing = await this.dbService.getActiveListingForNFT(nftId);

            if (activeListing) {
                console.log(`Active listing found for NFT ${nftId}`);
                const eventDate = new Date(event.createdAt);
                const listingUpdateDate = new Date(activeListing.last_updated_at);

                if (eventDate > listingUpdateDate) {
                    // Update the listing
                    await this.dbService.updateListing(activeListing.listing_id, {
                        status: 'TRANSFERRED',
                        last_updated_at: eventDate,
                    });

                    console.log(`Updated listing ${activeListing.listing_id} for NFT ${nftId} due to transfer event`);
                }
            } else {
                console.log(`No active listing found for NFT ${nftId}`);
            }

            // Update NFT owner
            // await this.dbService.updateNFTOwner(nftId, event.toTrader.address);

        } catch (error) {
            console.error('Error processing transfer event:', error);
        }
    }


    private async fetchEvents(contractAddress: string) {
        const filters = { count: 100, contractAddress: contractAddress };

        const url = `https://core-api.prod.blur.io/v1/activity/event-filter?filters=${encodeURIComponent(JSON.stringify(filters))}`;

        try {
            const content = await this.puppeteerService.fetchJSON(url);
            if (content.success && Array.isArray(content.activityItems)) {
                return {
                    success: content.success,
                    events: content.activityItems as EventData[]
                };
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
            throw error;
        }
    }

}