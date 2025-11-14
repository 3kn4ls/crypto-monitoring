import { ApiClient } from '../utils/apiClient';
import logger from '../config/logger';
import { CryptoType } from '../entities/Wallet';

interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
  };
}

interface CoinGeckoHistoricalResponse {
  market_data?: {
    current_price?: {
      usd: number;
    };
  };
}

interface CryptoCompareHistoricalResponse {
  Data?: {
    Data?: Array<{
      time: number;
      close: number;
    }>;
  };
}

interface BinanceKlineResponse extends Array<any> {
  [4]: string; // close price
}

enum PriceSource {
  COINGECKO = 'coingecko',
  CRYPTOCOMPARE = 'cryptocompare',
  BINANCE = 'binance',
}

/**
 * Servicio mejorado para obtener precios de criptomonedas con múltiples fuentes
 *
 * Fuentes disponibles (en orden de prioridad):
 * 1. CoinGecko API (primaria) - 10-50 llamadas/min, no requiere API key
 * 2. CryptoCompare API (fallback) - ~100k llamadas/mes, requiere API key gratuita
 * 3. Binance API (fallback) - Sin límite para datos públicos, sin API key
 *
 * Documentación:
 * - CoinGecko: https://www.coingecko.com/en/api/documentation
 * - CryptoCompare: https://min-api.cryptocompare.com/documentation
 * - Binance: https://binance-docs.github.io/apidocs/spot/en/
 */
export class PriceService {
  private coinGeckoClient: ApiClient;
  private cryptoCompareClient: ApiClient;
  private binanceClient: ApiClient;
  private priceCache: Map<string, { price: number; timestamp: number; source: PriceSource }>;
  private readonly CACHE_DURATION_MS = 60000; // 1 minuto
  private readonly CRYPTOCOMPARE_API_KEY = process.env.CRYPTOCOMPARE_API_KEY || '';

  constructor() {
    // CoinGecko API gratuita (fuente primaria)
    this.coinGeckoClient = new ApiClient('https://api.coingecko.com/api/v3', 2000);

    // CryptoCompare API (fallback 1)
    this.cryptoCompareClient = new ApiClient('https://min-api.cryptocompare.com/data', 1500);

    // Binance API (fallback 2)
    this.binanceClient = new ApiClient('https://api.binance.com/api/v3', 1000);

    this.priceCache = new Map();
  }

  /**
   * Convierte CryptoType a coin ID de CoinGecko
   */
  private getCoinId(cryptoType: CryptoType): string {
    switch (cryptoType) {
      case CryptoType.BITCOIN:
        return 'bitcoin';
      case CryptoType.ETHEREUM:
        return 'ethereum';
      default:
        throw new Error(`Tipo de cripto no soportado: ${cryptoType}`);
    }
  }

  /**
   * Convierte CryptoType a símbolo de CryptoCompare
   */
  private getCryptoCompareSymbol(cryptoType: CryptoType): string {
    switch (cryptoType) {
      case CryptoType.BITCOIN:
        return 'BTC';
      case CryptoType.ETHEREUM:
        return 'ETH';
      default:
        throw new Error(`Tipo de cripto no soportado: ${cryptoType}`);
    }
  }

  /**
   * Convierte CryptoType a símbolo de Binance
   */
  private getBinanceSymbol(cryptoType: CryptoType): string {
    switch (cryptoType) {
      case CryptoType.BITCOIN:
        return 'BTCUSDT';
      case CryptoType.ETHEREUM:
        return 'ETHUSDT';
      default:
        throw new Error(`Tipo de cripto no soportado: ${cryptoType}`);
    }
  }

  /**
   * Obtiene el precio actual de una criptomoneda en USD
   */
  async getCurrentPrice(cryptoType: CryptoType): Promise<number> {
    try {
      const coinId = this.getCoinId(cryptoType);
      const cacheKey = `current_${coinId}`;

      // Verificar caché
      const cached = this.priceCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
        return cached.price;
      }

      // Obtener precio actual
      const response = await this.coinGeckoClient.get<CoinGeckoPriceResponse>('/simple/price', {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
        },
      });

      const price = response[coinId]?.usd;
      if (!price) {
        throw new Error(`No se pudo obtener precio para ${coinId}`);
      }

      // Guardar en caché
      this.priceCache.set(cacheKey, { price, timestamp: Date.now(), source: PriceSource.COINGECKO });

      logger.debug(`Precio actual de ${cryptoType}: $${price}`);
      return price;
    } catch (error) {
      logger.error(`Error obteniendo precio actual de ${cryptoType}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene precio histórico desde CryptoCompare (fallback 1)
   */
  private async getHistoricalPriceFromCryptoCompare(
    cryptoType: CryptoType,
    date: Date
  ): Promise<number | null> {
    try {
      const symbol = this.getCryptoCompareSymbol(cryptoType);
      const timestamp = Math.floor(date.getTime() / 1000);

      const params: any = {
        fsym: symbol,
        tsym: 'USD',
        limit: 1,
        toTs: timestamp,
      };

      // Agregar API key si está disponible
      if (this.CRYPTOCOMPARE_API_KEY) {
        params.api_key = this.CRYPTOCOMPARE_API_KEY;
      }

      const response = await this.cryptoCompareClient.get<CryptoCompareHistoricalResponse>(
        '/histoday',
        { params }
      );

      const dataPoints = response.Data?.Data;
      if (dataPoints && dataPoints.length > 0) {
        const price = dataPoints[0].close;
        logger.debug(`[CryptoCompare] Precio histórico de ${cryptoType}: $${price}`);
        return price;
      }

      return null;
    } catch (error) {
      logger.warn(`[CryptoCompare] Error obteniendo precio histórico:`, error);
      return null;
    }
  }

  /**
   * Obtiene precio histórico desde Binance (fallback 2)
   */
  private async getHistoricalPriceFromBinance(
    cryptoType: CryptoType,
    date: Date
  ): Promise<number | null> {
    try {
      const symbol = this.getBinanceSymbol(cryptoType);
      const startTime = date.getTime();
      const endTime = startTime + 86400000; // +1 día

      const response = await this.binanceClient.get<BinanceKlineResponse[]>('/klines', {
        params: {
          symbol,
          interval: '1d',
          startTime,
          endTime,
          limit: 1,
        },
      });

      if (response && response.length > 0) {
        const price = parseFloat(response[0][4]); // close price
        logger.debug(`[Binance] Precio histórico de ${cryptoType}: $${price}`);
        return price;
      }

      return null;
    } catch (error) {
      logger.warn(`[Binance] Error obteniendo precio histórico:`, error);
      return null;
    }
  }

  /**
   * Obtiene el precio histórico de una criptomoneda en una fecha específica
   * Utiliza múltiples fuentes con sistema de fallback
   *
   * @param cryptoType Tipo de criptomoneda
   * @param date Fecha para obtener el precio
   * @returns Precio en USD en esa fecha, o null si no se pudo obtener
   */
  async getHistoricalPrice(cryptoType: CryptoType, date: Date): Promise<number | null> {
    const coinId = this.getCoinId(cryptoType);

    // Formatear fecha en formato DD-MM-YYYY (requerido por CoinGecko)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const cacheKey = `${coinId}_${dateStr}`;

    // Verificar caché (precios históricos son inmutables)
    const cached = this.priceCache.get(cacheKey);
    if (cached) {
      return cached.price;
    }

    // Intentar CoinGecko primero
    try {
      logger.debug(`[CoinGecko] Obteniendo precio histórico de ${cryptoType} para ${dateStr}...`);

      const response = await this.coinGeckoClient.get<CoinGeckoHistoricalResponse>(
        `/coins/${coinId}/history`,
        {
          params: {
            date: dateStr,
            localization: false,
          },
        }
      );

      const price = response.market_data?.current_price?.usd;
      if (price) {
        this.priceCache.set(cacheKey, { price, timestamp: Date.now(), source: PriceSource.COINGECKO });
        logger.debug(`[CoinGecko] Precio histórico de ${cryptoType} (${dateStr}): $${price}`);
        return price;
      }
    } catch (error) {
      logger.warn(`[CoinGecko] Error obteniendo precio histórico de ${cryptoType}:`, error);
    }

    // Fallback 1: CryptoCompare
    const cryptoComparePrice = await this.getHistoricalPriceFromCryptoCompare(cryptoType, date);
    if (cryptoComparePrice) {
      this.priceCache.set(cacheKey, {
        price: cryptoComparePrice,
        timestamp: Date.now(),
        source: PriceSource.CRYPTOCOMPARE,
      });
      return cryptoComparePrice;
    }

    // Fallback 2: Binance
    const binancePrice = await this.getHistoricalPriceFromBinance(cryptoType, date);
    if (binancePrice) {
      this.priceCache.set(cacheKey, {
        price: binancePrice,
        timestamp: Date.now(),
        source: PriceSource.BINANCE,
      });
      return binancePrice;
    }

    // Fallback 3: Si la fecha es muy reciente (< 1 día), usar precio actual
    const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 1) {
      logger.warn(`No se pudo obtener precio histórico para ${dateStr}, usando precio actual como aproximación`);
      return await this.getCurrentPrice(cryptoType);
    }

    logger.error(`No se pudo obtener precio histórico de ${cryptoType} para ${dateStr} desde ninguna fuente`);
    return null; // Retornar null en lugar de throw para no detener el procesamiento
  }

  /**
   * Obtiene múltiples precios históricos de forma eficiente
   * Agrupa las solicitudes para minimizar llamadas a la API
   *
   * @param requests Array de solicitudes de precios
   * @returns Map con los precios por fecha
   */
  async getBatchHistoricalPrices(
    cryptoType: CryptoType,
    dates: Date[]
  ): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    const uniqueDates = [...new Set(dates.map(d => d.toISOString().split('T')[0]))];

    logger.info(`Obteniendo ${uniqueDates.length} precios históricos de ${cryptoType}...`);

    for (const dateStr of uniqueDates) {
      try {
        const date = new Date(dateStr);
        const price = await this.getHistoricalPrice(cryptoType, date);
        if (price !== null) {
          prices.set(dateStr, price);
        }

        // Pequeña pausa para respetar rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        logger.error(`Error obteniendo precio para ${dateStr}:`, error);
        // Continuar con las demás fechas
      }
    }

    return prices;
  }

  /**
   * Calcula el valor USD de una cantidad de cripto en una fecha específica
   * @returns Valor en USD, o 0 si no se pudo obtener el precio
   */
  async calculateUsdValue(
    amount: number,
    cryptoType: CryptoType,
    date: Date
  ): Promise<number> {
    const price = await this.getHistoricalPrice(cryptoType, date);
    return price ? amount * price : 0;
  }

  /**
   * Limpia la caché de precios
   */
  clearCache(): void {
    this.priceCache.clear();
    logger.info('Caché de precios limpiada');
  }

  /**
   * Obtiene estadísticas de la caché
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.priceCache.size,
      entries: Array.from(this.priceCache.keys()),
    };
  }
}
