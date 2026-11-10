import { Routes } from '@angular/router';
import { authGuard } from '@/app/core/auth/auth.guard';
import { RoleGroups } from '@/app/core/auth/roles';

// The parent route allows the offer roles (catalog + logistics); warehouses and inbound are logistics-only in the API.
const logistics = { canActivate: [authGuard], data: { roles: RoleGroups.logistics } };

export default [
    { path: 'offers', loadComponent: () => import('./pages/offer-list/offer-list').then((m) => m.AdminOfferListPage) },
    { path: 'warehouses', ...logistics, loadComponent: () => import('./pages/warehouse-list/warehouse-list').then((m) => m.AdminWarehouseListPage) },
    { path: 'warehouses/new', ...logistics, loadComponent: () => import('./pages/warehouse-form/warehouse-form').then((m) => m.FulfillmentCenterFormPage) },
    { path: 'warehouses/:id', ...logistics, loadComponent: () => import('./pages/warehouse-form/warehouse-form').then((m) => m.FulfillmentCenterFormPage) },
    { path: 'inbound', ...logistics, loadComponent: () => import('./pages/inbound-list/inbound-list').then((m) => m.AdminInboundListPage) },
    { path: 'inbound/:id', ...logistics, loadComponent: () => import('./pages/inbound-receive/inbound-receive').then((m) => m.InboundReceivePage) },
    { path: 'labels/inbound/:id', ...logistics, loadComponent: () => import('./pages/label-print/label-print').then((m) => m.LabelPrintPage) },
    { path: '', pathMatch: 'full', redirectTo: 'offers' }
] as Routes;
