export enum CryptoType {
  BITCOIN = 'BITCOIN',
  ETHEREUM = 'ETHEREUM'
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT'
}

export interface Wallet {
  id: string;
  address: string;
  cryptoType: CryptoType;
  balance: number;
  balanceUsd: number;
  transactionCount: number;
  firstSeen?: Date;
  lastActivity?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  txHash: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  amountUsd?: number;
  priceAtTransaction?: number;
  timestamp: Date;
  fromAddress?: string;
  toAddress?: string;
  fee?: number;
  blockNumber?: number;
  createdAt: Date;
  wallet?: Wallet;
}

export interface WalletPerformance {
  id: string;
  walletId: string;
  analysisDate: Date;
  profitLossPercentage: number;
  profitLossUsd: number;
  totalInflows: number;
  totalOutflows: number;
  buyCount: number;
  sellCount: number;
  winRate: number;
  avgHoldingPeriodDays: number;
  rank: number;
  performanceScore: number;
  createdAt: Date;
  updatedAt: Date;
  wallet?: Wallet;
}

export interface Stats {
  totalWallets: number;
  bitcoinWallets: number;
  ethereumWallets: number;
  totalTransactions: number;
  totalBalanceUsd: number;
  recentTransactions: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
