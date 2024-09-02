import dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Sale, NFT, Listing, Collection, CollectionMetrics } from '../models/entities.js';

dotenv.config();

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

const dataSourceOptions: DataSourceOptions = {
  type: "mariadb",  
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "3306"),  
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Sale, NFT, Listing, Collection, CollectionMetrics],
  synchronize: process.env.NODE_ENV !== 'production', 
  logging: true,
  logger: 'advanced-console'
};

console.log('DataSource Options:', JSON.stringify(dataSourceOptions, null, 2));

export const dataSource = new DataSource(dataSourceOptions);