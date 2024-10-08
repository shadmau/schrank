import { Index, Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";

@Entity()
@Index("idx_collection_timestamp", ["collection", "timestamp"])
export class CollectionMetrics {
  @PrimaryGeneratedColumn()
  metric_id!: number;

  @ManyToOne("Collection", "metrics")
  collection: any;

  @Column()
  timestamp!: Date;

  @Column("decimal", { precision: 10, scale: 6, nullable: true })
  floor_price!: number;

  @Column({ type: "int" })
  floor_depth!: number;

  @Column("decimal", { precision: 10, scale: 6, nullable: true })
  floor_turnover_rate!: number;

  @Column("decimal", { precision: 10, scale: 6, nullable: true })
  best_bid_price: number;

  @Column({ type: 'int', nullable: true })
  best_bid_depth: number;

  @Column("decimal", { precision: 10, scale: 6, nullable: true })
  volume!: number;

  @Column({ nullable: true })
  unique_buyers!: number;

  @Column({ nullable: true })
  unique_sellers!: number;

  @Column("decimal", { precision: 10, scale: 6, nullable: true })
  average_price!: number;

  @Column({ nullable: true })
  total_listings!: number;

  @Column({ nullable: true })
  total_sales!: number;
}