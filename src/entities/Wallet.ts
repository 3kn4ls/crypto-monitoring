import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Transaction } from './Transaction';
import { WalletPerformance } from './WalletPerformance';

export enum CryptoType {
  BITCOIN = 'BITCOIN',
  ETHEREUM = 'ETHEREUM',
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  address: string;

  @Column({
    type: 'enum',
    enum: CryptoType,
  })
  @Index()
  cryptoType: CryptoType;

  @Column('decimal', { precision: 20, scale: 8, default: 0 })
  balance: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  balanceUsd: number;

  @Column({ type: 'int', default: 0 })
  transactionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  firstSeen: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivity: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];

  @OneToMany(() => WalletPerformance, (performance) => performance.wallet)
  performances: WalletPerformance[];
}
