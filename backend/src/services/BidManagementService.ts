import { ethers } from 'ethers';
import { DatabaseService } from './DatabaseService';
import { PuppeteerService, RequestOptions } from './PuppeteerService';
import { UserBid } from '../models/UserBid';
import { normalizePrice } from '../utils/utils.js';
import logger from '../utils/logger.js';

interface Challenge {
  message: string;
}

interface BidDetails {
  collectionAddress: string;
  bidPrice: bigint;
  minFloorPrice: number;
}

interface BidResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED';
  bidId?: number;
  error?: string;
}
export interface BlurUserBid {
  price: number;
  contractAddress: string;
  executableSize: number;
  openSize: number;
  collectionName?: string; // We'll try to fetch this if possible
}


class BidManagementService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private accessToken: string | null = null;
  private BLUR_WALLET_LOGIN_ADDRESS: string | null = null;
  private removingBids: boolean = false;
  constructor(
    private dbService: DatabaseService,
    private puppeteerService: PuppeteerService
  ) {
    if (!process.env.RPC_URL || !process.env.PRIVATE_KEY) {
      throw new Error('RPC_URL and PRIVATE_KEY must be set');
    }
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
  }
  /** Login to the Blur API
   * Get a challenge from the server to sign with the wallet
   * @param walletAddress 
   * @returns 
   */
  private async getChallenge(walletAddress: string, useProxy: boolean = true): Promise<Challenge> {
    const url = 'https://core-api.prod.blur.io/auth/challenge';
    try {
      const response = await this.puppeteerService.fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
        setCookie: false, // No need to set cookies for this request
        useProxy: useProxy,
      });
      return response as Challenge;
    } catch (error) {
      logger.error('Error getting challenge:', error);
      throw error;
    }
  }

  /**
   * Login to the Blur API
   * Get a challenge from the server to sign with the wallet
   * Sign the challenge with the wallet
   * Send the signature to the server to get an access token
   * @returns 
   */
  public async login(useProxy: boolean = true): Promise<boolean> {
    try {
      const walletAddress = await this.wallet.getAddress();
      this.BLUR_WALLET_LOGIN_ADDRESS = walletAddress;
      logger.info(`Logging in with wallet address: ${walletAddress}`);
      const challenge: Challenge = await this.getChallenge(walletAddress, useProxy);
      logger.debug(`Received challenge: ${challenge.message}`);
      const signature = await this.wallet.signMessage(challenge.message);
      const signInResult = await this.signIn(signature, challenge, useProxy);
      if (signInResult.ok && signInResult.accessToken) {
        this.accessToken = signInResult.accessToken;
        logger.info(`Login successful. Access token: ${this.accessToken} Wallet address: ${walletAddress}`);
        return true;
      } else {
        logger.error("Sign in failed: No access token received");
        return false;
      }
    } catch (error) {
      logger.error("Login failed:", error);
      return false;
    }
  }

  private async signIn(
    signature: string,
    challenge: Challenge,
    useProxy: boolean = true
  ): Promise<{ ok: boolean; accessToken: string | null }> {
    const url = 'https://core-api.prod.blur.io/auth/login';

    try {
      type ChallengeWithSig = Challenge & { signature: string };

      const challengeWithSig: ChallengeWithSig = {
        ...challenge,
        signature: signature
      };

      const options: RequestOptions = {
        method: 'POST',
        body: JSON.stringify(challengeWithSig),
        headers: {
          'Content-Type': 'application/json'
        },
        useProxy: useProxy,
        setCookie: false, // We'll set cookies after successful login
      };

      const response = await this.puppeteerService.fetchWithRetry(url, options) as { accessToken?: string };
      if (response && response.accessToken) {
        return { ok: true, accessToken: response.accessToken };
      } else {
        throw new Error(`accessToken not found in response ${JSON.stringify(response)}`);
      }
    } catch (err) {
      logger.error("Couldn't login. Error:", err);
      return { ok: false, accessToken: null };
    }
  }


  /**
   * Formats the bid by calling the Blur API.
   * @param bidDetails - Details of the bid to be placed.
   * @returns The formatted bid data including signatures.
   */
  private async formatBid(bidDetails: BidDetails, useProxy: boolean = true): Promise<any> {
    if (!this.accessToken || !this.BLUR_WALLET_LOGIN_ADDRESS) {
      throw new Error('Not authenticated. Please login first.');
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const url = 'https://core-api.prod.blur.io/v1/collection-bids/format';
    const payload = {
      price: {
        amount: ethers.formatEther(bidDetails.bidPrice), // Convert wei to ETH string
        unit: 'BETH',
      },
      quantity: 1,
      expirationTime: oneYearFromNow.toISOString(), // Set expiration to 1 year from now
      contractAddress: bidDetails.collectionAddress,
      criteria: {
        type: 'COLLECTION',
        value: {},
      },
    };

    const options: RequestOptions = {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      useProxy: useProxy,
      setCookie: true,
      cookies: [
        {
          name: 'authToken',
          value: this.accessToken,
          domain: '.prod.blur.io'
        },
        {
          name: 'walletAddress',
          value: this.BLUR_WALLET_LOGIN_ADDRESS,
          domain: '.prod.blur.io'
        }
      ]
    };

    try {
      const response = await this.puppeteerService.fetchWithRetry(url, options);
      if (response.success && response.signatures) {
        return response;
      } else {
        const msg = response.message || 'Failed to format bid';
        throw new Error(`Failed to format bid: ${msg}`);
      }
    } catch (error) {
      logger.error('Error formatting bid:', error);
      throw error;
    }
  }

  /**
   * Submits the bid by sending the signed data to the Blur API.
   * @param signature - The signature obtained from formatting the bid.
   * @param marketplaceData - The marketplace data received from the format response.
   * @returns The result of the bid submission.
   */
  private async submitBid(
    signature: string,
    marketplaceData: string,
    useProxy: boolean = true
  ): Promise<any> {
    if (!this.accessToken || !this.BLUR_WALLET_LOGIN_ADDRESS) {
      throw new Error('Not authenticated. Please login first.');
    }

    const url = 'https://core-api.prod.blur.io/v1/collection-bids/submit';
    const payload = {
      signature,
      marketplaceData,
    };

    const options: RequestOptions = {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      useProxy: useProxy,
      setCookie: true,
      cookies: [
        {
          name: 'authToken',
          value: this.accessToken,
          domain: '.prod.blur.io'
        },
        {
          name: 'walletAddress',
          value: this.BLUR_WALLET_LOGIN_ADDRESS,
          domain: '.prod.blur.io'
        }
      ]
    };

    try {
      const response = await this.puppeteerService.fetchWithRetry(url, options);
      return response;
    } catch (error: any) {

      let errorMessage = 'Unknown error';
      if (error && error.message) {
        errorMessage = error.message.slice(0, 250);
      }
      logger.error('Error submitting bid:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Orchestrates the bid posting process: formatting and submitting the bid.
   * @param bidDetails - Details of the bid to be placed.
   * @returns The final result of the bid submission.
   */
  public async postBid(bidDetails: BidDetails, useProxy: boolean = true): Promise<BidResult> {
    try {
      // Step 1: Format the bid
      const formattedBid = await this.formatBid(bidDetails);
      const signatureObj = formattedBid.signatures[0];
      const { signData, marketplaceData } = signatureObj;

      const preparedSignData = this.prepareSignData(signData);


      // Sign the typed data using Ethers.js
      const signedSignature = await this.signTypedData(preparedSignData);

      // Step 2: Submit the bid
      const submission = await this.submitBid(
        signedSignature,
        marketplaceData,
        useProxy
      );

      if (submission.success) {

        const userBid: Partial<any> = {
          collection: bidDetails.collectionAddress,
          bidPrice: Number(ethers.formatEther(bidDetails.bidPrice)),
          minFloorPrice: bidDetails.minFloorPrice,
          bidderAddress: this.wallet.address,
          status: "ACTIVE",
        };

        const savedBid = await this.dbService.saveUserBid(userBid);

        console.info(`Bid placed successfully with ID ${savedBid.id}. Collection: ${bidDetails.collectionAddress}, Bid Price: ${userBid.bidPrice} ETH, Minimum Floor Price: ${bidDetails.minFloorPrice} ETH`);
        return {
          success: true,
          status: 'SUCCESS',
          bidId: savedBid.id,
        };
      } else {
        // Capture up to 250 characters of the error message
        let errorMsg = 'Bid submission failed.';
        if (submission.error) {
          errorMsg = submission.error.slice(0, 250);
        }
        return {
          success: false,
          status: 'FAILED',
          error: errorMsg,
        };
      }
    } catch (error) {
      logger.error('Error posting bid:', error);
      return {
        success: false,
        status: 'FAILED',
        error: (error as Error).message,
      };
    }
  }
  /**
    * Prepares the signData by ensuring all fields are correctly formatted.
    * @param signData - The raw sign data to be prepared.
    * @returns The prepared sign data.
    */
  private prepareSignData(signData: any): any {
    const preparedData = { ...signData };
    if (
      preparedData.value &&
      typeof preparedData.value.nonce === 'object' &&
      'hex' in preparedData.value.nonce
    ) {
      preparedData.value.nonce = preparedData.value.nonce.hex;
    }

    return preparedData;
  }

  /**
   * Signs the typed data using Ethers.js.
   * @param signData - The data to be signed.
   * @returns The signature.
   */
  private async signTypedData(signData: any): Promise<string> {
    try {
      const signature = await this.wallet.signTypedData(
        signData.domain,
        signData.types,
        signData.value
      );
      return signature;
    } catch (error) {
      logger.error('Error signing typed data:', error);
      throw error;
    }
  }

  public async cancelBid(bidId: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.accessToken || !this.BLUR_WALLET_LOGIN_ADDRESS) {
        throw new Error('Not authenticated. Please login first.');
      }
      const bidDetails: UserBid | null = await this.dbService.getUserBidById(bidId);

      if (!bidDetails || bidDetails.status !== "ACTIVE") {
        throw new Error(`Bid ID ${bidId} not found or not active.`);
      }

      const url = 'https://core-api.prod.blur.io/v1/collection-bids/cancel';
      const payload = {
        contractAddress: bidDetails.collection.collection_id,
        criteriaPrices: [
          {
            criteria: {
              type: 'COLLECTION',
              value: {},
            },
            price: bidDetails.bidPrice,
          },
        ],
      };

      const options: RequestOptions = {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        useProxy: false,
        setCookie: true,
        cookies: [
          {
            name: 'authToken',
            value: this.accessToken,
            domain: '.prod.blur.io'
          },
          {
            name: 'walletAddress',
            value: this.BLUR_WALLET_LOGIN_ADDRESS!,
            domain: '.prod.blur.io'
          }
        ]
      };

      const response = await this.puppeteerService.fetchWithRetry(url, options);

      if (response.success) {
        logger.info(`Bid ID ${bidId} canceled successfully. Collection: ${bidDetails.collection.name}, Bid Price: ${bidDetails.bidPrice} ETH`);
        await this.dbService.updateUserBidStatus(bidId, "CANCELED");
        return { success: true };
      } else {
        let errorMsg = 'Bid cancellation failed.';
        if (response.error) {
          errorMsg = response.error.slice(0, 250);
        }
        logger.error(`Bid ID ${bidId} cancellation failed. Error: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      let errorMsg = 'Unknown error during bid cancellation.';
      if (error && error.message) {
        errorMsg = error.message.slice(0, 250);
      }
      logger.error('Error canceling bid:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }


  /**
 * Retrieves all active user bids from database.
 * @returns An array of active UserBid objects.
 */
  public async getAllActiveUserBids(): Promise<UserBid[]> {
    try {
      return await this.dbService.getActiveUserBids();
    } catch (error: any) {
      logger.error(`Error fetching active user bids: ${error.message}`);
      throw error;
    }
  }


  public async removeInvalidBids(useProxy: boolean = true): Promise<void> {
    if (this.removingBids) { logger.info(`Already removing bids.`); return; }
    this.removingBids = true;
    try {
      const blurBids: BlurUserBid[] = await this.fetchUserBids(useProxy)
      const allActiveUserBids: UserBid[] = await this.getAllActiveUserBids();

      const bidsToCancel: number[] = [];

      for (const activeBid of allActiveUserBids) {

        const matchingBlurBid = blurBids.find(blurBid =>
          blurBid.contractAddress.toLowerCase() === activeBid.collection.collection_id.toLowerCase() &&
          normalizePrice(blurBid.price) === normalizePrice(activeBid.bidPrice)
        );

        if (!matchingBlurBid) {
          bidsToCancel.push(activeBid.id)
          logger.info(`Bid ${activeBid.id} marked for cancellation: No matching Blur bid found`);

        }
      }

      for (const blurBid of blurBids) {
        const blurOpenSize = blurBid.openSize;
        let activeBidIds: number[] = []
        for (const activeBid of allActiveUserBids) {
          if (activeBid.collection.collection_id.toLowerCase() === blurBid.contractAddress.toLowerCase() && normalizePrice(blurBid.price) === normalizePrice(activeBid.bidPrice)) {
            activeBidIds.push(activeBid.id)
          }
        }
        let bidsToClose = activeBidIds.length - blurOpenSize
        if (bidsToClose > 0) {
          bidsToCancel.push(...activeBidIds.sort((a, b) => a - b).slice(0, bidsToClose));
          logger.info(`Marked ${bidsToClose} bids for cancellation for collection ${blurBid.contractAddress} at price ${blurBid.price}`);

        }
      }
      logger.info(`Total bids marked for cancellation: ${bidsToCancel}`);

      for (const bidID of bidsToCancel) {
        this.dbService.updateUserBidStatus(bidID, "COMPLETED");
        logger.info(`Successfully marked bid ${bidID} as COMPLETED`);
      }
      this.removingBids = false;
    } catch (err) {
      logger.error(`Couldnt remove invalid bids. Error: ${err}`);
      this.removingBids = false;
    }


  }

  /**
* Retrieves all active user bids from blur.
* @returns An array of active UserBid objects.
*/
  public async fetchUserBids(useProxy: boolean = true): Promise<BlurUserBid[]> {
    if (!this.accessToken || !this.BLUR_WALLET_LOGIN_ADDRESS) {
      throw new Error('Not authenticated. Please login first.');
    }
    const url = "https://core-api.prod.blur.io/v1/collection-bids/user/" + this.BLUR_WALLET_LOGIN_ADDRESS.toLowerCase();

    const options: RequestOptions = {
      method: 'GET',
      useProxy: useProxy,
      setCookie: true,
      cookies: [
        {
          name: 'authToken',
          value: this.accessToken,
          domain: '.prod.blur.io'
        },
        {
          name: 'walletAddress',
          value: this.BLUR_WALLET_LOGIN_ADDRESS!,
          domain: '.prod.blur.io'
        }
      ]
    };

    try {

      const response = await this.puppeteerService.fetchWithRetry(url, options);
      if (response.success && Array.isArray(response.priceLevels)) {

        return response.priceLevels.map((bid: any) => ({
          price: parseFloat(bid.price),
          contractAddress: bid.contractAddress,
          executableSize: bid.executableSize,
          openSize: bid.openSize,
          collectionName: bid.collection?.name // Include collection name if available
        }));


      } else {
        throw new Error(`Unexpected response. Response: ${response}`);

      }

    } catch (error) {
      logger.error('Error fetching user bids:', error);
      throw error;
    }

  }


  /**
   * Retrieves a user bid by its ID.
   * @param bidId - The ID of the bid to retrieve.
   * @returns The user bid if found, or null if not found.
   */
  public async getUserBidById(bidId: number): Promise<UserBid | null> {
    try {
      return await this.dbService.getUserBidById(bidId);
    } catch (error) {
      logger.error(`Error fetching UserBid ID ${bidId}:`, error);
      throw error;
    }
  }
}

export { BidManagementService };
