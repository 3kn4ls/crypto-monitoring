import { TransactionType } from '../entities/Transaction';

export interface BlockchairAddress {
  address: string;
  balance: number;
  received: number;
  spent: number;
  transaction_count: number;
  first_seen_receiving: string;
  last_seen_receiving: string;
  first_seen_spending: string;
  last_seen_spending: string;
}

export interface BlockchairTransaction {
  hash: string;
  time: string;
  balance_change: number;
  block_id: number;
}

export interface EtherscanBalance {
  account: string;
  balance: string;
}

export interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
}

export interface WalletData {
  address: string;
  balance: number;
  transactionCount: number;
  firstSeen?: Date;
  lastActivity?: Date;
}

export interface TransactionData {
  txHash: string;
  type: TransactionType;
  amount: number;
  timestamp: Date;
  fromAddress?: string;
  toAddress?: string;
  blockNumber?: number;
  fee?: number;
}

export interface PerformanceMetrics {
  profitLossPercentage: number;
  profitLossUsd: number;
  totalInflows: number;
  totalOutflows: number;
  buyCount: number;
  sellCount: number;
  winRate: number;
  avgHoldingPeriodDays: number;
  performanceScore: number;
  transactionsWithPrice: number;
  totalTransactions: number;
  dataQualityScore: number;
  dataQuality: string;
}
