import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initializeDatabase } from '../config/database';
import logger from '../config/logger';
import walletRoutes from './routes/wallets';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

config();

class ApiServer {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.API_PORT || '3000');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      })
    );

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/wallets', walletRoutes);

    // API info
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Crypto Wallet Monitor API',
        version: '1.0.0',
        endpoints: {
          wallets: '/api/wallets',
          topWallets: '/api/wallets/top',
          stats: '/api/wallets/stats',
          recentActivity: '/api/wallets/recent-activity',
          health: '/health',
        },
      });
    });
  }

  private setupErrorHandlers(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      // Inicializar base de datos
      logger.info('🔌 Conectando a base de datos...');
      await initializeDatabase();

      // Iniciar servidor
      this.app.listen(this.port, '0.0.0.0', () => {
        logger.info(`🚀 API Server corriendo en puerto ${this.port}`);
        logger.info(`📊 Documentación: http://localhost:${this.port}/api`);
        logger.info(`💚 Health check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      logger.error('❌ Error iniciando servidor:', error);
      process.exit(1);
    }
  }
}

// Iniciar servidor
const server = new ApiServer();
server.start();
