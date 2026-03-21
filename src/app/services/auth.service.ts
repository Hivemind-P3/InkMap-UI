import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment.local';
import {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  GoogleAuthRequest,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly TOKEN_KEY = 'inkmap_token';
  private readonly USER_KEY = 'inkmap_user';

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    const body: RegisterRequest = { name, email, password };
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, body)
      .pipe(tap((res) => this.saveSession(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const body: LoginRequest = { email, password };
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, body)
      .pipe(tap((res) => this.saveSession(res)));
  }

  loginWithGoogle(credential: string): Observable<AuthResponse> {
    const body: GoogleAuthRequest = { credential };
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/google`, body)
      .pipe(tap((res) => this.saveSession(res)));
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }
}
