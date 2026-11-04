import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage } from '../../catalog/catalog.util';
import { AdminFulfillmentService } from '../fulfillment.service';
import { Warehouse, WarehouseKind, WarehouseOwnerType } from '../fulfillment.models';

@Component({
    selector: 'app-admin-warehouse-list',
    standalone: true,
    imports: [RouterLink, BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, TagModule],
    templateUrl: './warehouse-list.html'
})
export class AdminWarehouseListPage implements OnInit {
    private readonly fulfillment = inject(AdminFulfillmentService);

    readonly WarehouseOwnerType = WarehouseOwnerType;
    readonly crumbs: MenuItem[] = [{ label: 'Warehouses' }];
    readonly owners: Array<{ label: string; value: WarehouseOwnerType | null }> = [
        { label: 'All', value: null },
        { label: 'Tamaam fulfillment centers', value: WarehouseOwnerType.Platform },
        { label: 'Seller warehouses', value: WarehouseOwnerType.Seller }
    ];
    readonly owner = signal<WarehouseOwnerType | null>(WarehouseOwnerType.Platform);
    readonly search = signal('');
    readonly first = signal(0);
    readonly rows = signal(20);
    readonly totalRecords = signal(0);
    readonly items = signal<Warehouse[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.load();
    }

    setOwner(value: WarehouseOwnerType | null): void {
        this.owner.set(value);
        this.first.set(0);
        this.load();
    }

    onSearch(value: string): void {
        this.search.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 20);
        this.load();
    }

    kindLabel(kind: WarehouseKind): string {
        switch (kind) {
            case WarehouseKind.Fulfillment:
                return 'Fulfillment center';
            case WarehouseKind.Return:
                return 'Returns only';
            case WarehouseKind.Both:
                return 'Pickup and returns';
            default:
                return 'Pickup';
        }
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.fulfillment.warehouses(this.search(), this.owner(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load warehouses.'));
            }
        });
    }
}
