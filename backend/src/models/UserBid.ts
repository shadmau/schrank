import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";

@Entity()
export class UserBid {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Collection", "userBids")
  @JoinColumn({ name: "collection_id" })
  collection: any;

  @Column("decimal", { precision: 10, scale: 6 })
  bidPrice!: number;

  @Column("decimal", { precision: 10, scale: 6 })
  minFloorPrice!: number;

  @Column({ type: "varchar", length: 42 })
  bidderAddress!: string;

  @Column({ type: "enum", enum: ["ACTIVE", "CANCELED", "COMPLETED"], default: "ACTIVE" })
  status!: "ACTIVE" | "CANCELED" | "COMPLETED";

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  canceledAt!: Date | null;
}