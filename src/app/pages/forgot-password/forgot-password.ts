import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.local';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPassword {
  email = '';
  loading = signal(false);
  sent = signal(false);

  private toast = inject(ToastService);

  constructor(private http: HttpClient) {}

  submit() {
    if (!this.email.trim()) return;

    this.loading.set(true);

    this.http
      .post(`${environment.apiBaseUrl}/auth/forgot-password`, { email: this.email }, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.sent.set(true);
          this.toast.show('success', 'Reset link sent. Please check your email.');
        },
        error: () => {
          this.loading.set(false);
          this.toast.show('error', 'Could not send the reset email. Please try again.');
        },
      });
  }
}
