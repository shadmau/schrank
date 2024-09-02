import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";

@Entity()
export class Sale {
  @PrimaryGeneratedColumn()
  sale_id!: number;

  @ManyToOne("NFT", "sales")
  @JoinColumn({ name: "nft_id" })
  nft: any;
  
  @ManyToOne("Listing", "sales", { nullable: true })
  @JoinColumn({ name: "listing_id" })
  listing: any;

  @Column()
  buyer_address!: string;

  @Column()
  seller_address!: string;

  @Column("decimal", { precision: 10, scale: 6 })
  price!: number;

  @Column()
  marketplace!: string;

  @Column({ unique: true })
  transaction_hash!: string;

  @Column()
  sold_at!: Date;

  @Column()
  side!: 'ASK' | 'BID';

}