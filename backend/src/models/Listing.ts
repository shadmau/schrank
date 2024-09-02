import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";

@Entity()
export class Listing {
  @PrimaryGeneratedColumn()
  listing_id!: number;

  @ManyToOne("NFT", "listings")
  @JoinColumn({ name: "nft_id" })
  nft: any;

  @Column()
  seller_address!: string;

  @Column("decimal", { precision: 10, scale: 6 })
  current_price!: number;

  @Column("decimal", { precision: 10, scale: 6 })
  initial_price!: number;

  @Column()
  marketplace!: string;

  @Column()
  listed_at!: Date;

  @Column()
  last_updated_at!: Date;

  @Column({ default: false })
  is_floor!: boolean;

  @Column({
    type: "enum",
    enum: ['ACTIVE', 'SOLD', 'CANCELLED', 'TRANSFERRED'],
    default: 'ACTIVE',
  })
  status!: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'TRANSFERRED';

  @Column("decimal", { precision: 10, scale: 4, nullable: true })
  rarity_score?: number;

  @Column({ default: 0 })
  update_count!: number;

  @OneToMany("Sale", "listing")
  sales: any[];
}