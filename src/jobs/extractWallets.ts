import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeDatabase } from '../config/database';
import { WalletExtractor } from '../services/WalletExtractor';
import { PerformanceAnalyzer } from '../services/PerformanceAnalyzer';
import logger from '../config/logger';

config();

/**
 * Job inicial para extraer las carteras más grandes y analizar su rendimiento
 */
async function extractAndAnalyzeWallets() {
  try {
    logger.info('========================================');
    logger.info('🚀 Iniciando extracción de carteras');
    logger.info('========================================');

    // Inicializar base de datos
    await initializeDatabase();

    const extractor = new WalletExtractor();
    const analyzer = new PerformanceAnalyzer();

    // Extraer carteras de Bitcoin
    logger.info('\n📊 Extrayendo carteras de Bitcoin...');
    const bitcoinWallets = await extractor.extractBitcoinWallets(50);
    logger.info(`✅ ${bitcoinWallets.length} carteras de Bitcoin extraídas`);

    // Extraer carteras de Ethereum
    logger.info('\n📊 Extrayendo carteras de Ethereum...');
    const ethereumWallets = await extractor.extractEthereumWallets(50);
    logger.info(`✅ ${ethereumWallets.length} carteras de Ethereum extraídas`);

    // Analizar rendimiento de todas las carteras
    logger.info('\n🔍 Analizando rendimiento de carteras...');
    await analyzer.analyzeAllWallets();

    // Mostrar top 10 mejores carteras
    logger.info('\n🏆 Top 10 Mejores Carteras por Rendimiento:');
    const topPerformers = await analyzer.getTopPerformers(10);

    topPerformers.forEach((perf, index) => {
      logger.info(
        `${index + 1}. ${perf.wallet.address.substring(0, 10)}... ` +
        `(${perf.wallet.cryptoType}) - ` +
        `Score: ${perf.performanceScore.toFixed(2)}, ` +
        `P/L: ${perf.profitLossPercentage.toFixed(2)}%, ` +
        `Win Rate: ${perf.winRate.toFixed(2)}%`
      );
    });

    logger.info('\n========================================');
    logger.info('✅ Extracción y análisis completados');
    logger.info('========================================');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en extracción de carteras:', error);
    process.exit(1);
  }
}

// Ejecutar job
extractAndAnalyzeWallets();
