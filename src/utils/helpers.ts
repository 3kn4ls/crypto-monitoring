import { TransactionType } from '../entities/Transaction';

export function weiToEth(wei: string): number {
  return parseFloat(wei) / 1e18;
}

export function satoshiToBtc(satoshi: number): number {
  return satoshi / 1e8;
}

export function determineTransactionType(
  walletAddress: string,
  fromAddress: string,
  toAddress: string,
  amount: number
): TransactionType {
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedFrom = fromAddress?.toLowerCase();
  const normalizedTo = toAddress?.toLowerCase();

  // Si la wallet recibe fondos
  if (normalizedTo === normalizedWallet && normalizedFrom !== normalizedWallet) {
    return amount > 0 ? TransactionType.BUY : TransactionType.TRANSFER_IN;
  }

  // Si la wallet envía fondos
  if (normalizedFrom === normalizedWallet && normalizedTo !== normalizedWallet) {
    return amount > 0 ? TransactionType.SELL : TransactionType.TRANSFER_OUT;
  }

  // Default
  return TransactionType.TRANSFER_IN;
}

export function calculatePerformanceScore(metrics: {
  profitLossPercentage: number;
  winRate: number;
  transactionCount: number;
  avgHoldingPeriodDays: number;
}): number {
  // Fórmula de puntuación ponderada
  const profitWeight = 0.4;
  const winRateWeight = 0.3;
  const activityWeight = 0.2;
  const holdingWeight = 0.1;

  const profitScore = Math.max(0, Math.min(100, metrics.profitLossPercentage + 50));
  const winRateScore = metrics.winRate;
  const activityScore = Math.min(100, (metrics.transactionCount / 1000) * 100);
  const holdingScore = Math.min(100, (metrics.avgHoldingPeriodDays / 365) * 100);

  return (
    profitScore * profitWeight +
    winRateScore * winRateWeight +
    activityScore * activityWeight +
    holdingScore * holdingWeight
  );
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatCrypto(amount: number, decimals: number = 8): string {
  return amount.toFixed(decimals);
}
