import { Routes } from '@angular/router';

export default [
    { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
    { path: 'access', loadComponent: () => import('@/app/features/system/pages/access/access').then((m) => m.AccessPage) },
    { path: 'error', loadComponent: () => import('@/app/features/system/pages/error/error').then((m) => m.ErrorPage) },
    { path: '', pathMatch: 'full', redirectTo: 'login' }
] as Routes;
