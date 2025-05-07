import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-password-confirm',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirmation-container">
      <div class="card">
        <div class="card-header">
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="card-body">
          <div *ngIf="loading" class="loading-spinner">
            <div class="spinner"></div>
            <p>Traitement en cours...</p>
          </div>
          
          <div *ngIf="!loading" class="result-message" [ngClass]="{'success': success, 'error': !success}">
            <div *ngIf="success" class="success-icon">✓</div>
            <div *ngIf="!success" class="error-icon">✗</div>
            <p>{{ message }}</p>
          </div>
          
          <div class="redirect-message" *ngIf="!loading">
            <p>Redirection dans {{ countdown }} secondes...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
    }
    .card {
      width: 500px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      background-color: white;
      overflow: hidden;
    }
    .card-header {
      padding: 20px;
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }
    .card-header h2 {
      margin: 0;
      color: #333;
    }
    .card-body {
      padding: 30px;
      text-align: center;
    }
    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 20px 0;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .result-message {
      margin: 20px 0;
      padding: 20px;
      border-radius: 5px;
    }
    .success {
      background-color: #d4edda;
      color: #155724;
    }
    .error {
      background-color: #f8d7da;
      color: #721c24;
    }
    .success-icon, .error-icon {
      font-size: 3em;
      margin-bottom: 15px;
    }
    .redirect-message {
      margin-top: 20px;
      color: #6c757d;
    }
  `]
})
export class PasswordConfirmComponent implements OnInit, OnDestroy {
  token: string = '';
  loading: boolean = true;
  success: boolean = false;
  message: string = '';
  pageTitle: string = 'Confirmation du changement de mot de passe';
  countdown: number = 5;
  private countdownTimer: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      const action = this.route.snapshot.url[0].path; // Vérifie si c'est confirm ou cancel
      if (action === 'cancel-password-change') {
        this.pageTitle = 'Annulation du changement de mot de passe';
        this.cancelPasswordChange();
      } else {
        this.processToken();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  private processToken(): void {
    if (!this.token) {
      this.handleError('Token manquant');
      return;
    }

    this.authService.confirmPasswordChange(this.token).subscribe({
      next: (response) => {
        this.success = response.success;
        this.message = response.data?.message || response.message || 'Mot de passe modifié avec succès !';
        this.loading = false;
        // La redirection est gérée par AuthService via handlePasswordChangeRedirect
        this.startCountdown();
      },
      error: (error) => {
        this.handleError(error.error?.message || error.message || 'Erreur lors de la confirmation');
      }
    });
  }

  private cancelPasswordChange(): void {
    if (!this.token) {
      this.handleError('Token manquant');
      return;
    }

    this.authService.cancelPasswordChange(this.token).subscribe({
      next: (response) => {
        this.success = response.success;
        this.message = response.message || 'Changement de mot de passe annulé avec succès !';
        this.loading = false;
        this.startCountdown();
      },
      error: (error) => {
        this.handleError(error.error?.message || error.message || 'Erreur lors de l\'annulation');
      }
    });
  }

  private handleError(errorMessage: string): void {
    this.success = false;
    this.message = errorMessage;
    this.loading = false;
    this.startCountdown();
  }

  private startCountdown(): void {
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        // Redirection vers /login dans tous les cas (succès ou erreur)
        // Note : La déconnexion et la redirection principale sont gérées par AuthService
        if (!this.success) {
          this.router.navigate(['/login']);
        }
      }
    }, 1000);
  }
}