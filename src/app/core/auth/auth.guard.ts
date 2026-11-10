import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from './authentication.service';

/**
 * Requires a signed-in user who may use this app. Add `data: { roles: [...] }` on a route
 * to also require one of those roles (mirror the API's `[Authorize(Roles = ...)]`).
 */
export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthenticationService);
    const router = inject(Router);
    const user = auth.userValue;

    if (!user) {
        return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
    if (!auth.canUseApp(user)) {
        return router.createUrlTree(['/auth/access']);
    }
    const required = route.data?.['roles'] as readonly string[] | undefined;
    if (required && !auth.hasAnyRole(required, user)) {
        return router.createUrlTree(['/auth/access']);
    }
    return true;
};
