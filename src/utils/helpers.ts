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
  balance?: number;
  volume?: number;
}): number {
  // Fórmula de puntuación ponderada mejorada
  const profitWeight = 0.3;
  const winRateWeight = 0.2;
  const activityWeight = 0.2;
  const balanceWeight = 0.2;
  const holdingWeight = 0.1;

  // Score de profit/loss: normalizar entre 0-100
  const profitScore = Math.max(0, Math.min(100, metrics.profitLossPercentage + 50));

  // Score de win rate: directamente es un porcentaje 0-100
  const winRateScore = Math.max(0, Math.min(100, metrics.winRate));

  // Score de actividad: basado en número de transacciones
  const activityScore = Math.min(100, (metrics.transactionCount / 1000) * 100);

  // Score de balance: mayor balance = mejor score
  const balanceScore = metrics.balance
    ? Math.min(100, Math.log10(metrics.balance + 1) * 10)
    : 0;

  // Score de holding: períodos más largos pueden ser buenos o malos
  const holdingScore = Math.min(100, (metrics.avgHoldingPeriodDays / 180) * 100);

  return (
    profitScore * profitWeight +
    winRateScore * winRateWeight +
    activityScore * activityWeight +
    balanceScore * balanceWeight +
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
