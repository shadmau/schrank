import { Entity, PrimaryColumn, Column, CreateDateColumn, Unique, OneToMany } from "typeorm";

@Entity()
@Unique(["contract_address"])
export class Collection {
  @PrimaryColumn()
  collection_id!: string;

  @Column()
  name!: string;

  @Column()
  contract_address!: string;

  @Column({ nullable: true })
  image_url?: string;

  @Column("decimal", { precision: 10, scale: 6, nullable: true })
  current_floor_price!: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @OneToMany("NFT", "collection")
  nfts: any[];

  @OneToMany("CurrentBid", "collection")
  currentBids: any[];

  @OneToMany("BidHistory", "collection")
  bidHistories: any[];

  @OneToMany("CollectionMetrics", "collection")
  metrics: any[];
}