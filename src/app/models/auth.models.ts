import { Preferences } from "./preferences.model";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  startDt: Date;
  preferences: Preferences;
  projects: Number;
  characters: Number;
  collaborators: Number;
  provider: 'LOCAL' | 'GOOGLE';
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  credential: string;
}

export interface ErrorResponse {
  status: number;
  message: string;
}
