import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, NgClass],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly authService = inject(AuthService);

  protected sidebar = inject(SidebarService);

  user = this.authService.getUser();
  constructor() {}

  logout(): void {
    this.authService.logout();
  }
}
