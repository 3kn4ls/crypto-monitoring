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

/**
 * Servicio para obtener precios de criptomonedas usando CoinGecko API (gratuita)
 *
 * Límites de la API gratuita:
 * - 10-50 llamadas por minuto
 * - No requiere API key para funcionalidad básica
 *
 * Documentación: https://www.coingecko.com/en/api/documentation
 */
export class PriceService {
  private apiClient: ApiClient;
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private readonly CACHE_DURATION_MS = 60000; // 1 minuto

  constructor() {
    // CoinGecko API gratuita
    this.apiClient = new ApiClient('https://api.coingecko.com/api/v3', 2000);
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
      const response = await this.apiClient.get<CoinGeckoPriceResponse>('/simple/price', {
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
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });

      logger.debug(`Precio actual de ${cryptoType}: $${price}`);
      return price;
    } catch (error) {
      logger.error(`Error obteniendo precio actual de ${cryptoType}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el precio histórico de una criptomoneda en una fecha específica
   *
   * @param cryptoType Tipo de criptomoneda
   * @param date Fecha para obtener el precio
   * @returns Precio en USD en esa fecha
   */
  async getHistoricalPrice(cryptoType: CryptoType, date: Date): Promise<number> {
    try {
      const coinId = this.getCoinId(cryptoType);

      // Formatear fecha en formato DD-MM-YYYY (requerido por CoinGecko)
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${day}-${month}-${year}`;

      const cacheKey = `${coinId}_${dateStr}`;

      // Verificar caché (precios históricos son inmutables, caché indefinido)
      const cached = this.priceCache.get(cacheKey);
      if (cached) {
        return cached.price;
      }

      logger.debug(`Obteniendo precio histórico de ${cryptoType} para ${dateStr}...`);

      // Obtener precio histórico
      const response = await this.apiClient.get<CoinGeckoHistoricalResponse>(
        `/coins/${coinId}/history`,
        {
          params: {
            date: dateStr,
            localization: false,
          },
        }
      );

      const price = response.market_data?.current_price?.usd;
      if (!price) {
        throw new Error(`No se pudo obtener precio histórico para ${coinId} en ${dateStr}`);
      }

      // Guardar en caché (sin expiración para precios históricos)
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });

      logger.debug(`Precio histórico de ${cryptoType} (${dateStr}): $${price}`);
      return price;
    } catch (error) {
      logger.error(`Error obteniendo precio histórico de ${cryptoType}:`, error);

      // Fallback: intentar obtener precio actual si la fecha es muy reciente
      const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 1) {
        logger.warn('Fecha muy reciente, usando precio actual como aproximación');
        return await this.getCurrentPrice(cryptoType);
      }

      throw error;
    }
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
        prices.set(dateStr, price);

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
   */
  async calculateUsdValue(
    amount: number,
    cryptoType: CryptoType,
    date: Date
  ): Promise<number> {
    const price = await this.getHistoricalPrice(cryptoType, date);
    return amount * price;
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
