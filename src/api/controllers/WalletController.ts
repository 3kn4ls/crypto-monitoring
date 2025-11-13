import { Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { Wallet, CryptoType } from '../../entities/Wallet';
import { Transaction } from '../../entities/Transaction';
import { WalletPerformance } from '../../entities/WalletPerformance';
import logger from '../../config/logger';
import { Between, MoreThan } from 'typeorm';

export class WalletController {
  private walletRepo = AppDataSource.getRepository(Wallet);
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private performanceRepo = AppDataSource.getRepository(WalletPerformance);

  /**
   * GET /api/wallets
   * Obtiene todas las carteras con paginación
   */
  async getAllWallets(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const cryptoType = req.query.cryptoType as CryptoType;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (cryptoType) {
        where.cryptoType = cryptoType;
      }

      const [wallets, total] = await this.walletRepo.findAndCount({
        where,
        order: { balanceUsd: 'DESC' },
        skip,
        take: limit,
      });

      res.json({
        data: wallets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error obteniendo wallets:', error);
      res.status(500).json({ error: 'Error obteniendo wallets' });
    }
  }

  /**
   * GET /api/wallets/top
   * Obtiene las mejores carteras por rendimiento
   */
  async getTopWallets(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const cryptoType = req.query.cryptoType as CryptoType;

      const queryBuilder = this.performanceRepo
        .createQueryBuilder('perf')
        .leftJoinAndSelect('perf.wallet', 'wallet')
        .orderBy('perf.performanceScore', 'DESC')
        .take(limit);

      if (cryptoType) {
        queryBuilder.where('wallet.cryptoType = :cryptoType', { cryptoType });
      }

      const performances = await queryBuilder.getMany();

      res.json({
        data: performances,
      });
    } catch (error) {
      logger.error('Error obteniendo top wallets:', error);
      res.status(500).json({ error: 'Error obteniendo top wallets' });
    }
  }

  /**
   * GET /api/wallets/:id
   * Obtiene detalles de una cartera específica
   */
  async getWalletById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const wallet = await this.walletRepo.findOne({
        where: { id },
        relations: ['performances'],
      });

      if (!wallet) {
        res.status(404).json({ error: 'Wallet no encontrada' });
        return;
      }

      // Obtener performance más reciente
      const latestPerformance = await this.performanceRepo.findOne({
        where: { walletId: id },
        order: { analysisDate: 'DESC' },
      });

      res.json({
        data: {
          ...wallet,
          latestPerformance,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo wallet:', error);
      res.status(500).json({ error: 'Error obteniendo wallet' });
    }
  }

  /**
   * GET /api/wallets/:id/transactions
   * Obtiene transacciones de una cartera
   */
  async getWalletTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string;
      const skip = (page - 1) * limit;

      const where: any = { walletId: id };
      if (type) {
        where.type = type;
      }

      const [transactions, total] = await this.transactionRepo.findAndCount({
        where,
        order: { timestamp: 'DESC' },
        skip,
        take: limit,
      });

      res.json({
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error obteniendo transacciones:', error);
      res.status(500).json({ error: 'Error obteniendo transacciones' });
    }
  }

  /**
   * GET /api/wallets/:id/performance/history
   * Obtiene histórico de rendimiento
   */
  async getPerformanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const performances = await this.performanceRepo.find({
        where: {
          walletId: id,
          analysisDate: MoreThan(startDate),
        },
        order: { analysisDate: 'ASC' },
      });

      res.json({
        data: performances,
      });
    } catch (error) {
      logger.error('Error obteniendo histórico:', error);
      res.status(500).json({ error: 'Error obteniendo histórico' });
    }
  }

  /**
   * GET /api/wallets/stats
   * Obtiene estadísticas generales
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const totalWallets = await this.walletRepo.count();
      const bitcoinWallets = await this.walletRepo.count({
        where: { cryptoType: CryptoType.BITCOIN },
      });
      const ethereumWallets = await this.walletRepo.count({
        where: { cryptoType: CryptoType.ETHEREUM },
      });

      const totalTransactions = await this.transactionRepo.count();

      // Balance total en USD
      const walletsWithBalance = await this.walletRepo.find();
      const totalBalanceUsd = walletsWithBalance.reduce(
        (sum, w) => sum + Number(w.balanceUsd),
        0
      );

      // Transacciones últimas 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentTransactions = await this.transactionRepo.count({
        where: {
          timestamp: MoreThan(oneDayAgo),
        },
      });

      res.json({
        data: {
          totalWallets,
          bitcoinWallets,
          ethereumWallets,
          totalTransactions,
          totalBalanceUsd,
          recentTransactions,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
  }

  /**
   * GET /api/wallets/recent-activity
   * Obtiene actividad reciente de todas las carteras
   */
  async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const transactions = await this.transactionRepo.find({
        relations: ['wallet'],
        order: { timestamp: 'DESC' },
        take: limit,
      });

      res.json({
        data: transactions,
      });
    } catch (error) {
      logger.error('Error obteniendo actividad reciente:', error);
      res.status(500).json({ error: 'Error obteniendo actividad reciente' });
    }
  }
}
