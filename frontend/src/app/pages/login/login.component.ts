import { Component, ElementRef, QueryList, ViewChildren, ViewChild, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    CommonModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {
  // System Constants
  readonly CURRENT_UTC_DATETIME: string = '2025-02-25 17:20:14';
  readonly CURRENT_USER: string = 'Antoine627';

  private readonly BLOCK_STORAGE_KEY = 'loginBlockedUntil';
  private readonly ATTEMPTS_STORAGE_KEY = 'loginAttempts';


  // Form Groups
  loginForm!: FormGroup;
  codeForm!: FormGroup;

  // États de blocage et compteur
  isBlocked: boolean = false;
  countdown: number = 30;
  countdownDuration: number = 30;

  // UI States
  showPassword: boolean = false;
  isCodeMode: boolean = false;
  showCodeInputs: boolean = true;

  showDigits: boolean[] = Array(4).fill(false);

  private countdownInterval?: any;

  // Code Input Configuration
  codeControls = Array(4).fill(null);
  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef>;
  @ViewChild('firstInput') firstInput!: ElementRef;
  @ViewChild('emailInput') emailInput!: ElementRef;

  // Error Handling
  errorMessage: string = '';
  attempts: number = 0;
  remainingAttempts: number = 3;
  notificationType: 'success' | 'error' | 'info' = 'info';
  notificationMessage: string = '';
  showNotificationBar: boolean = false;
  


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeForms();
    this.loadSavedMode();
    this.checkBlockStatus();
  }


  // Dans ton composant login
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Vérifie si l'utilisateur vient d'un changement de mot de passe réussi
      if (localStorage.getItem('passwordChangeSuccess')) {
        this.showNotification('Votre mot de passe a été modifié avec succès. Veuillez vous connecter avec votre nouveau mot de passe.', 'success');
        localStorage.removeItem('passwordChangeSuccess');
      }
    }
  }


  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Implémentation similaire à celle de ton SettingsComponent
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotificationBar = true;
  
    setTimeout(() => {
      this.showNotificationBar = false;
    }, 5000);
  }


  private checkBlockStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      const blockedUntil = localStorage.getItem(this.BLOCK_STORAGE_KEY);
      const savedAttempts = localStorage.getItem(this.ATTEMPTS_STORAGE_KEY);

      if (blockedUntil) {
        const blockEndTime = new Date(blockedUntil).getTime();
        const currentTime = new Date().getTime();

        if (blockEndTime > currentTime) {
          this.isBlocked = true;
          this.showCodeInputs = false;
          const remainingTime = Math.ceil((blockEndTime - currentTime) / 1000);
          this.countdown = remainingTime;
          this.startCountdown();
        } else {
          localStorage.removeItem(this.BLOCK_STORAGE_KEY);
          localStorage.removeItem(this.ATTEMPTS_STORAGE_KEY);
        }
      }

      if (savedAttempts) {
        this.attempts = parseInt(savedAttempts, 10);
        this.remainingAttempts = Math.max(0, 3 - this.attempts);
      }
    }
  }

  // Lifecycle Hooks
  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.focusOnFirstInput();
      }, 0);
    }
  }

  // Initialization Methods
  private initializeForms(): void {
    // Formulaire de connexion avec des validations plus appropriées
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6)
      ]]
    });

    // Formulaire de code
    const codeControls: any = {};
    for (let i = 0; i < 4; i++) {
      codeControls[`digit${i}`] = ['', [
        Validators.required,
        Validators.pattern('^[0-9]$')
      ]];
    }
    this.codeForm = this.fb.group(codeControls);

    // Ajouter un écouteur de changements sur le formulaire
    this.loginForm.statusChanges.subscribe(status => {
      console.log('Form Status:', status);
      console.log('Form Value:', this.loginForm.value);
      console.log('Form Errors:', this.loginForm.errors);
    });
  }

  private loadSavedMode(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedMode = localStorage.getItem('loginMode');
      this.isCodeMode = savedMode === 'code';
    }
  }

  // Form Management Methods
  resetForms(): void {
    if (!this.isBlocked) {
      if (this.isCodeMode) {
        this.codeForm.reset();
        Object.keys(this.codeForm.controls).forEach(key => {
          this.codeForm.get(key)?.setErrors(null);
        });
      } else {
        this.loginForm.reset();
        Object.keys(this.loginForm.controls).forEach(key => {
          this.loginForm.get(key)?.setErrors(null);
        });
      }
      this.cdr.detectChanges();
      setTimeout(() => this.focusOnFirstInput(), 0);
    }
  }

  // UI Event Handlers
  toggleMode(isCode: boolean): void {
    this.isCodeMode = isCode;
    this.errorMessage = '';
    this.resetForms();
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('loginMode', isCode ? 'code' : 'email');
    }
    
    this.cdr.detectChanges();
    setTimeout(() => this.focusOnFirstInput(), 0);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(): void {
    // Récupérer la valeur de l'email, même si vide
    const emailValue = this.loginForm.get('email')?.value || '';
    
    // Prévenir la validation du formulaire
    event?.preventDefault();
    event?.stopPropagation();
    
    // Redirection immédiate avec l'email en paramètre, sans validation
    this.router.navigate(['/forget-password'], {
      queryParams: { email: emailValue }
    });
  }


  onRegister(): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.router.navigate(['/register']);
}

  // Form Submission Methods
  onSubmit(): void {
    this.isCodeMode ? this.onSubmitCode() : this.onSubmitEmail();
  }

  private onSubmitEmail(): void {
    if (this.loginForm.invalid) return;
    
    const { email, password } = this.loginForm.value;
    this.errorMessage = '';
    
    this.authService.login(email, password).subscribe({
      next: (res) => {
        if (res && res.data && res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('lastLoginTime', this.CURRENT_UTC_DATETIME);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Réponse du serveur invalide';
          this.handleError({ status: 500 });
        }
      },
      error: (err) => {
        console.log('Erreur de connexion:', err);
        this.attempts++;
        this.remainingAttempts = Math.max(0, 3 - this.attempts);

        if (err.status === 401) {
          this.errorMessage = `Identifiants incorrects. Tentatives restantes : ${this.remainingAttempts}`;
          if (this.attempts >= 3) {
            this.blockUser();
          }
        } else {
          this.errorMessage = err.message || 'Erreur de connexion au serveur';
        }

        this.resetForms();
        this.cdr.detectChanges();
        this.focusOnFirstInput();
      }
    });
  }

  private onSubmitCode(): void {
    if (this.isBlocked || this.codeForm.invalid) return;
    
    const code = Object.values(this.codeForm.value).join('');
    this.errorMessage = '';
    
    this.authService.loginWithCode(code).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('lastLoginTime', this.CURRENT_UTC_DATETIME);
        this.router.navigate(['/dashboard']);
        this.resetAttempts();
        this.resetForms();
      },
      error: (err) => this.handleError(err)
    });
  }

  // Code Input Handlers
  onCodeInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!/^\d*$/.test(value)) {
      input.value = '';
      return;
    }

    if (value && index < 3) {
      const nextInput = this.codeInputs.toArray()[index + 1].nativeElement;
      nextInput.focus();
    }

    if (value && index === 3) {
      this.onSubmitCode();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && index > 0) {
      const current = this.codeForm.get(`digit${index}`);
      if (current && !current.value) {
        const prevInput = this.codeInputs.toArray()[index - 1].nativeElement;
        prevInput.focus();
      }
    }
  }


  // Helper Methods
  private blockUser(): void {
    this.isBlocked = true;
    this.showCodeInputs = false;
    this.countdown = this.countdownDuration;

    if (isPlatformBrowser(this.platformId)) {
      const blockEndTime = new Date(Date.now() + this.countdownDuration * 1000);
      localStorage.setItem(this.BLOCK_STORAGE_KEY, blockEndTime.toISOString());
      localStorage.setItem(this.ATTEMPTS_STORAGE_KEY, this.attempts.toString());
    }

    this.startCountdown();
  }

  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.unblockUser();
      }
    }, 1000);
  }


  private unblockUser(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.isBlocked = false;
    this.showCodeInputs = true;
    this.attempts = 0;
    this.remainingAttempts = 3;
    this.errorMessage = '';
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.BLOCK_STORAGE_KEY);
      localStorage.removeItem(this.ATTEMPTS_STORAGE_KEY);
    }
    
    this.resetForms();
    this.focusOnFirstInput();
  }

  handleError(error: any) {
    this.attempts++;
    this.remainingAttempts = Math.max(0, 3 - this.attempts);
  
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.ATTEMPTS_STORAGE_KEY, this.attempts.toString());
    }
  
    if (this.attempts >= 3) {
      this.blockUser();
      this.errorMessage = 'Trop de tentatives. Compte bloqué temporairement.';
      return;
    }
  
    switch (error.status) {
      case 400:
        this.errorMessage = 'Veuillez remplir correctement tous les champs.';
        break;
      case 401:
        this.errorMessage = `Identifiants incorrects. Tentatives restantes : ${this.remainingAttempts}`;
        break;
      case 404:
        this.errorMessage = 'Utilisateur non trouvé.';
        break;
      default:
        this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    }
  
    this.resetForms();
    this.cdr.detectChanges();
    setTimeout(() => this.focusOnFirstInput(), 0);
  }

  private resetAttempts(): void {
    this.attempts = 0;
    this.remainingAttempts = 3;
    this.isBlocked = false;
    this.showCodeInputs = true;
    this.countdown = 30;
    this.errorMessage = '';
    clearInterval(this.countdownInterval);
  }

  // Mise à jour de la méthode focusOnFirstInput
  private focusOnFirstInput(): void {
    if (!isPlatformBrowser(this.platformId) || this.isBlocked) return;
  
    if (this.isCodeMode && this.firstInput?.nativeElement) {
      this.firstInput.nativeElement.focus();
      this.firstInput.nativeElement.select();
    }
    // Supprimer ou commenter la partie qui met le focus sur l'email
    // else {
    //   if (this.emailInput?.nativeElement) {
    //     this.emailInput.nativeElement.focus();
    //     this.emailInput.nativeElement.select();
    //   }
    // }
  }


  // Validator Helper
  isInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    if (!control) return false;

    return control.invalid && (control.dirty || control.touched);
  }

  isFormValid(): boolean {
    if (!this.loginForm) return false;
    
    const emailControl = this.loginForm.get('email');
    const passwordControl = this.loginForm.get('password');

    return !!emailControl?.valid && !!passwordControl?.valid;
  }

  // Cleanup
  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}