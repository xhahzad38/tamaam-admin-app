import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Notfound } from './app/pages/notfound/notfound';
import { AuthGuard } from './app/_helpers';

const reviewerRoles = ['SuperAdmin', 'AdminReviewer'];
const catalogRoles = ['SuperAdmin', 'CatalogAdmin'];

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: Dashboard, canActivate: [AuthGuard], data: { roles: reviewerRoles } },
            {
                path: 'sellers',
                canActivate: [AuthGuard],
                data: { roles: reviewerRoles },
                loadComponent: () => import('./app/pages/seller-reviews/seller-directory').then((m) => m.SellerDirectoryPage)
            },
            {
                path: 'seller-reviews',
                canActivate: [AuthGuard],
                data: { roles: reviewerRoles },
                loadChildren: () => import('./app/pages/seller-reviews/seller-review.routes')
            },
            {
                path: 'catalog',
                canActivate: [AuthGuard],
                data: { roles: catalogRoles },
                loadChildren: () => import('./app/pages/catalog/catalog.routes')
            },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },
            {
                path: 'pages',
                loadChildren: () => import('./app/pages/pages.routes')
            }
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];

