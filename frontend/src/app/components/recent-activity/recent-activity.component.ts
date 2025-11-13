import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WalletService } from '../../services/wallet.service';
import { Transaction, TransactionType } from '../../models/wallet.model';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon>schedule</mat-icon>
          Actividad Reciente
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div *ngIf="loading" class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <mat-list *ngIf="!loading && transactions.length > 0">
          <mat-list-item *ngFor="let tx of transactions" class="transaction-item">
            <mat-icon matListItemIcon [class]="getTransactionClass(tx.type)">
              {{ getTransactionIcon(tx.type) }}
            </mat-icon>
            <div matListItemTitle class="transaction-title">
              <mat-chip [class]="tx.wallet?.cryptoType?.toLowerCase() || 'unknown'">
                {{ tx.wallet?.cryptoType === 'BITCOIN' ? 'BTC' : 'ETH' }}
              </mat-chip>
              <span class="amount">{{ tx.amount | number:'1.4-4' }}</span>
            </div>
            <div matListItemLine class="transaction-details">
              <span class="address">{{ getWalletAddress(tx.wallet?.address) }}</span>
              <span class="time">{{ getTimeAgo(tx.timestamp) }}</span>
            </div>
          </mat-list-item>
        </mat-list>

        <div *ngIf="!loading && transactions.length === 0" class="no-data">
          <mat-icon>info</mat-icon>
          <p>No hay actividad reciente</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card-header {
      margin-bottom: 8px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .loading, .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #757575;
    }

    mat-list {
      max-height: 600px;
      overflow-y: auto;
    }

    .transaction-item {
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 0;
    }

    .transaction-item:last-child {
      border-bottom: none;
    }

    mat-icon[matListItemIcon] {
      margin-right: 12px;
    }

    mat-icon.buy, mat-icon.transfer_in {
      color: #4caf50;
    }

    mat-icon.sell, mat-icon.transfer_out {
      color: #f44336;
    }

    .transaction-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    mat-chip.bitcoin {
      background-color: #f7931a;
      color: white;
      font-size: 11px;
    }

    mat-chip.ethereum {
      background-color: #627eea;
      color: white;
      font-size: 11px;
    }

    .amount {
      font-weight: 500;
      font-size: 14px;
    }

    .transaction-details {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #757575;
    }

    .address {
      font-family: monospace;
    }

    @media (max-width: 768px) {
      mat-list {
        max-height: 400px;
      }
    }
  `]
})
export class RecentActivityComponent implements OnInit {
  transactions: Transaction[] = [];
  loading = true;

  constructor(private walletService: WalletService) {}

  ngOnInit(): void {
    this.loadRecentActivity();
    // Actualizar cada 30 segundos
    setInterval(() => this.loadRecentActivity(), 30000);
  }

  loadRecentActivity(): void {
    this.loading = true;
    this.walletService.getRecentActivity(20).subscribe({
      next: (response) => {
        this.transactions = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading recent activity:', error);
        this.loading = false;
      }
    });
  }

  getTransactionIcon(type: TransactionType): string {
    switch (type) {
      case TransactionType.BUY:
      case TransactionType.TRANSFER_IN:
        return 'arrow_downward';
      case TransactionType.SELL:
      case TransactionType.TRANSFER_OUT:
        return 'arrow_upward';
      default:
        return 'swap_horiz';
    }
  }

  getTransactionClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.BUY:
        return 'buy';
      case TransactionType.SELL:
        return 'sell';
      case TransactionType.TRANSFER_IN:
        return 'transfer_in';
      case TransactionType.TRANSFER_OUT:
        return 'transfer_out';
      default:
        return '';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'Ahora';
  }

  getWalletAddress(address: string | undefined): string {
    if (!address) return 'Unknown';
    return address.substring(0, 12) + '...';
  }
}
