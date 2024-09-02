import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";

@Entity()
export class BidHistory {
  @PrimaryGeneratedColumn()
  bid_id!: number;

  @ManyToOne("Collection", "bidHistories")
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
  timestamp!: Date;
}

