import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  imports: [FormsModule],
  styleUrls: ['./reset-password.scss'],
})
export class ResetPassword implements OnInit {
  token = '';
  password = '';
  message = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    this.loading = true;

    this.http
      .post('/api/auth/reset-password', {
        token: this.token,
        newPassword: this.password,
      })
      .subscribe({
        next: () => {
          this.message = 'Password updated successfully.';
          this.loading = false;
        },
        error: () => {
          this.message = 'Invalid token or other error.';
          this.loading = false;
        },
      });
  }
}
