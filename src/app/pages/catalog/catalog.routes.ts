import { Routes } from '@angular/router';

export default [
    {
        path: 'product-reviews',
        loadComponent: () => import('./reviews/product-review-list').then((m) => m.ProductReviewListPage)
    },
    {
        path: 'product-reviews/:id',
        loadComponent: () => import('./reviews/product-review-detail').then((m) => m.ProductReviewDetailPage)
    },
    {
        path: 'change-requests',
        loadComponent: () => import('./reviews/change-request-list').then((m) => m.ChangeRequestListPage)
    },
    {
        path: 'change-requests/:id',
        loadComponent: () => import('./reviews/change-request-detail').then((m) => m.ChangeRequestDetailPage)
    },
    {
        path: 'brand-authorization-reviews',
        loadComponent: () => import('./reviews/brand-authorization-queue').then((m) => m.BrandAuthorizationQueuePage)
    },
    {
        path: 'categories',
        loadComponent: () => import('./categories/category-tree').then((m) => m.CategoryTreePage)
    },
    {
        path: 'categories/new',
        loadComponent: () => import('./categories/category-form').then((m) => m.CategoryFormPage)
    },
    {
        path: 'categories/commission/new',
        loadComponent: () => import('./categories/category-commission-form').then((m) => m.CategoryCommissionFormPage)
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
        path: 'brands/documents',
        loadComponent: () => import('./brands/brand-documents').then((m) => m.BrandDocumentsPage)
    },
    {
        path: 'brands/authorizations/new',
        loadComponent: () => import('./brands/brand-authorization-form').then((m) => m.BrandAuthorizationFormPage)
    },
    {
        path: 'brands/authorizations',
        loadComponent: () => import('./brands/brand-authorizations').then((m) => m.BrandAuthorizationsPage)
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
