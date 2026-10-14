import { Routes } from '@angular/router';

export default [
    {
        path: 'categories',
        loadComponent: () => import('./categories/category-tree').then((m) => m.CategoryTreePage)
    },
    {
        path: 'categories/new',
        loadComponent: () => import('./categories/category-form').then((m) => m.CategoryFormPage)
    },
    {
        path: 'categories/commission',
        loadComponent: () => import('./categories/category-commission').then((m) => m.CategoryCommissionPage)
    },
    {
        path: 'categories/return-policy',
        loadComponent: () => import('./categories/category-returns').then((m) => m.CategoryReturnPolicyPage)
    },
    {
        path: 'categories/warranty',
        loadComponent: () => import('./categories/category-warranty').then((m) => m.CategoryWarrantyPage)
    },
    {
        path: 'categories/:id/edit',
        loadComponent: () => import('./categories/category-form').then((m) => m.CategoryFormPage)
    },
    {
        path: 'categories/:id',
        loadComponent: () => import('./categories/category-detail').then((m) => m.CategoryDetailPage)
    },
    {
        path: 'attributes',
        loadComponent: () => import('./attributes/attribute-list').then((m) => m.AttributeListPage)
    },
    {
        path: 'brands/requests',
        loadComponent: () => import('./brands/brand-requests').then((m) => m.BrandRequestsPage)
    },
    {
        path: 'brands/new',
        loadComponent: () => import('./brands/brand-form').then((m) => m.BrandFormPage)
    },
    {
        path: 'brands/:id',
        loadComponent: () => import('./brands/brand-form').then((m) => m.BrandFormPage)
    },
    {
        path: 'brands',
        loadComponent: () => import('./brands/brand-list').then((m) => m.BrandListPage)
    },
    {
        path: 'lookups',
        loadComponent: () => import('./lookups/lookup-admin').then((m) => m.LookupAdminPage)
    },
    { path: '', pathMatch: 'full', redirectTo: 'categories' }
] as Routes;
