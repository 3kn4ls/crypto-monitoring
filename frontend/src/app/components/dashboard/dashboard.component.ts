import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsCardsComponent } from '../stats-cards/stats-cards.component';
import { TopWalletsComponent } from '../top-wallets/top-wallets.component';
import { RecentActivityComponent } from '../recent-activity/recent-activity.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    StatsCardsComponent,
    TopWalletsComponent,
    RecentActivityComponent
  ],
  template: `
    <div class="dashboard-container">
      <h1 class="dashboard-title">Dashboard</h1>

      <app-stats-cards></app-stats-cards>

      <div class="dashboard-grid">
        <div class="main-content">
          <app-top-wallets></app-top-wallets>
        </div>

        <div class="sidebar">
          <app-recent-activity></app-recent-activity>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .dashboard-title {
      font-size: 32px;
      font-weight: 300;
      margin-bottom: 24px;
      color: #333;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
    }

    .main-content {
      min-width: 0;
    }

    .sidebar {
      min-width: 0;
    }

    @media (max-width: 1200px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 12px;
      }

      .dashboard-title {
        font-size: 24px;
      }
    }
  `]
})
export class DashboardComponent {}
