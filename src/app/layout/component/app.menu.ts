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
                            { label: 'Return policy', icon: 'pi pi-fw pi-replay', routerLink: ['/catalog/categories/return-policy'] },
                            { label: 'Warranty rule', icon: 'pi pi-fw pi-shield', routerLink: ['/catalog/categories/warranty'] }
                        ]
                    },
                    { label: 'Attributes', icon: 'pi pi-fw pi-list', routerLink: ['/catalog/attributes'] },
                    { label: 'Brands', icon: 'pi pi-fw pi-bookmark', routerLink: ['/catalog/brands'] },
                    { label: 'Brand requests', icon: 'pi pi-fw pi-check-square', routerLink: ['/catalog/brands/requests'] },
                    { label: 'Lookups', icon: 'pi pi-fw pi-tags', routerLink: ['/catalog/lookups'] }
                ]
            },
        ];
    }
}
