import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeDatabase, AppDataSource } from '../config/database';
import { WalletExtractor } from '../services/WalletExtractor';
import { PerformanceAnalyzer } from '../services/PerformanceAnalyzer';
import { Transaction, TransactionType } from '../entities/Transaction';
import logger from '../config/logger';
import { MoreThan } from 'typeorm';

config();

/**
 * Monitorea las transacciones de las mejores 10 carteras
 */
async function monitorTopWallets() {
  try {
    logger.info('========================================');
    logger.info('👀 Monitoreando mejores 10 carteras');
    logger.info('========================================');

    const analyzer = new PerformanceAnalyzer();
    const extractor = new WalletExtractor();

    // Obtener las mejores 10 carteras
    const topPerformers = await analyzer.getTopPerformers(10);

    if (topPerformers.length === 0) {
      logger.warn('⚠️  No hay carteras para monitorear. Ejecuta primero extractWallets.');
      return;
    }

    logger.info(`\n📊 Monitoreando ${topPerformers.length} carteras:\n`);

    for (const perf of topPerformers) {
      const wallet = perf.wallet;

      logger.info(
        `\n🔍 Wallet: ${wallet.address.substring(0, 15)}... (${wallet.cryptoType})`
      );
      logger.info(`   Balance: ${wallet.balance.toFixed(4)} | Score: ${perf.performanceScore.toFixed(2)}`);

      // Actualizar información de la cartera
      await extractor.updateWallet(wallet.id);

      // Obtener transacciones recientes (últimas 24 horas)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const transactionRepo = AppDataSource.getRepository(Transaction);

      const recentTransactions = await transactionRepo.find({
        where: {
          walletId: wallet.id,
          timestamp: MoreThan(oneDayAgo),
        },
        order: { timestamp: 'DESC' },
        take: 10,
      });

      if (recentTransactions.length > 0) {
        logger.info(`   📝 Transacciones recientes (últimas 24h):`);

        recentTransactions.forEach((tx) => {
          const emoji =
            tx.type === TransactionType.BUY || tx.type === TransactionType.TRANSFER_IN
              ? '🟢 COMPRA'
              : '🔴 VENTA';

          const amountStr = tx.amount.toFixed(6);
          const timestamp = tx.timestamp.toISOString();

          logger.info(
            `   ${emoji} | ${amountStr} | ${timestamp.substring(0, 19)}`
          );

          // Log detallado para compras/ventas
          if (tx.type === TransactionType.BUY) {
            logger.info(
              `      💰 La cartera ${wallet.address.substring(0, 10)}... ` +
              `COMPRÓ ${amountStr} ${wallet.cryptoType}`
            );
          } else if (tx.type === TransactionType.SELL) {
            logger.info(
              `      💸 La cartera ${wallet.address.substring(0, 10)}... ` +
              `VENDIÓ ${amountStr} ${wallet.cryptoType}`
            );
          }
        });
      } else {
        logger.info('   ℹ️  No hay transacciones recientes');
      }
    }

    logger.info('\n========================================');
    logger.info('✅ Monitoreo completado');
    logger.info('========================================');
  } catch (error) {
    logger.error('❌ Error monitoreando carteras:', error);
    throw error;
  }
}

// Función para ejecutar el monitoreo de forma continua
async function startMonitoring() {
  try {
    // Inicializar base de datos
    await initializeDatabase();

    // Ejecutar inmediatamente
    await monitorTopWallets();

    // Programar ejecuciones periódicas
    const intervalMinutes = parseInt(process.env.MONITOR_INTERVAL_MINUTES || '60');
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`\n⏰ Próximo monitoreo en ${intervalMinutes} minutos...\n`);

    setInterval(async () => {
      await monitorTopWallets();
      logger.info(`\n⏰ Próximo monitoreo en ${intervalMinutes} minutos...\n`);
    }, intervalMs);
  } catch (error) {
    logger.error('❌ Error en monitoreo:', error);
    process.exit(1);
  }
}

// Ejecutar monitoreo
startMonitoring();
