import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-profile',
  imports: [DatePipe, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly authService = inject(AuthService);

  userData = JSON.parse(localStorage.getItem('inkmap_user') || '{}') as User;

  logout(): void {
    this.authService.logout();
  }
}