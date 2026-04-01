import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast';
import { Footer } from "./components/footer/footer";
import { Header } from "./components/header/header";
import { Sidebar } from "./components/sidebar/sidebar";
import { filter } from 'rxjs';
import { AuthService } from './services/auth.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, Footer, Header, Sidebar, NgClass],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit{
  protected readonly title = signal('InkMap-UI');
  protected authService = inject(AuthService)
  protected isTeamLanding = false;
  protected isMapEditor = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.isTeamLanding = e.url === '/hivemind';
      this.isMapEditor = e.url.startsWith('/app/map-editor/');
    });
  }

  user = this.authService.getUser();

  ngOnInit(): void {
    
  }
}