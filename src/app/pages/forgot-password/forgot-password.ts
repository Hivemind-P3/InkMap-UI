import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPassword {
  email = '';
  message = '';
  loading = false;

  constructor(private http: HttpClient) {}

  submit() {
    this.loading = true;

    this.http
      .post('/api/auth/forgot-password', {
        email: this.email,
      })
      .subscribe({
        next: () => {
          this.message = 'Check your email to continue.';
          this.loading = false;
        },
        error: () => {
          this.message = 'Could not send email';
          this.loading = false;
        },
      });
  }
}
