import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from './auth-services/authentication.service';

const staffRoles = ['SuperAdmin', 'Admin', 'AdminReviewer', 'CatalogAdmin', 'MarketingAdmin', 'FinanceAdmin', 'LogisticsAdmin', 'SupportAgent'];

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const user = this.authenticationService.userValue;
        if (user) {
            const roles: string[] = user.roles ?? [];
            const isStaff = roles.some((role: string) => staffRoles.includes(role));
            const isCustomerOnly = roles.includes('Customer') && !isStaff;

            if (isCustomerOnly) {
                this.router.navigate(['/auth/access']);
                return false;
            }

            const { roles: requiredRoles } = route.data;
            if (requiredRoles && !requiredRoles.some((role: any) => roles.includes(role))) {
                this.router.navigate(['/auth/access']);
                return false;
            }

            return true;
        }

        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
