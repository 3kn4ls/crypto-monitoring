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

      await this.performanceRepo.save(performance);

      logger.info(
        `Wallet ${wallet.address}: Score ${metrics.performanceScore.toFixed(2)}, ` +
        `P/L ${metrics.profitLossPercentage.toFixed(2)}%`
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
    let totalInflows = 0;
    let totalOutflows = 0;
    let buyCount = 0;
    let sellCount = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    const holdingPeriods: number[] = [];

    // Agrupar compras y ventas
    const buys: Transaction[] = [];
    const sells: Transaction[] = [];

    transactions.forEach((tx) => {
      const amountUsd = tx.amountUsd || tx.amount * (tx.priceAtTransaction || 0);

      if (tx.type === TransactionType.BUY || tx.type === TransactionType.TRANSFER_IN) {
        totalInflows += amountUsd;
        buyCount++;
        buys.push(tx);
      } else if (tx.type === TransactionType.SELL || tx.type === TransactionType.TRANSFER_OUT) {
        totalOutflows += amountUsd;
        sellCount++;
        sells.push(tx);
      }
    });

    // Calcular win rate usando método FIFO (First In, First Out)
    let buyIndex = 0;
    for (const sell of sells) {
      if (buyIndex >= buys.length) break;

      const buy = buys[buyIndex];
      const buyPrice = buy.priceAtTransaction || 0;
      const sellPrice = sell.priceAtTransaction || 0;

      if (buyPrice > 0 && sellPrice > 0) {
        if (sellPrice > buyPrice) {
          winningTrades++;
        } else {
          losingTrades++;
        }

        // Calcular período de holding
        const holdingPeriodMs = sell.timestamp.getTime() - buy.timestamp.getTime();
        const holdingPeriodDays = holdingPeriodMs / (1000 * 60 * 60 * 24);
        holdingPeriods.push(holdingPeriodDays);
      }

      buyIndex++;
    }

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const avgHoldingPeriodDays =
      holdingPeriods.length > 0
        ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
        : 0;

    // Calcular profit/loss
    const profitLossUsd = totalOutflows - totalInflows;
    const profitLossPercentage = totalInflows > 0 ? (profitLossUsd / totalInflows) * 100 : 0;

    // Calcular score de rendimiento
    const performanceScore = calculatePerformanceScore({
      profitLossPercentage,
      winRate,
      transactionCount: transactions.length,
      avgHoldingPeriodDays,
    });

    return {
      profitLossPercentage,
      profitLossUsd,
      totalInflows,
      totalOutflows,
      buyCount,
      sellCount,
      winRate,
      avgHoldingPeriodDays,
      performanceScore,
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
    });

    return performance;
  }
}
