import { Routes } from '@angular/router';

/** Mounted at /sellers (reviewer roles). */
export default [
    { path: '', loadComponent: () => import('./pages/seller-directory/seller-directory').then((m) => m.SellerDirectoryPage) },
    { path: 'applications', loadComponent: () => import('./pages/seller-application-list/seller-application-list').then((m) => m.SellerApplicationListPage) },
    {
        path: 'applications/:organizationId',
        loadComponent: () => import('./pages/seller-application-detail/seller-application-detail').then((m) => m.SellerApplicationDetailPage)
    },
    { path: 'profile-changes', loadComponent: () => import('./pages/profile-changes/profile-changes').then((m) => m.ProfileChangesPage) }
] as Routes;
