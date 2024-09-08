import { DatabaseService } from './DatabaseService.js';
import { PuppeteerService } from './PuppeteerService.js';
import { Collection } from '../models/entities.js';
import { whitelistedAddresses } from '../whitelist.js';

interface CollectionData {
  contractAddress: string;
  name: string;
  collectionSlug: string;
  imageUrl: string;
  volumeOneDay: string;
}

export class CollectionCrawlerService {
  constructor(
    private dbService: DatabaseService,
    private puppeteerService: PuppeteerService
  ) { }

  private async fetchCollections() {
    const filters = { sort: "VOLUME_ONE_DAY", order: "DESC" };
    const url = `https://core-api.prod.blur.io/v1/collections?filters=${encodeURIComponent(JSON.stringify(filters))}`;

    try {
      const content = await this.puppeteerService.fetchJSON(url);

      if (content.success && Array.isArray(content.collections)) {
        return {
          success: content.success,
          totalCount: content.totalCount,
          collections: content.collections as CollectionData[]
        };
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }
  }

  public async crawlCollections() {
    try {
      const { collections, totalCount } = await this.fetchCollections();
      const whitelistedSet = new Set(whitelistedAddresses.map(address => address.toLowerCase()));
      const filteredCollections = collections.filter(c =>
        whitelistedSet.has(c.contractAddress.toLowerCase())
      );

      const formattedCollections: Partial<Collection>[] = filteredCollections.map(c => ({
        collection_id: c.contractAddress,
        name: c.name,
        contract_address: c.contractAddress,
        image_url: c.imageUrl

      }));

      // const formattedCollections: Partial<Collection>[] = collections.slice(0, 100).map(c => ({
      //   collection_id: c.contractAddress,
      //   name: c.name,
      //   contract_address: c.contractAddress,
      // }));

      await this.dbService.storeCollections(formattedCollections);

      console.log(`Processed ${formattedCollections.length} collections. Total available: ${totalCount}`);

      return formattedCollections;
    } catch (error) {
      console.error('Error crawling collections:', error);
      throw error;
    }
  }
}