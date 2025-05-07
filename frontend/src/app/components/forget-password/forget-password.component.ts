import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.css']
})
export class ForgetPasswordComponent {
  forgetPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgetPasswordForm.invalid) return;

    const email = this.forgetPasswordForm.get('email')?.value;

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.successMessage = 'Un email de réinitialisation a été envoyé.';
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de l\'envoi de l\'email de réinitialisation.';
        this.successMessage = '';
      }
    });
  }

  isInvalid(form: FormGroup, controlName: string) {
    const control = form.get(controlName);
    return control?.invalid && (control.dirty || control.touched);
  }

  navigatetoLogin(){
    this.router.navigate(['/login']);
  }
 
}