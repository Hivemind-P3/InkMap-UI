import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {

    const auth = inject(AuthService);
    const router = inject(Router);

    if(!auth.isLoggedIn()) {
      router.navigate(['/login']);

      return false;
    }

    const userRole = auth.getRoles();
    if (allowedRoles.includes(userRole)) {
      return true;
    }

    router.navigate(['/unauthorized']);
    return false;
  };
};
