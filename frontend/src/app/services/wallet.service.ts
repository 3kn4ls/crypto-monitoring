import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Wallet,
  Transaction,
  WalletPerformance,
  Stats,
  ApiResponse,
  CryptoType
} from '../models/wallet.model';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private apiUrl = `${environment.apiUrl}/wallets`;

  constructor(private http: HttpClient) {}

  getAllWallets(
    page: number = 1,
    limit: number = 20,
    cryptoType?: CryptoType
  ): Observable<ApiResponse<Wallet[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (cryptoType) {
      params = params.set('cryptoType', cryptoType);
    }

    return this.http.get<ApiResponse<Wallet[]>>(this.apiUrl, { params });
  }

  getTopWallets(limit: number = 10, cryptoType?: CryptoType): Observable<ApiResponse<WalletPerformance[]>> {
    let params = new HttpParams().set('limit', limit.toString());

    if (cryptoType) {
      params = params.set('cryptoType', cryptoType);
    }

    return this.http.get<ApiResponse<WalletPerformance[]>>(`${this.apiUrl}/top`, { params });
  }

  getWalletById(id: string): Observable<ApiResponse<Wallet>> {
    return this.http.get<ApiResponse<Wallet>>(`${this.apiUrl}/${id}`);
  }

  getWalletTransactions(
    id: string,
    page: number = 1,
    limit: number = 50,
    type?: string
  ): Observable<ApiResponse<Transaction[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<ApiResponse<Transaction[]>>(`${this.apiUrl}/${id}/transactions`, { params });
  }

  getPerformanceHistory(id: string, days: number = 30): Observable<ApiResponse<WalletPerformance[]>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<WalletPerformance[]>>(`${this.apiUrl}/${id}/performance/history`, { params });
  }

  getStats(): Observable<ApiResponse<Stats>> {
    return this.http.get<ApiResponse<Stats>>(`${this.apiUrl}/stats`);
  }

  getRecentActivity(limit: number = 20): Observable<ApiResponse<Transaction[]>> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<Transaction[]>>(`${this.apiUrl}/recent-activity`, { params });
  }
}
