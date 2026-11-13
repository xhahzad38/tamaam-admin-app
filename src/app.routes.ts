import { Routes } from '@angular/router';
import { authGuard } from '@/app/core/auth/auth.guard';
import { RoleGroups } from '@/app/core/auth/roles';
import { AppLayout } from '@/app/layout/components/app.layout';
import { unsavedChangesGuard } from '@/app/shared/data/unsaved-changes.guard';
import { DASHBOARD_ROLES } from './app.shell';

// Route roles mirror the API's [Authorize(Roles = ...)] so users never open a screen whose calls return 403.
export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                canActivate: [authGuard],
                data: { roles: DASHBOARD_ROLES },
                loadComponent: () => import('@/app/features/dashboard/pages/dashboard/dashboard').then((m) => m.Dashboard)
            },
            { path: 'account', redirectTo: 'settings/profile' },
            { path: 'settings', pathMatch: 'full', redirectTo: 'settings/profile' },
            {
                path: 'settings/:tab',
                loadComponent: () => import('@/app/features/account/pages/settings/settings').then((m) => m.SettingsPage)
            },
            {
                path: 'notifications',
                loadComponent: () => import('@/app/features/account/pages/notifications/notifications').then((m) => m.NotificationsPage)
            },
            {
                path: 'sellers',
                canActivate: [authGuard],
                data: { roles: RoleGroups.reviewers },
                loadChildren: () => import('@/app/features/sellers/sellers.routes')
            },
            // Old links (bookmarks, notifications sent before the rename).
            { path: 'seller-reviews', redirectTo: 'sellers/applications', pathMatch: 'full' },
            { path: 'seller-reviews/:organizationId', redirectTo: 'sellers/applications/:organizationId' },
            {
                path: 'catalog',
                canActivate: [authGuard],
                data: { roles: RoleGroups.catalog },
                loadChildren: () => import('@/app/features/catalog/catalog.routes')
            },
            {
                path: 'fulfillment',
                canActivate: [authGuard],
                data: { roles: RoleGroups.offers },
                loadChildren: () => import('@/app/features/fulfillment/fulfillment.routes')
            },
            {
                path: 'pricing/rate-card',
                canActivate: [authGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { roles: RoleGroups.offers },
                loadComponent: () => import('@/app/features/pricing/pages/rate-card/rate-card').then((m) => m.RateCardPage)
            },
            {
                path: 'activity',
                canActivate: [authGuard],
                data: { roles: RoleGroups.auditors },
                loadComponent: () => import('@/app/features/activity/pages/activity-log/activity-log').then((m) => m.ActivityLogPage)
            }
        ]
    },
    { path: 'auth', loadChildren: () => import('@/app/features/auth/auth.routes') },
    { path: 'notfound', loadComponent: () => import('@/app/features/system/pages/not-found/not-found').then((m) => m.NotFoundPage) },
    { path: '**', redirectTo: '/notfound' }
];
