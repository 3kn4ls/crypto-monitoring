import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import logger from '../config/logger';

export class ApiClient {
  private client: AxiosInstance;
  private rateLimitDelay: number;

  constructor(baseURL: string, rateLimitDelay: number = 1000) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.rateLimitDelay = rateLimitDelay;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      await this.sleep(this.rateLimitDelay);
      const response = await this.client.get<T>(url, config);
      return response.data;
    } catch (error: any) {
      logger.error(`Error en GET ${url}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      await this.sleep(this.rateLimitDelay);
      const response = await this.client.post<T>(url, data, config);
      return response.data;
    } catch (error: any) {
      logger.error(`Error en POST ${url}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
