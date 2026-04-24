import { Component, AfterViewInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment.local';

declare const google: any;

@Component({
  selector: 'app-auth-google',
  imports: [RouterLink],
  templateUrl: './auth-google.html',
  styleUrl: './auth-google.scss',
})
export class AuthGoogle implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  loading = signal(false);
  errorMessage = signal('');

  ngAfterViewInit(): void {
    this.initGoogleSignIn();
  }

  private initGoogleSignIn(): void {
    if (typeof google === 'undefined' || !google?.accounts?.id) {
      setTimeout(() => this.initGoogleSignIn(), 300);
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => this.handleCredential(response.credential),
    });

    const container = document.getElementById('google-btn-container');
    if (container) {
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        shape: 'rectangular',
      });
    }
  }

  private handleCredential(credential: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.loginWithGoogle(credential).subscribe({
      next: () => {
        this.loading.set(false);
        window.location.href = this.authService.getHomeRoute();
      },
      error: (err) => {
        this.loading.set(false);
        const message = err?.error?.message ?? 'Google authentication failed. Please try again.';
        this.errorMessage.set(message);
        this.toast.show('error', message);
      },
    });
  }
}