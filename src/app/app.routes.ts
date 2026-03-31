import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { LandingProducto } from './pages/landing-producto/landing-producto';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AuthGoogle } from './pages/auth-google/auth-google';
import { Projects } from './pages/projects/projects';
import { Characters } from './pages/characters/characters';
import { AdminPanel } from './pages/admin/admin';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Profile } from './pages/profile/profile';
import { EditProfile } from './pages/edit-profile/edit-profile';
import { roleGuard } from './guards/role-guard';
import { NotFound } from './pages/not-found/not-found';
import { ProjectDashboard } from './pages/project-dashboard/project-dashboard';
import { GeographicMaps } from './pages/geographic-maps/geographic-maps';
import { EditorComponent } from './pages/editor/editor';

export const routes: Routes = [
  { 
    path: 'forgot-password', 
    component: ForgotPassword
  },
  { 
    path: 'reset-password', 
    component: ResetPassword
  },
  { 
    path: '',
    component: LandingProducto
  },
  { 
    path: 'hivemind', 
    component: Landing
  },
  { 
    path: 'login', 
    component: Login 
  },
  { 
    path: 'register', 
    component: Register 
  },
  { 
    path: 'auth/google', 
    component: AuthGoogle 
  },
  {
    path: 'app',
    canActivate: [roleGuard(['ADMIN', 'USER'])],
    children: [
      { 
        path: 'projects', 
        component: Projects
      },
      { 
        path: 'profile', 
        component: Profile
      },
      { 
        path: 'update-profile', 
        component: EditProfile
      },
      {
        path: 'project/:id',
        component: ProjectDashboard
      },
      {
        path: 'geographic-maps/:id',
        component: GeographicMaps
      },
      {
        path: 'projects/:projectId/characters',
        component: Characters
      },
      {
        path: 'editor/:projectId',
        component: EditorComponent
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [roleGuard(['ADMIN'])],
    children: [
      { 
        path: '', 
        component: AdminPanel
      }
    ]
  },
  {
    path: '**',
    component: NotFound
  }
];
