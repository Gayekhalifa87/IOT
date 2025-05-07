import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, CommonModule } from '@angular/common';
import { AuthService } from './../../services/auth.service';
import { lastValueFrom } from 'rxjs';

// Définissez l'interface UserInfo
interface UserInfo {
  username?: string;
  email?: string;
  role?: string;
  profilePicture?: string;
  createdAt?: string;
}

export interface PasswordValidation {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  passwordsMatch: boolean;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, NgIf, CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  loading = false;
  userInfo: UserInfo = {};
  isAuthPage = false;
  editMode = false;

  // Copie des informations utilisateur pour l'édition
  editableUserInfo: UserInfo = {};

  // Formulaire de mot de passe
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;


   // Validation du mot de passe
   passwordValidation: PasswordValidation = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  };


  // Propriétés pour les notifications
  showNotificationBar = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'info' = 'info';

  // Propriété pour stocker la date et l'heure actuelles
  currentDateTime: string = '';

  // Interval pour la mise à jour de l'heure
  private timeInterval: any;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.updateDateTime();
    this.timeInterval = setInterval(() => this.updateDateTime(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }


  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.editableUserInfo = { ...this.userInfo };
    }
  }


  async saveUserInfo(): Promise<void> {
    this.loading = true;
    try {
      // Implement the updateUserInfo method in your AuthService
      await lastValueFrom(this.authService.updateUserInfo(this.editableUserInfo));
      this.userInfo = { ...this.editableUserInfo };
      this.editMode = false;
      this.showNotification('Informations mises à jour avec succès', 'success');
    } catch (error: any) {
      this.showNotification(error.error?.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      this.loading = false;
    }
  }


  validatePassword(): void {
    const password = this.newPassword;
    this.passwordValidation = {
      minLength: password.length >= 50,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: this.newPassword === this.confirmPassword
    };
  }


  isPasswordValid(): boolean {
    return Object.values(this.passwordValidation).every(value => value === true);
  }

  private loadUserInfo(): void {
    this.loading = true;

    this.authService.getCurrentUser().subscribe({
      next: (response) => {
        console.log('Réponse du backend:', response); // Debug
        if (response.success && response.data) {
          this.userInfo = response.data; // Mappez les données correctement
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des informations utilisateur:', error); // Debug
        this.loading = false;
      }
    });
  }

  // Dans settings.component.ts
  async changePassword(event: Event): Promise<void> {
    event.preventDefault();
    const currentDateTime = '2025-02-27 14:21:28';
    const currentUser = 'Antoine627';
  
    if (this.newPassword !== this.confirmPassword) {
      this.showNotification('Les mots de passe ne correspondent pas', 'error');
      return;
    }
  
    this.loading = true;
  
    try {
      const response = await lastValueFrom(this.authService.updatePassword(this.currentPassword, this.newPassword));
      
      if (response && response.success) {
        this.showNotification(
          'Demande de changement de mot de passe envoyée. Veuillez consulter votre email pour confirmer la modification.',
          'info'
        );
        
        // Réinitialiser les champs
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
  
        // Attendre 5 secondes avant la déconnexion
        setTimeout(() => {
          this.showNotification('Déconnexion en cours pour des raisons de sécurité...', 'info');
          
          // Attendre 1 seconde supplémentaire avant la déconnexion effective
          setTimeout(() => {
            this.authService.logout();
            window.location.href = '/login'; // Redirection vers la page de connexion
          }, 1000);
        }, 5000);
      }
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      this.showNotification(
        error.error?.message || 'Erreur lors du changement de mot de passe. Veuillez réessayer.',
        'error'
      );
    } finally {
      this.loading = false;
    }
  }

  
async generateNewCode(): Promise<void> {
  if (this.loading) return;

  const currentDateTime = '2025-02-27 14:03:57';
  const currentUser = 'Antoine627';

  this.loading = true;
  try {
    const response = await lastValueFrom(this.authService.updateCode());
    
    if (response && response.success) {
      this.showNotification(
        'Nouveau code généré avec succès. Un email contenant votre nouveau code vous a été envoyé. Déconnexion dans 5 secondes...',
        'success'
      );
      
      // Déconnecter l'utilisateur après 5 secondes
      setTimeout(() => {
        this.showNotification('Déconnexion en cours...', 'info');
        this.authService.logout();
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }, 5000);
    }
  } catch (error: any) {
    console.error('Erreur lors de la génération du code:', error);
    this.showNotification(
      error.error?.message || 'Erreur lors de la génération du code. Veuillez réessayer.',
      'error'
    );
  } finally {
    this.loading = false;
  }
}

  // Méthode pour afficher une notification
  showCustomNotification(message: string, type: 'success' | 'error' | 'info') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotificationBar = true;

    // Fermer automatiquement la notification après 3 secondes
    setTimeout(() => {
      this.showNotificationBar = false;
    }, 3000);
  }

  // Méthode pour afficher une notification (alias pour compatibilité)
  showNotification(message: string, type: 'success' | 'error' | 'info') {
    this.showCustomNotification(message, type);
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  // Méthode pour mettre à jour la date et l'heure actuelles
  updateDateTime(): void {
    this.currentDateTime = new Date().toISOString();
  }
}
