import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  logoUrl: string = 'assets/logo.png';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z][A-Za-z0-9 ]*[0-9]?$/)
      ]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }
  
    const registerData = {
      username: this.registerForm.get('username')?.value,
      email: this.registerForm.get('email')?.value,
      password: this.registerForm.get('password')?.value
    };
  
    console.log('Données envoyées:', registerData);
  
    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.errorMessage = '';
        this.successMessage = 'Inscription réussie ! Redirection vers la page de connexion...';
        console.log('Inscription réussie:', response);
        
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { registered: true }
          });
        }, 2000);
      },
      error: (error) => {
        console.error('Erreur complète:', error);
        this.errorMessage = error.error?.message || error.message || 'Erreur lors de l\'inscription. Veuillez réessayer.';
        this.successMessage = '';
      }
    });
  }

  // Nouvelle méthode pour le bouton Retour
  onBackToLogin() {
    this.router.navigate(['/login']);
  }
}