import * as puppeteer from 'puppeteer';
import Queue from 'queue';
import { sleep } from '../utils/utils.js';

export interface Cookie {
  name: string;
  value: string;
  domain: string;
}

export interface RequestOptions {
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  useProxy?: boolean;
  setCookie?: boolean;
  cookies?: Cookie[];
}

export class PuppeteerService {
  private static instance: PuppeteerService;


  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private requestQueue: Queue;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 2000; // 2 seconds minimum between requests
  private PROXY_HOST: string;
  private PROXY_USER: string;
  private PROXY_PASSWORD: string;
  private PROXY_PORT: number;

  private constructor() {
    this.requestQueue = new Queue({ concurrency: 1, autostart: true });
    this.PROXY_HOST = process.env.PROXY_HOST || '';
    this.PROXY_USER = process.env.PROXY_USER || '';
    this.PROXY_PASSWORD = process.env.PROXY_PASSWORD || '';
    this.PROXY_PORT = parseInt(process.env.PROXY_PORT || '0', 10);
    if (process.env.USE_PROXY?.toLowerCase() === 'true') {
      if (!this.PROXY_HOST || !this.PROXY_PORT || !this.PROXY_USER || !this.PROXY_PASSWORD) {
        throw new Error("Proxy settings are incomplete. Please check environment variables.");
      }
    }
  }


  public static getInstance(): PuppeteerService {
    if (!PuppeteerService.instance) {
      PuppeteerService.instance = new PuppeteerService();
    }
    return PuppeteerService.instance;
  }

  private async initialize(useProxy: boolean): Promise<void> {
    if (this.browser) {
      await this.close();
    }

    if (useProxy) {
      if (!this.PROXY_HOST || !this.PROXY_PORT || !this.PROXY_USER || !this.PROXY_PASSWORD) {
        throw new Error('Proxy settings are incomplete. Please check environment variables.');
      }
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          `--proxy-server=${this.PROXY_HOST}:${this.PROXY_PORT}`,
        ],
      });
    } else {
      this.browser = await puppeteer.launch({
        headless: true,
      });
    }
    this.page = await this.browser.newPage();

    if (useProxy) {
      await this.page.authenticate({
        username: this.PROXY_USER,
        password: this.PROXY_PASSWORD,
      });
    }

    await this.setDefaultHeaders();
  }

  private async setDefaultHeaders(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36";
    await this.page.setUserAgent(userAgent);
    await this.page.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }

  public async fetchWithRetry(url: string, options: RequestOptions, retries = 3): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        await this.waitForNextRequest();
        try {

          await this.initialize(options.useProxy || false);

           // Set retries to 6 if we use proxy
           if (options.useProxy) {
            retries = 10;
          }

          if (options.setCookie && options.cookies && this.page) {
            await this.page.setCookie(...options.cookies);
          }

          for (let i = 0; i < retries; i++) {
            try {
              const result = await this.sendRequest(url, options);
              await this.close();
              resolve(result);
              return;
            } catch (error) {
              console.error(`Attempt ${i + 1} failed:`, error);
              if (i === retries - 1) {
                throw error;
              }
              await sleep(5000);
            }
          }
        } catch (error) {
          await this.close();
          reject(error);
        }
      });
    });
  }

  private async waitForNextRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await sleep(waitTime);
    }
    this.lastRequestTime = Date.now();
  }

  private async sendRequest(url: string, options: RequestOptions): Promise<any> {
    if (!this.page) throw new Error('Page not initialized');

    const { method, headers = {}, body } = options;

    if (method === 'POST') {
      await this.page.setRequestInterception(true);
      this.page.once('request', request => {
        const postHeaders = {
          ...request.headers(),
          ...headers,
          'Content-Type': 'application/json'
        };
        request.continue({ method, postData: body, headers: postHeaders });
      });
    } else if (method === 'GET'){
      
      await this.page.setRequestInterception(true);
      this.page.once('request', request => {
        const getHeaders = {
          ...request.headers(),
          ...headers,
          'Content-Type': 'application/json'
        };
        request.continue({ method, headers: getHeaders });
      });

    }

    const response = await this.page.goto(url, {
      // waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    if (!response) {
      throw new Error('No response received');
    }

    const contentType = response.headers()['content-type'];
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      if (response.status() === 407) {
        const content = await this.page.content();
        const excerpt = content.slice(-200);

        console.error(`Proxy error (HTTP 407) content: ${excerpt}. This may indicate that the proxy is out of credit or misconfigured.`);
        throw new Error(`Proxy error (HTTP 407) content: ${excerpt}`);
      }
      const content = await this.page.content();
      const matchedContent = content.match(/<pre.*?>([\s\S]*?)<\/pre>/);
      if (matchedContent && matchedContent[1]) {
        try {
          return JSON.parse(matchedContent[1]);
        } catch (e) {
          throw new Error("Received content is not valid JSON: " + matchedContent[1]);
        }
      } else {
        const excerpt = content.slice(-200);
        throw new Error(`Unable to extract body from the content. Content excerpt: "${excerpt}"`);
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}