class SeededRandom {
    private seed: number;
  
    constructor(seed: number) {
      this.seed = seed;
    }
  
    random() {
      const x = Math.sin(this.seed++) * 10000;
      return x - Math.floor(x);
    }
  }
  
  const random = new SeededRandom(123); // Use a consistent seed
  
  export const mockCollections = Array.from({ length: 120 }, (_, i) => ({
    id: i + 1,
    name: `NFT Collection ${i + 1}`,
    floorPrice: random.random() * 50 + 0.1,
    floorPriceChange: (random.random() * 20 - 10),
    bidPrice: random.random() * 50,
    bidPriceChange: (random.random() * 20 - 10),
    floorBuys: Math.floor(random.random() * 30),
    floorBidSpread: random.random() * 1,
    bidToFloorRatio: random.random() * 0.2 + 0.9,
    bidDepth: random.random() * 20,
    listingVelocity: Math.floor(random.random() * 100),
    priceHistory: Array.from({ length: 7 }, () => random.random() * 50 + 0.1),
  }));
  
  // Add this type definition
  export type Collection = typeof mockCollections[number];