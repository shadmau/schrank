import { ethers } from "ethers";

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function normalizePrice(price: string | number): bigint {
    return ethers.parseUnits(price.toString())
}