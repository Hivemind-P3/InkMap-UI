import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirm = signal(false);
  loading = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  toggleConfirm() {
    this.showConfirm.update((v) => !v);
  }

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  get pwHasMin(): boolean {
    return this.password.length >= 8;
  }

  get pwHasUpper(): boolean {
    return /[A-Z]/.test(this.password);
  }

  get pwHasSpecial(): boolean {
    return /[^a-zA-Z0-9\s]/.test(this.password);
  }

  get pwValid(): boolean {
    return this.pwHasMin && this.pwHasUpper && this.pwHasSpecial;
  }

  onSubmit() {
    if (this.loading() || this.passwordMismatch || !this.pwValid) return;
    this.loading.set(true);

    this.authService.register(this.fullName, this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('success', 'Account created successfully! Welcome to InkMap.');
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err?.error?.message ?? 'Registration failed. Please try again.';
        this.toast.show('error', message);
      },
    });
  }
}
