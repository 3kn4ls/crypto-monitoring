import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule
  ],
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="toolbar">
        <button mat-icon-button>
          <mat-icon>menu</mat-icon>
        </button>
        <span class="title">
          <mat-icon>account_balance_wallet</mat-icon>
          Crypto Wallet Monitor
        </span>
        <span class="spacer"></span>
        <button mat-icon-button>
          <mat-icon>refresh</mat-icon>
        </button>
        <button mat-icon-button>
          <mat-icon>notifications</mat-icon>
        </button>
      </mat-toolbar>

      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .content {
      flex: 1;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .title {
        font-size: 16px;
      }
    }
  `]
})
export class AppComponent {
  title = 'Crypto Wallet Monitor';
}
