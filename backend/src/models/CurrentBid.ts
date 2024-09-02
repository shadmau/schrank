import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";

@Entity()
export class CurrentBid {
  @PrimaryGeneratedColumn()
  bid_id!: number;

  @ManyToOne("Collection", "currentBids")
  @JoinColumn({ name: "collection_id" })
  collection: any;

  @Column("decimal", { precision: 10, scale: 2 })
  price!: number;

  @Column()
  executable_size!: number;

  @Column()
  number_bidders!: number;

  @Column("text")
  bidder_addresses_sample!: string;

  @Column()
  criteria_type!: string;

  @Column("json")
  criteria_value!: any;

  @Column()
  last_updated!: Date;
}