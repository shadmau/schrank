import puppeteer, { Browser, Page } from 'puppeteer';
import { sleep } from '../utils/utils.js';
import { puppeteerConfig } from '../config/puppeteer.js';



export class PuppeteerService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 2000; // 2 seconds minimum between requests


  constructor() {
  }

  async initialize() {
    const launchOptions: any = {
      headless: true,
    };



    if (puppeteerConfig.proxy) {
      launchOptions.args = [`--proxy-server=${puppeteerConfig.proxy.server}`];
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();
    const cacheControlHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    await this.page.setExtraHTTPHeaders(cacheControlHeaders);

    if (puppeteerConfig.proxy && puppeteerConfig.proxy.username && puppeteerConfig.proxy.password) {
      await this.page.authenticate({
        username: puppeteerConfig.proxy.username,
        password: puppeteerConfig.proxy.password,
      });
    }

    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36";
    await this.page.setUserAgent(userAgent);
  }



  async fetchPage(url: string): Promise<string> {
    if (!this.page) {
      throw new Error('Puppeteer not initialized');
    }

    const startTime = Date.now();
    await this.page.goto(url);
    const elapsedTime = Date.now() - startTime;
    console.log(`Request to ${url} took ${elapsedTime} ms`);

    return this.page.content();
  }

  async fetchPageWithRetry(url: string, retries = 3, delay = 1000): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.fetchPage(url);
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await sleep(delay);
      }
    }
    throw new Error('Should not reach here');
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

  async fetchJSON(url: string): Promise<any> {
    await this.waitForNextRequest();
    
    if (!this.page) {
      throw new Error('Puppeteer not initialized');
    }

    console.log(`Fetching URL: ${url}`);

    const response = await this.page.goto(url, { waitUntil: 'networkidle0' });
    if (!response) {
      throw new Error('Failed to load the page');
    }

    console.log(`Response status: ${response.status()}`);

    const contentType = response.headers()['content-type'];
    console.log(`Content-Type: ${contentType}`);

    if (contentType && contentType.includes('application/json')) {
      const content = await response.text();
      console.log('JSON content from response:', content.substring(0, 500) + '...');
      return JSON.parse(content);
    } else {
      console.log('Content-Type is not application/json, attempting to find JSON in page content');

      const pageContent = await this.page.content();
      console.log('Page content:', pageContent.substring(0, 500) + '...');

      const result = await this.page.evaluate(() => {
        const jsonElement = document.querySelector('pre');
        return jsonElement ? jsonElement.textContent : null;
      });

      if (!result) {
        console.log('Full page content:', pageContent.substring(0, 500) + '...');
        throw new Error('No JSON content found on the page');
      }

      console.log('Found JSON content:', result.substring(0, 500) + '...');
      return JSON.parse(result);
    }
  }
  async clickAndWait(selector: string, waitForSelector: string) {
    if (!this.page) throw new Error('Puppeteer not initialized');
    await this.page.click(selector);
    await this.page.waitForSelector(waitForSelector);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}