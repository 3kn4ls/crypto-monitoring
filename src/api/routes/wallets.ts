import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';

const router = Router();
const walletController = new WalletController();

// Rutas de wallets
router.get('/', (req, res) => walletController.getAllWallets(req, res));
router.get('/top', (req, res) => walletController.getTopWallets(req, res));
router.get('/stats', (req, res) => walletController.getStats(req, res));
router.get('/recent-activity', (req, res) => walletController.getRecentActivity(req, res));
router.get('/:id', (req, res) => walletController.getWalletById(req, res));
router.get('/:id/transactions', (req, res) => walletController.getWalletTransactions(req, res));
router.get('/:id/performance/history', (req, res) => walletController.getPerformanceHistory(req, res));

export default router;
