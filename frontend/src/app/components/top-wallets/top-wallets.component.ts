import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { WalletPerformance, CryptoType } from '../../models/wallet.model';

@Component({
  selector: 'app-top-wallets',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon>emoji_events</mat-icon>
          Top 10 Mejores Carteras
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div *ngIf="loading" class="loading">
          <mat-spinner></mat-spinner>
        </div>

        <div *ngIf="!loading && topWallets.length > 0" class="table-container">
          <table mat-table [dataSource]="topWallets" class="full-width">
            <!-- Rank Column -->
            <ng-container matColumnDef="rank">
              <th mat-header-cell *matHeaderCellDef>Rank</th>
              <td mat-cell *matCellDef="let wallet">
                <span class="rank-badge">#{{ wallet.rank }}</span>
              </td>
            </ng-container>

            <!-- Address Column -->
            <ng-container matColumnDef="address">
              <th mat-header-cell *matHeaderCellDef>Dirección</th>
              <td mat-cell *matCellDef="let wallet">
                <div class="address-cell">
                  <mat-chip [class]="wallet.wallet.cryptoType.toLowerCase()">
                    {{ wallet.wallet.cryptoType === 'BITCOIN' ? 'BTC' : 'ETH' }}
                  </mat-chip>
                  <span class="address">{{ wallet.wallet.address | slice:0:15 }}...</span>
                </div>
              </td>
            </ng-container>

            <!-- Balance Column -->
            <ng-container matColumnDef="balance">
              <th mat-header-cell *matHeaderCellDef>Balance</th>
              <td mat-cell *matCellDef="let wallet">
                <div class="balance-cell">
                  <div>{{ wallet.wallet.balance | number:'1.4-4' }}</div>
                  <div class="usd">\${{ wallet.wallet.balanceUsd | number:'1.0-0' }}</div>
                </div>
              </td>
            </ng-container>

            <!-- Performance Column -->
            <ng-container matColumnDef="performance">
              <th mat-header-cell *matHeaderCellDef>Rendimiento</th>
              <td mat-cell *matCellDef="let wallet">
                <div class="performance-cell">
                  <span [class]="wallet.profitLossPercentage >= 0 ? 'text-success' : 'text-danger'">
                    {{ wallet.profitLossPercentage >= 0 ? '+' : '' }}{{ wallet.profitLossPercentage | number:'1.2-2' }}%
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Score Column -->
            <ng-container matColumnDef="score">
              <th mat-header-cell *matHeaderCellDef>Score</th>
              <td mat-cell *matCellDef="let wallet">
                <span class="score-badge">{{ wallet.performanceScore | number:'1.0-0' }}</span>
              </td>
            </ng-container>

            <!-- Win Rate Column -->
            <ng-container matColumnDef="winRate">
              <th mat-header-cell *matHeaderCellDef>Win Rate</th>
              <td mat-cell *matCellDef="let wallet">
                {{ wallet.winRate | number:'1.0-0' }}%
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let wallet">
                <button mat-icon-button (click)="viewDetails(wallet.wallet.id)">
                  <mat-icon>visibility</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <div *ngIf="!loading && topWallets.length === 0" class="no-data">
          <mat-icon>info</mat-icon>
          <p>No hay datos disponibles. Ejecuta el job de extracción primero.</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card-header {
      margin-bottom: 16px;
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

    .table-container {
      overflow-x: auto;
    }

    .full-width {
      width: 100%;
    }

    .rank-badge {
      background-color: #1976d2;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 500;
      font-size: 14px;
    }

    .address-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-chip.bitcoin {
      background-color: #f7931a;
      color: white;
    }

    mat-chip.ethereum {
      background-color: #627eea;
      color: white;
    }

    .address {
      font-family: monospace;
      font-size: 13px;
    }

    .balance-cell {
      display: flex;
      flex-direction: column;
    }

    .usd {
      font-size: 12px;
      color: #757575;
    }

    .performance-cell {
      font-weight: 500;
      font-size: 15px;
    }

    .score-badge {
      background-color: #4caf50;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      ::ng-deep .mat-mdc-table {
        font-size: 12px;
      }

      .address {
        font-size: 11px;
      }
    }
  `]
})
export class TopWalletsComponent implements OnInit {
  topWallets: WalletPerformance[] = [];
  loading = true;
  displayedColumns = ['rank', 'address', 'balance', 'performance', 'score', 'winRate', 'actions'];

  constructor(
    private walletService: WalletService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTopWallets();
    // Actualizar cada minuto
    setInterval(() => this.loadTopWallets(), 60000);
  }

  loadTopWallets(): void {
    this.loading = true;
    this.walletService.getTopWallets(10).subscribe({
      next: (response) => {
        this.topWallets = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading top wallets:', error);
        this.loading = false;
      }
    });
  }

  viewDetails(walletId: string): void {
    this.router.navigate(['/wallet', walletId]);
  }
}
