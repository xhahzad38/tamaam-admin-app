import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Home',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            {
                label: 'Sellers',
                items: [
                    { label: 'Onboarding review', icon: 'pi pi-fw pi-verified', routerLink: ['/seller-reviews'] },
                    { label: 'All sellers', icon: 'pi pi-fw pi-users', routerLink: ['/sellers'] }
                ]
            },
            {
                label: 'Catalog',
                items: [
                    {
                        label: 'Categories',
                        icon: 'pi pi-fw pi-sitemap',
                        path: '/catalog/categories',
                        items: [
                            { label: 'All categories', icon: 'pi pi-fw pi-list', routerLink: ['/catalog/categories'] },
                            { label: 'Add category', icon: 'pi pi-fw pi-plus', routerLink: ['/catalog/categories/new'] },
                            { label: 'Commission', icon: 'pi pi-fw pi-percentage', routerLink: ['/catalog/categories/commission'] },
                            { label: 'Add commission', icon: 'pi pi-fw pi-plus', routerLink: ['/catalog/categories/commission/new'] },
                            { label: 'Return policy', icon: 'pi pi-fw pi-replay', routerLink: ['/catalog/categories/return-policy'] },
                            { label: 'Warranty rule', icon: 'pi pi-fw pi-shield', routerLink: ['/catalog/categories/warranty'] }
                        ]
                    },
                    { label: 'Attributes', icon: 'pi pi-fw pi-list', routerLink: ['/catalog/attributes'] },
                    {
                        label: 'Brands',
                        icon: 'pi pi-fw pi-bookmark',
                        path: '/catalog/brands',
                        items: [
                            { label: 'All brands', icon: 'pi pi-fw pi-list', routerLink: ['/catalog/brands'] },
                            { label: 'Add brand', icon: 'pi pi-fw pi-plus', routerLink: ['/catalog/brands/new'] },
                            { label: 'Documents', icon: 'pi pi-fw pi-file', routerLink: ['/catalog/brands/documents'] },
                            { label: 'Authorizations', icon: 'pi pi-fw pi-verified', routerLink: ['/catalog/brands/authorizations'] },
                            { label: 'Add authorization', icon: 'pi pi-fw pi-plus', routerLink: ['/catalog/brands/authorizations/new'] },
                            { label: 'Change requests', icon: 'pi pi-fw pi-check-square', routerLink: ['/catalog/brands/requests'] }
                        ]
                    },
                    { label: 'Lookups', icon: 'pi pi-fw pi-tags', routerLink: ['/catalog/lookups'] },
                    { label: 'Product review', icon: 'pi pi-fw pi-check-circle', routerLink: ['/catalog/product-reviews'] },
                    { label: 'Catalog changes', icon: 'pi pi-fw pi-pencil', routerLink: ['/catalog/change-requests'] },
                    { label: 'Authorization review', icon: 'pi pi-fw pi-verified', routerLink: ['/catalog/brand-authorization-reviews'] }
                ]
            },
        ];
    }
}
