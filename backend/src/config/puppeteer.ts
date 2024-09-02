export interface ProxyConfig {
    server?: string;
    username?: string;
    password?: string;
  }
  
  export const puppeteerConfig: { proxy?: ProxyConfig } = {};
  
  if (process.env.USE_PROXY?.toLowerCase() === 'true' && process.env.PROXY_HOST) {
    puppeteerConfig.proxy = {
      server: process.env.PROXY_HOST,
      username: process.env.PROXY_USER,
      password: process.env.PROXY_PASSWORD,
    };
  }