import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeDatabase } from '../config/database';
import { PerformanceAnalyzer } from '../services/PerformanceAnalyzer';
import logger from '../config/logger';

config();

/**
 * Job para recalcular el análisis de rendimiento de carteras existentes
 */
async function reanalyzePerformance() {
  try {
    logger.info('========================================');
    logger.info('🔄 Recalculando análisis de rendimiento');
    logger.info('========================================');

    // Inicializar base de datos
    await initializeDatabase();

    const analyzer = new PerformanceAnalyzer();

    // Analizar todas las carteras
    logger.info('Analizando rendimiento de todas las carteras...');
    await analyzer.analyzeAllWallets();

    // Mostrar top 10 mejores carteras
    logger.info('\n🏆 Top 10 Mejores Carteras por Rendimiento:');
    const topPerformers = await analyzer.getTopPerformers(10);

    topPerformers.forEach((perf, index) => {
      logger.info(
        `${index + 1}. ${perf.wallet.address.substring(0, 10)}... ` +
        `(${perf.wallet.cryptoType}) - ` +
        `Score: ${perf.performanceScore}, ` +
        `P/L: ${perf.profitLossPercentage}%, ` +
        `Win Rate: ${perf.winRate}%`
      );
    });

    logger.info('\n========================================');
    logger.info('✅ Recálculo completado');
    logger.info('========================================');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error recalculando rendimiento:', error);
    process.exit(1);
  }
}

// Ejecutar job
reanalyzePerformance();
