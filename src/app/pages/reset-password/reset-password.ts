import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment.local';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  imports: [FormsModule],
  styleUrls: ['./reset-password.scss'],
})
export class ResetPassword implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  tokenMissing = false;
  success = signal(false);

  passwordError = '';
  confirmError = '';

  private toast = inject(ToastService);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.tokenMissing = true;
    }
  }

  private validatePassword(): boolean {
    const pw = this.password;
    if (pw.length < 8) {
      this.passwordError = 'Password must be at least 8 characters.';
      return false;
    }
    if (!/[A-Z]/.test(pw)) {
      this.passwordError = 'Password must contain at least one uppercase letter.';
      return false;
    }
    if (!/[^a-zA-Z0-9]/.test(pw)) {
      this.passwordError = 'Password must contain at least one special character.';
      return false;
    }
    this.passwordError = '';
    return true;
  }

  private validateConfirm(): boolean {
    if (this.password !== this.confirmPassword) {
      this.confirmError = 'Passwords do not match.';
      return false;
    }
    this.confirmError = '';
    return true;
  }

  submit() {
    const pwOk = this.validatePassword();
    const cfOk = this.validateConfirm();
    if (!pwOk || !cfOk) return;

    this.loading.set(true);

    this.http
      .post(
        `${environment.apiBaseUrl}/auth/reset-password`,
        { token: this.token, newPassword: this.password },
        { responseType: 'text' },
      )
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          this.toast.show('success', 'Password updated successfully!');
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: () => {
          this.loading.set(false);
          this.toast.show('error', 'This reset link is no longer valid. Please request a new one.');
        },
      });
  }
}
