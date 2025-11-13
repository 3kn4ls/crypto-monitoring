import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { WalletPerformance } from '../entities/WalletPerformance';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'crypto_monitoring',
  synchronize: true, // En producción, usar migraciones
  logging: process.env.NODE_ENV === 'development',
  entities: [Wallet, Transaction, WalletPerformance],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Base de datos inicializada correctamente');
    return AppDataSource;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
};
