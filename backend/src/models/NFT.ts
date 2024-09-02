import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";

@Entity()
export class NFT {
  @PrimaryColumn()
  nft_id!: string;

  @ManyToOne("Collection", "nfts")
  @JoinColumn({ name: "collection_id" })
  collection: any;

  @Column({ type: 'varchar', length: 255 })
  token_id!: number;

  @Column("json", { nullable: true })
  metadata?: any;

  @OneToMany("Listing", "nft")
  listings: any[];

  @OneToMany("Sale", "nft")
  sales: any[];
}