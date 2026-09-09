import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AccessRule } from '../auth/session.models';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url || '/dashboard' }
    });
  }

  const access = route.data['access'] as AccessRule | undefined;
  if (auth.canAccess(access)) return true;

  // La ruta y el menú aplican la misma AccessRule; el backend conserva la decisión final.
  return router.createUrlTree(['/dashboard'], { queryParams: { accesoDenegado: true } });
};
