import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { LandingProducto } from './pages/landing-producto/landing-producto';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AuthGoogle } from './pages/auth-google/auth-google';
import { Projects } from './pages/projects/projects';
import { Profile } from './pages/profile/profile';
import { EditProfile } from './pages/edit-profile/edit-profile';

export const routes: Routes = [
  { path: '', component: LandingProducto },
  { path: 'hivemind', component: Landing },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'auth/google', component: AuthGoogle },
  { path: 'projects', component: Projects },
  { path: 'profile', component: Profile },
  { path: 'update-profile', component: EditProfile }
];