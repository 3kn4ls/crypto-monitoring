import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wallet } from './Wallet';

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  txHash: string;

  @Column()
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column('decimal', { precision: 20, scale: 8 })
  amount: number;

  @Column('decimal', { precision: 20, scale: 2, nullable: true })
  amountUsd: number;

  @Column('decimal', { precision: 20, scale: 2, nullable: true })
  priceAtTransaction: number;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ nullable: true })
  fromAddress: string;

  @Column({ nullable: true })
  toAddress: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  fee: number;

  @Column({ type: 'int', nullable: true })
  blockNumber: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
