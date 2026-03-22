import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-projects',
  imports: [RouterLink],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects {
  private readonly authService = inject(AuthService);

  get userName(): string {
    return this.authService.getUser()?.name ?? '';
  }

  logout(): void {
    this.authService.logout();
  }
}
