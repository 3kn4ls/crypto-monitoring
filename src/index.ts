import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeDatabase } from './config/database';
import logger from './config/logger';
import cron from 'node-cron';
import { WalletExtractor } from './services/WalletExtractor';
import { PerformanceAnalyzer } from './services/PerformanceAnalyzer';
import { Transaction, TransactionType } from './entities/Transaction';
import { AppDataSource } from './config/database';
import { MoreThan } from 'typeorm';

config();

/**
 * Aplicación principal de monitoreo de carteras cripto
 */
class CryptoMonitoringApp {
  private extractor: WalletExtractor;
  private analyzer: PerformanceAnalyzer;

  constructor() {
    this.extractor = new WalletExtractor();
    this.analyzer = new PerformanceAnalyzer();
  }

  /**
   * Inicializa la aplicación
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🚀 Inicializando Crypto Wallet Monitor...');

      // Crear directorio de logs si no existe
      const fs = require('fs');
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
      }

      // Inicializar base de datos
      await initializeDatabase();

      logger.info('✅ Aplicación inicializada correctamente');
    } catch (error) {
      logger.error('❌ Error inicializando aplicación:', error);
      throw error;
    }
  }

  /**
   * Ejecuta la extracción inicial de carteras
   */
  async runInitialExtraction(): Promise<void> {
    try {
      logger.info('\n========================================');
      logger.info('📊 EXTRACCIÓN INICIAL DE CARTERAS');
      logger.info('========================================\n');

      // Extraer carteras de Bitcoin
      logger.info('Extrayendo carteras de Bitcoin...');
      const bitcoinWallets = await this.extractor.extractBitcoinWallets(50);
      logger.info(`✅ ${bitcoinWallets.length} carteras de Bitcoin extraídas\n`);

      // Extraer carteras de Ethereum
      logger.info('Extrayendo carteras de Ethereum...');
      const ethereumWallets = await this.extractor.extractEthereumWallets(50);
      logger.info(`✅ ${ethereumWallets.length} carteras de Ethereum extraídas\n`);

      // Analizar rendimiento
      logger.info('Analizando rendimiento de carteras...');
      await this.analyzer.analyzeAllWallets();

      // Mostrar top 10
      await this.showTopPerformers();

      logger.info('\n✅ Extracción inicial completada\n');
    } catch (error) {
      logger.error('❌ Error en extracción inicial:', error);
      throw error;
    }
  }

  /**
   * Monitorea las mejores 10 carteras
   */
  async monitorTopWallets(): Promise<void> {
    try {
      logger.info('\n========================================');
      logger.info('👀 MONITOREANDO TOP 10 CARTERAS');
      logger.info('========================================\n');

      const topPerformers = await this.analyzer.getTopPerformers(10);

      if (topPerformers.length === 0) {
        logger.warn('⚠️  No hay carteras para monitorear');
        return;
      }

      for (const perf of topPerformers) {
        const wallet = perf.wallet;

        logger.info(`\n🔍 ${wallet.address.substring(0, 20)}... (${wallet.cryptoType})`);
        logger.info(
          `   Balance: ${wallet.balance.toFixed(4)} | ` +
          `Score: ${perf.performanceScore.toFixed(2)} | ` +
          `Rank: #${perf.rank}`
        );

        // Actualizar información
        await this.extractor.updateWallet(wallet.id);

        // Obtener transacciones recientes
        const recentTransactions = await this.getRecentTransactions(wallet.id);

        if (recentTransactions.length > 0) {
          logger.info(`   📝 Actividad reciente:`);

          recentTransactions.forEach((tx) => {
            this.logTransaction(tx, wallet.address, wallet.cryptoType);
          });
        } else {
          logger.info('   ℹ️  Sin actividad reciente');
        }
      }

      logger.info('\n========================================');
      logger.info(`✅ Monitoreo completado - ${new Date().toISOString()}`);
      logger.info('========================================\n');
    } catch (error) {
      logger.error('❌ Error monitoreando carteras:', error);
      throw error;
    }
  }

  /**
   * Obtiene transacciones recientes de una cartera
   */
  private async getRecentTransactions(walletId: string): Promise<Transaction[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const transactionRepo = AppDataSource.getRepository(Transaction);

    return await transactionRepo.find({
      where: {
        walletId,
        timestamp: MoreThan(oneDayAgo),
      },
      order: { timestamp: 'DESC' },
      take: 5,
    });
  }

  /**
   * Registra una transacción en los logs
   */
  private logTransaction(tx: Transaction, address: string, cryptoType: string): void {
    const type = tx.type === TransactionType.BUY || tx.type === TransactionType.TRANSFER_IN
      ? 'COMPRA'
      : 'VENTA';

    const emoji = type === 'COMPRA' ? '🟢' : '🔴';
    const action = type === 'COMPRA' ? 'COMPRÓ' : 'VENDIÓ';

    logger.info(
      `   ${emoji} ${type}: ${tx.amount.toFixed(6)} ${cryptoType} - ` +
      `${tx.timestamp.toISOString().substring(0, 19)}`
    );

    // Log detallado
    logger.info(
      `      💰 La cartera ${address.substring(0, 15)}... ` +
      `${action} ${tx.amount.toFixed(6)} ${cryptoType}`
    );
  }

  /**
   * Muestra las mejores carteras
   */
  private async showTopPerformers(): Promise<void> {
    logger.info('\n🏆 TOP 10 MEJORES CARTERAS POR RENDIMIENTO:\n');

    const topPerformers = await this.analyzer.getTopPerformers(10);

    topPerformers.forEach((perf, index) => {
      logger.info(
        `${index + 1}. ${perf.wallet.address.substring(0, 20)}... (${perf.wallet.cryptoType})`
      );
      logger.info(
        `   Score: ${perf.performanceScore.toFixed(2)} | ` +
        `P/L: ${perf.profitLossPercentage.toFixed(2)}% | ` +
        `Win Rate: ${perf.winRate.toFixed(2)}%`
      );
    });
  }

  /**
   * Inicia el monitoreo periódico
   */
  startPeriodicMonitoring(): void {
    const intervalMinutes = parseInt(process.env.MONITOR_INTERVAL_MINUTES || '60');

    logger.info(`\n⏰ Monitoreo periódico configurado cada ${intervalMinutes} minutos\n`);

    // Ejecutar cada N minutos
    cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
      await this.monitorTopWallets();
    });
  }

  /**
   * Ejecuta la aplicación en modo completo
   */
  async run(): Promise<void> {
    try {
      await this.initialize();

      // Ejecutar extracción inicial
      await this.runInitialExtraction();

      // Ejecutar monitoreo inmediato
      await this.monitorTopWallets();

      // Iniciar monitoreo periódico
      this.startPeriodicMonitoring();

      logger.info('✅ Aplicación en ejecución. Presiona Ctrl+C para detener.\n');
    } catch (error) {
      logger.error('❌ Error ejecutando aplicación:', error);
      process.exit(1);
    }
  }
}

// Ejecutar aplicación
const app = new CryptoMonitoringApp();
app.run();
