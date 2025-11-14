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

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
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

  // Métricas de calidad de datos
  @Column({ type: 'int', default: 0 })
  transactionsWithPrice: number; // Cantidad de transacciones con precio USD

  @Column({ type: 'int', default: 0 })
  totalTransactions: number; // Total de transacciones analizadas

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  dataQualityScore: number; // % de transacciones con precio (0-100)

  @Column({ type: 'varchar', length: 20, default: 'unknown' })
  dataQuality: string; // 'excellent' (>80%), 'good' (50-80%), 'fair' (20-50%), 'poor' (<20%), 'insufficient' (<10%)

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
