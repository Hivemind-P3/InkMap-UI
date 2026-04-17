import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { NgClass } from '@angular/common';
import { filter } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, NgClass],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected sidebar = inject(SidebarService);
  protected projectId: string | null = null;

  user = this.authService.getUser();

  constructor() {
    this.projectId = this.extractProjectId(this.router.url);
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: NavigationEnd) => {
      this.projectId = this.extractProjectId(e.url);
    });
  }

  private extractProjectId(url: string): string | null {
    return /\/(\d+)/.exec(url)?.[1] ?? null;
  }

  logout(): void {
    this.authService.logout();
  }
}
