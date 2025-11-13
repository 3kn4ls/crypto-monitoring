import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WalletService } from '../../services/wallet.service';
import { Stats } from '../../models/wallet.model';

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="stats-container">
      <div class="stat-card" *ngIf="stats; else loading">
        <mat-card>
          <div class="stat-content">
            <mat-icon class="stat-icon bitcoin">account_balance_wallet</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats.totalWallets }}</div>
              <div class="stat-label">Total Carteras</div>
            </div>
          </div>
        </mat-card>
      </div>

      <div class="stat-card" *ngIf="stats; else loading">
        <mat-card>
          <div class="stat-content">
            <mat-icon class="stat-icon bitcoin">currency_bitcoin</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats.bitcoinWallets }}</div>
              <div class="stat-label">Carteras Bitcoin</div>
            </div>
          </div>
        </mat-card>
      </div>

      <div class="stat-card" *ngIf="stats; else loading">
        <mat-card>
          <div class="stat-content">
            <mat-icon class="stat-icon ethereum">token</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats.ethereumWallets }}</div>
              <div class="stat-label">Carteras Ethereum</div>
            </div>
          </div>
        </mat-card>
      </div>

      <div class="stat-card" *ngIf="stats; else loading">
        <mat-card>
          <div class="stat-content">
            <mat-icon class="stat-icon">swap_horiz</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats.totalTransactions | number }}</div>
              <div class="stat-label">Transacciones</div>
            </div>
          </div>
        </mat-card>
      </div>

      <div class="stat-card" *ngIf="stats; else loading">
        <mat-card>
          <div class="stat-content">
            <mat-icon class="stat-icon">attach_money</mat-icon>
            <div class="stat-details">
              <div class="stat-value">\${{ formatNumber(stats.totalBalanceUsd) }}</div>
              <div class="stat-label">Balance Total</div>
            </div>
          </div>
        </mat-card>
      </div>

      <div class="stat-card" *ngIf="stats; else loading">
        <mat-card>
          <div class="stat-content">
            <mat-icon class="stat-icon">schedule</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats.recentTransactions }}</div>
              <div class="stat-label">Últimas 24h</div>
            </div>
          </div>
        </mat-card>
      </div>

      <ng-template #loading>
        <div class="stat-card">
          <mat-card>
            <div class="loading">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          </mat-card>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .stats-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card mat-card {
      height: 100%;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px;
    }

    .stat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
    }

    .stat-icon.bitcoin {
      color: #f7931a;
    }

    .stat-icon.ethereum {
      color: #627eea;
    }

    .stat-details {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 500;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #757575;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    @media (max-width: 768px) {
      .stats-container {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }

      .stat-value {
        font-size: 20px;
      }

      .stat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }
    }
  `]
})
export class StatsCardsComponent implements OnInit {
  stats: Stats | null = null;

  constructor(private walletService: WalletService) {}

  ngOnInit(): void {
    this.loadStats();
    // Actualizar cada 30 segundos
    setInterval(() => this.loadStats(), 30000);
  }

  loadStats(): void {
    this.walletService.getStats().subscribe({
      next: (response) => {
        this.stats = response.data;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  formatNumber(num: number): string {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }
}
