import { ApiClient } from '../utils/apiClient';
import { WalletData, TransactionData } from '../types';
import logger from '../config/logger';
import { satoshiToBtc } from '../utils/helpers';

export class BitcoinService {
  private apiClient: ApiClient;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.BLOCKCHAIR_API_KEY || '';
    // Usando Blockchair API como fuente principal
    this.apiClient = new ApiClient('https://api.blockchair.com/bitcoin', 1500);
  }

  /**
   * Obtiene las direcciones más ricas de Bitcoin en los últimos 4 años
   * Nota: Blockchair tiene limitaciones en su API gratuita
   */
  async getTopWallets(limit: number = 100): Promise<WalletData[]> {
    try {
      logger.info(`Obteniendo top ${limit} carteras de Bitcoin...`);

      // Blockchair no tiene un endpoint directo para "richest addresses"
      // Usaremos una estrategia alternativa: buscar addresses con más transacciones
      // En producción, se debería usar una API premium o indexar el blockchain

      const wallets: WalletData[] = [];

      // Estrategia alternativa: usar datos conocidos de carteras grandes
      // y verificar su estado actual
      const knownLargeAddresses = await this.getKnownLargeAddresses();

      for (const address of knownLargeAddresses.slice(0, limit)) {
        try {
          const walletData = await this.getWalletDetails(address);
          if (walletData) {
            wallets.push(walletData);
          }
        } catch (error) {
          logger.warn(`Error obteniendo detalles de wallet ${address}:`, error);
          continue;
        }
      }

      logger.info(`✅ Se obtuvieron ${wallets.length} carteras de Bitcoin`);
      return wallets;
    } catch (error) {
      logger.error('Error obteniendo top wallets de Bitcoin:', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de una cartera específica
   */
  async getWalletDetails(address: string): Promise<WalletData | null> {
    try {
      const params = this.apiKey ? `?key=${this.apiKey}` : '';
      const response: any = await this.apiClient.get(
        `/dashboards/address/${address}${params}`
      );

      if (!response?.data?.[address]) {
        return null;
      }

      const data = response.data[address];
      const addressData = data.address;

      return {
        address,
        balance: satoshiToBtc(addressData.balance || 0),
        transactionCount: addressData.transaction_count || 0,
        firstSeen: addressData.first_seen_receiving
          ? new Date(addressData.first_seen_receiving)
          : undefined,
        lastActivity: addressData.last_seen_receiving
          ? new Date(addressData.last_seen_receiving)
          : undefined,
      };
    } catch (error) {
      logger.error(`Error obteniendo detalles de wallet ${address}:`, error);
      return null;
    }
  }

  /**
   * Obtiene transacciones de una cartera
   */
  async getWalletTransactions(
    address: string,
    limit: number = 100
  ): Promise<TransactionData[]> {
    try {
      const params = this.apiKey ? `?key=${this.apiKey}&limit=${limit}` : `?limit=${limit}`;
      const response: any = await this.apiClient.get(
        `/dashboards/address/${address}${params}`
      );

      if (!response?.data?.[address]?.transactions) {
        return [];
      }

      const transactions: TransactionData[] = response.data[address].transactions.map(
        (tx: any) => ({
          txHash: tx.hash,
          type: this.determineType(tx.balance_change),
          amount: Math.abs(satoshiToBtc(tx.balance_change)),
          timestamp: new Date(tx.time),
          blockNumber: tx.block_id,
          fee: tx.fee ? satoshiToBtc(tx.fee) : undefined,
        })
      );

      return transactions;
    } catch (error) {
      logger.error(`Error obteniendo transacciones de ${address}:`, error);
      return [];
    }
  }

  /**
   * Lista de direcciones conocidas grandes de Bitcoin
   * En producción, esto debería venir de una fuente más dinámica
   */
  private async getKnownLargeAddresses(): Promise<string[]> {
    // Estas son algunas direcciones conocidas de exchanges y grandes holders
    // En producción, usar un servicio de ranking real
    return [
      '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', // Binance cold wallet
      'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97', // Binance
      '3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', // Bitfinex
      '1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF', // Huobi
      '3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', // Kraken
      'bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6', // Unknown large
      '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', // Bitfinex cold
      '37XuVSEpWW4trkfmvWzegTHQt7BdktSKUs', // Kraken cold
      '3Cbq7aT1tY8kMxWLbitaG7yT6bPbKChq64', // Unknown large
      '38UmuUqPCrFmQo4khkomQwZ4VbY2nZMJ67', // Unknown large
    ];
  }

  private determineType(balanceChange: number): 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT' {
    return balanceChange > 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT';
  }
}
