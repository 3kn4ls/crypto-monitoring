import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeDatabase, AppDataSource } from '../config/database';
import logger from '../config/logger';

config();

/**
 * Job para limpiar la base de datos
 */
async function cleanDatabase() {
  try {
    logger.info('========================================');
    logger.info('🧹 Limpiando base de datos');
    logger.info('========================================');

    // Inicializar base de datos
    await initializeDatabase();

    // Eliminar datos en orden correcto (respetando foreign keys)
    logger.info('Eliminando wallet_performances...');
    await AppDataSource.query('DELETE FROM wallet_performances');

    logger.info('Eliminando transactions...');
    await AppDataSource.query('DELETE FROM transactions');

    logger.info('Eliminando wallets...');
    await AppDataSource.query('DELETE FROM wallets');

    logger.info('========================================');
    logger.info('✅ Base de datos limpiada exitosamente');
    logger.info('========================================');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error limpiando base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar job
cleanDatabase();
