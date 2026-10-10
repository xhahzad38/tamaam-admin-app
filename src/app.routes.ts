import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Documentation } from './app/pages/documentation/documentation';
import { Notfound } from './app/pages/notfound/notfound';
import { AuthGuard } from './app/_helpers';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', pathMatch: 'full', redirectTo: '/seller-reviews' },
            {
                path: 'seller-reviews',
                canActivate: [AuthGuard],
                data: { roles: ['SuperAdmin', 'AdminReviewer'] },
                loadChildren: () => import('./app/pages/seller-reviews/seller-review.routes')
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

