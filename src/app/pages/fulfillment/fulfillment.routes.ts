import { Routes } from '@angular/router';

export default [
    { path: 'offers', loadComponent: () => import('./offers/offer-list').then((m) => m.AdminOfferListPage) },
    { path: 'warehouses', loadComponent: () => import('./warehouses/warehouse-list').then((m) => m.AdminWarehouseListPage) },
    { path: 'warehouses/new', loadComponent: () => import('./warehouses/warehouse-form').then((m) => m.FulfillmentCenterFormPage) },
    { path: 'warehouses/:id', loadComponent: () => import('./warehouses/warehouse-form').then((m) => m.FulfillmentCenterFormPage) },
    { path: 'inbound', loadComponent: () => import('./inbound/inbound-list').then((m) => m.AdminInboundListPage) },
    { path: 'inbound/:id', loadComponent: () => import('./inbound/inbound-receive').then((m) => m.InboundReceivePage) },
    { path: 'labels/inbound/:id', loadComponent: () => import('./labels/label-print').then((m) => m.LabelPrintPage) },
    { path: '', pathMatch: 'full', redirectTo: 'inbound' }
] as Routes;
