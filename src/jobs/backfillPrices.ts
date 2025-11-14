import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeDatabase, AppDataSource } from '../config/database';
import { Transaction } from '../entities/Transaction';
import { Wallet } from '../entities/Wallet';
import { PriceService } from '../services/PriceService';
import logger from '../config/logger';

config();

/**
 * Job para backfill de precios históricos en transacciones existentes
 *
 * Este job actualiza las transacciones que no tienen priceAtTransaction
 * con los precios históricos de CoinGecko
 */
async function backfillPrices() {
  try {
    logger.info('========================================');
    logger.info('💰 Backfill de precios históricos');
    logger.info('========================================');

    // Inicializar base de datos
    await initializeDatabase();

    const transactionRepo = AppDataSource.getRepository(Transaction);
    const walletRepo = AppDataSource.getRepository(Wallet);
    const priceService = new PriceService();

    // Obtener transacciones sin precio histórico
    const transactionsWithoutPrice = await transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.priceAtTransaction IS NULL')
      .orderBy('transaction.timestamp', 'ASC')
      .getMany();

    logger.info(`📊 Encontradas ${transactionsWithoutPrice.length} transacciones sin precio histórico`);

    if (transactionsWithoutPrice.length === 0) {
      logger.info('✅ Todas las transacciones ya tienen precios históricos');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const tx of transactionsWithoutPrice) {
      try {
        // Obtener la cartera para saber el tipo de cripto
        const wallet = await walletRepo.findOne({ where: { id: tx.walletId } });

        if (!wallet) {
          logger.warn(`⚠️ Wallet ${tx.walletId} no encontrada para transacción ${tx.txHash}`);
          failed++;
          continue;
        }

        // Obtener precio histórico
        const price = await priceService.getHistoricalPrice(wallet.cryptoType, tx.timestamp);

        // Actualizar transacción solo si se obtuvo el precio
        if (price !== null) {
          tx.priceAtTransaction = price;
          tx.amountUsd = (typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount) * price;
          await transactionRepo.save(tx);
        } else {
          logger.warn(`No se pudo obtener precio para transacción ${tx.txHash}`);
          continue;
        }

        updated++;

        if (updated % 10 === 0) {
          logger.info(`✅ Actualizadas ${updated}/${transactionsWithoutPrice.length} transacciones...`);
        }

        // Pausa para respetar rate limits de CoinGecko (10-50 req/min)
        // 1.5 segundos = ~40 req/min
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        logger.error(`❌ Error actualizando transacción ${tx.txHash}:`, error);
        failed++;

        // Si falla por rate limit, esperar más tiempo
        if (error instanceof Error && error.message.includes('429')) {
          logger.warn('⏸️ Rate limit alcanzado, esperando 60 segundos...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }

    logger.info('\n========================================');
    logger.info(`✅ Backfill completado:`);
    logger.info(`   - Actualizadas: ${updated}`);
    logger.info(`   - Fallidas: ${failed}`);
    logger.info('========================================');

    // Mostrar estadísticas de caché
    const cacheStats = priceService.getCacheStats();
    logger.info(`📦 Caché de precios: ${cacheStats.size} entradas`);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en backfill de precios:', error);
    process.exit(1);
  }
}

// Ejecutar job
backfillPrices();
