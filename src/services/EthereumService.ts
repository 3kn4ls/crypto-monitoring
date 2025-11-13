import { ApiClient } from '../utils/apiClient';
import { WalletData, TransactionData, EtherscanTransaction } from '../types';
import logger from '../config/logger';
import { weiToEth, determineTransactionType } from '../utils/helpers';

export class EthereumService {
  private apiClient: ApiClient;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || '';
    this.apiClient = new ApiClient('https://api.etherscan.io/api', 1500);
  }

  /**
   * Obtiene las direcciones más ricas de Ethereum
   * Nota: Etherscan no tiene un endpoint público para esto en la API gratuita
   * Usaremos direcciones conocidas de grandes holders
   */
  async getTopWallets(limit: number = 100): Promise<WalletData[]> {
    try {
      logger.info(`Obteniendo top ${limit} carteras de Ethereum...`);

      const wallets: WalletData[] = [];
      const knownLargeAddresses = await this.getKnownLargeAddresses();

      for (const address of knownLargeAddresses.slice(0, limit)) {
        try {
          const walletData = await this.getWalletDetails(address);
          if (walletData && walletData.balance > 0) {
            wallets.push(walletData);
          }
        } catch (error) {
          logger.warn(`Error obteniendo detalles de wallet ${address}:`, error);
          continue;
        }
      }

      // Ordenar por balance
      wallets.sort((a, b) => b.balance - a.balance);

      logger.info(`✅ Se obtuvieron ${wallets.length} carteras de Ethereum`);
      return wallets;
    } catch (error) {
      logger.error('Error obteniendo top wallets de Ethereum:', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de una cartera específica
   */
  async getWalletDetails(address: string): Promise<WalletData | null> {
    try {
      // Obtener balance
      const balanceResponse: any = await this.apiClient.get('', {
        params: {
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
          apikey: this.apiKey,
        },
      });

      if (balanceResponse.status !== '1') {
        logger.warn(`No se pudo obtener balance de ${address}`);
        return null;
      }

      const balance = weiToEth(balanceResponse.result);

      // Obtener conteo de transacciones
      const txCountResponse: any = await this.apiClient.get('', {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionCount',
          address,
          tag: 'latest',
          apikey: this.apiKey,
        },
      });

      const transactionCount = txCountResponse.result
        ? parseInt(txCountResponse.result, 16)
        : 0;

      return {
        address,
        balance,
        transactionCount,
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
    startBlock: number = 0,
    endBlock: number = 99999999
  ): Promise<TransactionData[]> {
    try {
      const response: any = await this.apiClient.get('', {
        params: {
          module: 'account',
          action: 'txlist',
          address,
          startblock: startBlock,
          endblock: endBlock,
          sort: 'desc',
          apikey: this.apiKey,
        },
      });

      if (response.status !== '1' || !response.result) {
        return [];
      }

      const transactions: TransactionData[] = response.result
        .slice(0, 1000) // Limitar a 1000 transacciones más recientes
        .map((tx: EtherscanTransaction) => {
          const amount = weiToEth(tx.value);
          const fee = weiToEth((parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)).toString());

          return {
            txHash: tx.hash,
            type: determineTransactionType(address, tx.from, tx.to, amount),
            amount,
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            fromAddress: tx.from,
            toAddress: tx.to,
            blockNumber: parseInt(tx.blockNumber),
            fee,
          };
        });

      return transactions;
    } catch (error) {
      logger.error(`Error obteniendo transacciones de ${address}:`, error);
      return [];
    }
  }

  /**
   * Obtiene el precio de ETH en USD en un timestamp específico
   * Nota: Etherscan no tiene histórico de precios en API gratuita
   * Retornamos null para indicar que se necesita otra fuente
   */
  async getHistoricalPrice(timestamp: Date): Promise<number | null> {
    // En producción, usar CoinGecko, CryptoCompare u otra API
    return null;
  }

  /**
   * Lista de direcciones conocidas grandes de Ethereum
   * En producción, esto debería venir de una fuente más dinámica
   */
  private async getKnownLargeAddresses(): Promise<string[]> {
    // Estas son algunas direcciones conocidas de exchanges y grandes holders
    return [
      '0x00000000219ab540356cbb839cbe05303d7705fa', // Beacon Chain Deposit
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH Contract
      '0xda9dfa130df4de4673b89022ee50ff26f6ea73cf', // Kraken
      '0x0716a17fbaee714f1e6ab0f9d59edbc5f09815c0', // Kraken
      '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', // Binance 7
      '0xf977814e90da44bfa03b6295a0616a897441acec', // Binance 8
      '0x28c6c06298d514db089934071355e5743bf21d60', // Binance 14
      '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance 15
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance 16
      '0x56eddb7aa87536c09ccc2793473599fd21a8b17f', // Binance 17
      '0x9696f59e4d72e237be84ffd425dcad154bf96976', // Binance 18
      '0x4d9ff50ef4da947364bb9650892b2554e7be5e2b', // Binance 19
      '0xd551234ae421e3bcba99a0da6d736074f22192ff', // Binance 20
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance Cold
      '0xab5c66752a9e8167967685f1450532fb96d5d24f', // Huobi
      '0x6748f50f686bfbca6fe8ad62b22228b87f31ff2b', // Bitfinex
      '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa', // Bitfinex Cold
      '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f', // Bitfinex Cold
      '0x742d35cc6634c0532925a3b844bc454e4438f44e', // Bitfinex Cold
      '0x4fdd5eb2fb260149a3903859043e962ab89d8ed4', // Bitfinex Cold
    ];
  }
}
