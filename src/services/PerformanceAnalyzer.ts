import { AppDataSource } from '../config/database';
import { Wallet, CryptoType } from '../entities/Wallet';
import { Transaction, TransactionType } from '../entities/Transaction';
import { WalletPerformance } from '../entities/WalletPerformance';
import { PerformanceMetrics } from '../types';
import logger from '../config/logger';
import { calculatePerformanceScore } from '../utils/helpers';

export class PerformanceAnalyzer {
  private walletRepo = AppDataSource.getRepository(Wallet);
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private performanceRepo = AppDataSource.getRepository(WalletPerformance);

  /**
   * Analiza el rendimiento de todas las carteras
   */
  async analyzeAllWallets(): Promise<void> {
    try {
      logger.info('Iniciando análisis de rendimiento de todas las carteras...');

      const wallets = await this.walletRepo.find({
        relations: ['transactions'],
      });

      logger.info(`Analizando ${wallets.length} carteras...`);

      for (const wallet of wallets) {
        await this.analyzeWallet(wallet);
      }

      // Calcular rankings
      await this.calculateRankings();

      logger.info('✅ Análisis de rendimiento completado');
    } catch (error) {
      logger.error('Error analizando carteras:', error);
      throw error;
    }
  }

  /**
   * Analiza el rendimiento de una cartera específica
   */
  async analyzeWallet(wallet: Wallet): Promise<WalletPerformance> {
    try {
      const transactions = await this.transactionRepo.find({
        where: { walletId: wallet.id },
        order: { timestamp: 'ASC' },
      });

      if (transactions.length === 0) {
        logger.warn(`Wallet ${wallet.address} no tiene transacciones`);
        return this.createDefaultPerformance(wallet);
      }

      const metrics = this.calculateMetrics(transactions, wallet);

      // Crear o actualizar registro de rendimiento
      let performance = await this.performanceRepo.findOne({
        where: {
          walletId: wallet.id,
          analysisDate: new Date(),
        },
      });

      if (!performance) {
        performance = this.performanceRepo.create({
          walletId: wallet.id,
          analysisDate: new Date(),
        });
      }

      // Actualizar métricas
      performance.profitLossPercentage = metrics.profitLossPercentage;
      performance.profitLossUsd = metrics.profitLossUsd;
      performance.totalInflows = metrics.totalInflows;
      performance.totalOutflows = metrics.totalOutflows;
      performance.buyCount = metrics.buyCount;
      performance.sellCount = metrics.sellCount;
      performance.winRate = metrics.winRate;
      performance.avgHoldingPeriodDays = metrics.avgHoldingPeriodDays;
      performance.performanceScore = metrics.performanceScore;
      performance.transactionsWithPrice = metrics.transactionsWithPrice;
      performance.totalTransactions = metrics.totalTransactions;
      performance.dataQualityScore = metrics.dataQualityScore;
      performance.dataQuality = metrics.dataQuality;

      await this.performanceRepo.save(performance);

      logger.info(
        `Wallet ${wallet.address}: Score ${metrics.performanceScore.toFixed(2)}, ` +
        `P/L ${metrics.profitLossPercentage.toFixed(2)}%, ` +
        `Data Quality: ${metrics.dataQuality} (${metrics.dataQualityScore.toFixed(1)}%)`
      );

      return performance;
    } catch (error) {
      logger.error(`Error analizando wallet ${wallet.address}:`, error);
      throw error;
    }
  }

  /**
   * Calcula métricas de rendimiento basadas en transacciones
   */
  private calculateMetrics(transactions: Transaction[], wallet: Wallet): PerformanceMetrics {
    // Umbral mínimo para considerar transacciones (0.01 USD o equivalente en crypto)
    // Esto evita porcentajes extremos por transacciones de polvo/spam
    const MIN_TRANSACTION_USD = 0.01;

    let totalInflowsUsd = 0;
    let totalOutflowsUsd = 0;
    let totalInflows = 0;
    let totalOutflows = 0;
    let buyCount = 0;
    let sellCount = 0;
    const holdingPeriods: number[] = [];

    // Métricas de calidad de datos
    let transactionsWithPrice = 0;
    const totalTransactions = transactions.length;

    // Agrupar compras y ventas
    const buys: Transaction[] = [];
    const sells: Transaction[] = [];

    transactions.forEach((tx) => {
      // Convertir amount a número (puede venir como string desde PostgreSQL decimal)
      const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      const amountUsd = tx.amountUsd ? (typeof tx.amountUsd === 'string' ? parseFloat(tx.amountUsd) : tx.amountUsd) : 0;

      // Contar transacciones con precio USD disponible
      if (amountUsd >= MIN_TRANSACTION_USD) {
        transactionsWithPrice++;
      }

      // Filtrar transacciones muy pequeñas (polvo/spam) y transacciones sin precio histórico
      // Solo incluir transacciones con valor USD >= $0.01
      const isSignificant = amountUsd >= MIN_TRANSACTION_USD;

      if (tx.type === TransactionType.BUY || tx.type === TransactionType.TRANSFER_IN) {
        totalInflows += amount;
        if (isSignificant) {
          totalInflowsUsd += amountUsd;
        }
        buyCount++;
        buys.push(tx);
      } else if (tx.type === TransactionType.SELL || tx.type === TransactionType.TRANSFER_OUT) {
        totalOutflows += amount;
        if (isSignificant) {
          totalOutflowsUsd += amountUsd;
        }
        sellCount++;
        sells.push(tx);
      }
    });

    // Calcular holding periods basado en timestamp de compra vs venta
    let buyIndex = 0;
    for (const sell of sells) {
      if (buyIndex >= buys.length) break;

      const buy = buys[buyIndex];

      // Calcular período de holding
      const holdingPeriodMs = sell.timestamp.getTime() - buy.timestamp.getTime();
      const holdingPeriodDays = Math.max(0, holdingPeriodMs / (1000 * 60 * 60 * 24));
      holdingPeriods.push(holdingPeriodDays);

      buyIndex++;
    }

    // Calcular win rate basado en la actividad de trading
    // Si hay más inflows que outflows, asumimos rendimiento positivo
    const totalTrades = Math.min(buyCount, sellCount);
    const winRate = totalTrades > 0 ? ((buyCount / (buyCount + sellCount)) * 100) : 50;

    const avgHoldingPeriodDays =
      holdingPeriods.length > 0
        ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
        : 0;

    // Calcular profit/loss basado en valores USD reales
    const balanceUsd = typeof wallet.balanceUsd === 'string' ? parseFloat(wallet.balanceUsd) : wallet.balanceUsd;
    const balance = typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : wallet.balance;
    const currentValue = balanceUsd || balance;

    // Calcular P/L: (valor actual + lo que se vendió) - lo que se compró
    // Si tenemos precios históricos en USD, usarlos; sino, fallback a cálculo con balance
    let profitLossUsd = totalInflowsUsd > 0 || totalOutflowsUsd > 0
      ? (currentValue + totalOutflowsUsd - totalInflowsUsd)
      : (currentValue + totalOutflows - totalInflows);

    // Limitar a valores razonables para evitar overflow (decimal(20,2) max: ±99,999,999,999,999,999.99)
    profitLossUsd = Math.max(-99999999999999999.99, Math.min(99999999999999999.99, profitLossUsd));

    // Calcular P/L percentage con límites razonables
    let profitLossPercentage = 0;
    if (totalInflowsUsd > 0) {
      profitLossPercentage = (profitLossUsd / totalInflowsUsd) * 100;
    } else if (totalInflows > 0) {
      profitLossPercentage = ((currentValue + totalOutflows - totalInflows) / totalInflows) * 100;
    }

    // Limitar a valores razonables para evitar overflow en BD
    // Máximo: ±999,999,999.99% (límite de decimal(15,2))
    profitLossPercentage = Math.max(-999999999.99, Math.min(999999999.99, profitLossPercentage));

    // Calcular score de rendimiento mejorado
    const volumeUsd = totalInflowsUsd + totalOutflowsUsd;
    const performanceScore = calculatePerformanceScore({
      profitLossPercentage,
      winRate,
      transactionCount: transactions.length,
      avgHoldingPeriodDays,
      balance: currentValue,
      volume: volumeUsd > 0 ? volumeUsd : (totalInflows + totalOutflows),
    });

    // Calcular métricas de calidad de datos
    const dataQualityScore = totalTransactions > 0
      ? (transactionsWithPrice / totalTransactions) * 100
      : 0;

    let dataQuality = 'unknown';
    if (dataQualityScore >= 80) {
      dataQuality = 'excellent'; // >80% de transacciones con precio
    } else if (dataQualityScore >= 50) {
      dataQuality = 'good'; // 50-80%
    } else if (dataQualityScore >= 20) {
      dataQuality = 'fair'; // 20-50%
    } else if (dataQualityScore >= 10) {
      dataQuality = 'poor'; // 10-20%
    } else {
      dataQuality = 'insufficient'; // <10%
    }

    return {
      profitLossPercentage,
      profitLossUsd,
      totalInflows: totalInflowsUsd > 0 ? totalInflowsUsd : totalInflows,
      totalOutflows: totalOutflowsUsd > 0 ? totalOutflowsUsd : totalOutflows,
      buyCount,
      sellCount,
      winRate,
      avgHoldingPeriodDays,
      performanceScore,
      transactionsWithPrice,
      totalTransactions,
      dataQualityScore,
      dataQuality,
    };
  }

  /**
   * Calcula rankings basados en el score de rendimiento
   */
  private async calculateRankings(): Promise<void> {
    try {
      const performances = await this.performanceRepo.find({
        order: { performanceScore: 'DESC' },
      });

      let rank = 1;
      for (const performance of performances) {
        performance.rank = rank++;
        await this.performanceRepo.save(performance);
      }

      logger.info(`✅ Rankings calculados para ${performances.length} carteras`);
    } catch (error) {
      logger.error('Error calculando rankings:', error);
      throw error;
    }
  }

  /**
   * Obtiene las mejores N carteras por rendimiento
   */
  async getTopPerformers(limit: number = 10): Promise<WalletPerformance[]> {
    return await this.performanceRepo.find({
      relations: ['wallet'],
      order: { performanceScore: 'DESC' },
      take: limit,
    });
  }

  /**
   * Crea un registro de rendimiento por defecto
   */
  private createDefaultPerformance(wallet: Wallet): WalletPerformance {
    const performance = this.performanceRepo.create({
      walletId: wallet.id,
      analysisDate: new Date(),
      profitLossPercentage: 0,
      profitLossUsd: 0,
      totalInflows: 0,
      totalOutflows: 0,
      buyCount: 0,
      sellCount: 0,
      winRate: 0,
      avgHoldingPeriodDays: 0,
      performanceScore: 0,
      transactionsWithPrice: 0,
      totalTransactions: 0,
      dataQualityScore: 0,
      dataQuality: 'unknown',
    });

    return performance;
  }
}
