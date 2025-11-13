import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wallet } from './Wallet';

@Entity('wallet_performances')
export class WalletPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.performances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({ type: 'date' })
  @Index()
  analysisDate: Date;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  profitLossPercentage: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  profitLossUsd: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  totalInflows: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  totalOutflows: number;

  @Column({ type: 'int', default: 0 })
  buyCount: number;

  @Column({ type: 'int', default: 0 })
  sellCount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  winRate: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  avgHoldingPeriodDays: number;

  @Column({ type: 'int', default: 0 })
  rank: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  performanceScore: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
