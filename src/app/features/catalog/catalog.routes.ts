import { Routes } from '@angular/router';

export default [
    {
        path: 'product-reviews',
        loadComponent: () => import('./pages/product-review-list/product-review-list').then((m) => m.ProductReviewListPage)
    },
    {
        path: 'product-reviews/:id',
        loadComponent: () => import('./pages/product-review-detail/product-review-detail').then((m) => m.ProductReviewDetailPage)
    },
    {
        path: 'change-requests',
        loadComponent: () => import('./pages/change-request-list/change-request-list').then((m) => m.ChangeRequestListPage)
    },
    {
        path: 'change-requests/:id',
        loadComponent: () => import('./pages/change-request-detail/change-request-detail').then((m) => m.ChangeRequestDetailPage)
    },
    {
        path: 'brand-authorization-reviews',
        loadComponent: () => import('./pages/brand-authorization-queue/brand-authorization-queue').then((m) => m.BrandAuthorizationQueuePage)
    },
    {
        path: 'categories',
        loadComponent: () => import('./pages/category-tree/category-tree').then((m) => m.CategoryTreePage)
    },
    {
        path: 'categories/new',
        loadComponent: () => import('./pages/category-form/category-form').then((m) => m.CategoryFormPage)
    },
    {
        path: 'categories/attributes',
        loadComponent: () => import('./pages/category-attributes/category-attributes').then((m) => m.CategoryAttributesPage)
    },
    {
        path: 'categories/commission',
        loadComponent: () => import('./pages/category-commission/category-commission').then((m) => m.CategoryCommissionPage)
    },
    {
        path: 'categories/return-policy',
        loadComponent: () => import('./pages/category-returns/category-returns').then((m) => m.CategoryReturnPolicyPage)
    },
    {
        path: 'categories/warranty',
        loadComponent: () => import('./pages/category-warranty/category-warranty').then((m) => m.CategoryWarrantyPage)
    },
    {
        path: 'categories/:id/edit',
        loadComponent: () => import('./pages/category-form/category-form').then((m) => m.CategoryFormPage)
    },
    {
        path: 'categories/:id',
        loadComponent: () => import('./pages/category-detail/category-detail').then((m) => m.CategoryDetailPage)
    },
    {
        path: 'attributes',
        loadComponent: () => import('./pages/attribute-list/attribute-list').then((m) => m.AttributeListPage)
    },
    {
        path: 'brands/requests',
        loadComponent: () => import('./pages/brand-requests/brand-requests').then((m) => m.BrandRequestsPage)
    },
    {
        path: 'brands/documents',
        loadComponent: () => import('./pages/brand-documents/brand-documents').then((m) => m.BrandDocumentsPage)
    },
    {
        path: 'brands/authorizations/new',
        loadComponent: () => import('./pages/brand-authorization-form/brand-authorization-form').then((m) => m.BrandAuthorizationFormPage)
    },
    {
        path: 'brands/authorizations',
        loadComponent: () => import('./pages/brand-authorizations/brand-authorizations').then((m) => m.BrandAuthorizationsPage)
    },
    {
        path: 'brands/new',
        loadComponent: () => import('./pages/brand-form/brand-form').then((m) => m.BrandFormPage)
    },
    {
        path: 'brands/:id',
        loadComponent: () => import('./pages/brand-form/brand-form').then((m) => m.BrandFormPage)
    },
    {
        path: 'brands',
        loadComponent: () => import('./pages/brand-list/brand-list').then((m) => m.BrandListPage)
    },
    {
        path: 'lookup-types',
        loadComponent: () => import('./pages/lookup-types/lookup-types').then((m) => m.LookupTypesPage)
    },
    {
        path: 'lookups',
        loadComponent: () => import('./pages/lookup-admin/lookup-admin').then((m) => m.LookupAdminPage)
    },
    { path: '', pathMatch: 'full', redirectTo: 'categories' }
] as Routes;
