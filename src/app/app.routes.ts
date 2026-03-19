import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { LandingProducto } from './pages/landing-producto/landing-producto';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: LandingProducto },
  { path: 'Hivemind', component: Landing },
  { path: 'login', component: Login },
];
