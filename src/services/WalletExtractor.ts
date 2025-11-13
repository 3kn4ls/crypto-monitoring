import { AppDataSource } from '../config/database';
import { Wallet, CryptoType } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { BitcoinService } from './BitcoinService';
import { EthereumService } from './EthereumService';
import logger from '../config/logger';
import { WalletData, TransactionData } from '../types';

export class WalletExtractor {
  private walletRepo = AppDataSource.getRepository(Wallet);
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private bitcoinService: BitcoinService;
  private ethereumService: EthereumService;

  constructor() {
    this.bitcoinService = new BitcoinService();
    this.ethereumService = new EthereumService();
  }

  /**
   * Extrae y almacena las carteras más grandes de Bitcoin
   */
  async extractBitcoinWallets(limit: number = 50): Promise<Wallet[]> {
    try {
      logger.info(`Extrayendo top ${limit} carteras de Bitcoin...`);

      const walletsData = await this.bitcoinService.getTopWallets(limit);
      const savedWallets: Wallet[] = [];

      for (const walletData of walletsData) {
        const wallet = await this.saveOrUpdateWallet(walletData, CryptoType.BITCOIN);
        if (wallet) {
          savedWallets.push(wallet);

          // Extraer transacciones
          await this.extractWalletTransactions(wallet, CryptoType.BITCOIN);
        }
      }

      logger.info(`✅ ${savedWallets.length} carteras de Bitcoin guardadas`);
      return savedWallets;
    } catch (error) {
      logger.error('Error extrayendo carteras de Bitcoin:', error);
      throw error;
    }
  }

  /**
   * Extrae y almacena las carteras más grandes de Ethereum
   */
  async extractEthereumWallets(limit: number = 50): Promise<Wallet[]> {
    try {
      logger.info(`Extrayendo top ${limit} carteras de Ethereum...`);

      const walletsData = await this.ethereumService.getTopWallets(limit);
      const savedWallets: Wallet[] = [];

      for (const walletData of walletsData) {
        const wallet = await this.saveOrUpdateWallet(walletData, CryptoType.ETHEREUM);
        if (wallet) {
          savedWallets.push(wallet);

          // Extraer transacciones
          await this.extractWalletTransactions(wallet, CryptoType.ETHEREUM);
        }
      }

      logger.info(`✅ ${savedWallets.length} carteras de Ethereum guardadas`);
      return savedWallets;
    } catch (error) {
      logger.error('Error extrayendo carteras de Ethereum:', error);
      throw error;
    }
  }

  /**
   * Guarda o actualiza una cartera en la base de datos
   */
  private async saveOrUpdateWallet(
    walletData: WalletData,
    cryptoType: CryptoType
  ): Promise<Wallet | null> {
    try {
      let wallet = await this.walletRepo.findOne({
        where: { address: walletData.address, cryptoType },
      });

      if (!wallet) {
        wallet = this.walletRepo.create({
          address: walletData.address,
          cryptoType,
        });
      }

      wallet.balance = walletData.balance;
      wallet.transactionCount = walletData.transactionCount;
      wallet.firstSeen = walletData.firstSeen || wallet.firstSeen;
      wallet.lastActivity = walletData.lastActivity || wallet.lastActivity;

      // Calcular balance en USD (esto requeriría una API de precios)
      // Por ahora, usamos valores aproximados
      const priceUsd = cryptoType === CryptoType.BITCOIN ? 45000 : 2500;
      wallet.balanceUsd = walletData.balance * priceUsd;

      await this.walletRepo.save(wallet);
      return wallet;
    } catch (error) {
      logger.error(`Error guardando wallet ${walletData.address}:`, error);
      return null;
    }
  }

  /**
   * Extrae transacciones de una cartera
   */
  private async extractWalletTransactions(
    wallet: Wallet,
    cryptoType: CryptoType
  ): Promise<void> {
    try {
      logger.info(`Extrayendo transacciones de ${wallet.address}...`);

      let transactionsData: TransactionData[] = [];

      if (cryptoType === CryptoType.BITCOIN) {
        transactionsData = await this.bitcoinService.getWalletTransactions(
          wallet.address,
          100
        );
      } else if (cryptoType === CryptoType.ETHEREUM) {
        transactionsData = await this.ethereumService.getWalletTransactions(
          wallet.address
        );
      }

      // Guardar transacciones
      for (const txData of transactionsData) {
        await this.saveTransaction(wallet, txData);
      }

      logger.info(
        `✅ ${transactionsData.length} transacciones guardadas para ${wallet.address}`
      );
    } catch (error) {
      logger.error(`Error extrayendo transacciones de ${wallet.address}:`, error);
    }
  }

  /**
   * Guarda una transacción en la base de datos
   */
  private async saveTransaction(
    wallet: Wallet,
    txData: TransactionData
  ): Promise<void> {
    try {
      // Verificar si ya existe
      const existing = await this.transactionRepo.findOne({
        where: { txHash: txData.txHash, walletId: wallet.id },
      });

      if (existing) {
        return; // Ya existe, no duplicar
      }

      const transaction = this.transactionRepo.create({
        walletId: wallet.id,
        txHash: txData.txHash,
        type: txData.type,
        amount: txData.amount,
        timestamp: txData.timestamp,
        fromAddress: txData.fromAddress,
        toAddress: txData.toAddress,
        blockNumber: txData.blockNumber,
        fee: txData.fee,
      });

      await this.transactionRepo.save(transaction);
    } catch (error) {
      logger.error(`Error guardando transacción ${txData.txHash}:`, error);
    }
  }

  /**
   * Actualiza información de una cartera específica
   */
  async updateWallet(walletId: string): Promise<Wallet | null> {
    try {
      const wallet = await this.walletRepo.findOne({
        where: { id: walletId },
      });

      if (!wallet) {
        logger.warn(`Wallet ${walletId} no encontrada`);
        return null;
      }

      let walletData: WalletData | null = null;

      if (wallet.cryptoType === CryptoType.BITCOIN) {
        walletData = await this.bitcoinService.getWalletDetails(wallet.address);
      } else if (wallet.cryptoType === CryptoType.ETHEREUM) {
        walletData = await this.ethereumService.getWalletDetails(wallet.address);
      }

      if (walletData) {
        await this.saveOrUpdateWallet(walletData, wallet.cryptoType);
        await this.extractWalletTransactions(wallet, wallet.cryptoType);
      }

      return wallet;
    } catch (error) {
      logger.error(`Error actualizando wallet ${walletId}:`, error);
      return null;
    }
  }
}
