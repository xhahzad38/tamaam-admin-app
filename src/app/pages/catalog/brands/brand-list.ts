import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, catalogMediaUrl } from '../catalog.util';
import { Brand } from './brand.models';
import { BrandService } from './brand.service';

@Component({
    selector: 'app-brand-list',
    standalone: true,
    imports: [BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, TagModule],
    templateUrl: './brand-list.html'
})
export class BrandListPage implements OnInit {
    private readonly brands = inject(BrandService);
    private readonly router = inject(Router);

    readonly items = signal<Brand[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly crumbs: MenuItem[] = [{ label: 'Brands' }];
    readonly mediaUrl = catalogMediaUrl;

    ngOnInit(): void {
        this.load();
    }

    rowActions(brand: Brand): MenuItem[] {
        return [
            { label: 'Edit', icon: 'pi pi-pencil', command: () => this.openForm(brand.id) },
            { label: 'Documents', icon: 'pi pi-file', command: () => void this.router.navigate(['/catalog/brands/documents'], { queryParams: { brand: brand.id } }) },
            { label: 'Authorizations', icon: 'pi pi-verified', command: () => void this.router.navigate(['/catalog/brands/authorizations'], { queryParams: { brand: brand.id } }) },
            { label: 'Delete', icon: 'pi pi-trash', command: () => this.remove(brand) }
        ];
    }

    openForm(id?: string): void {
        void this.router.navigate(id ? ['/catalog/brands', id] : ['/catalog/brands/new']);
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.brands.list(this.query(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load brands.'));
            }
        });
    }

    onSearch(value: string): void {
        this.query.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.load();
    }

    remove(brand: Brand): void {
        if (!window.confirm(`Delete ${brand.name}?`)) {
            return;
        }
        this.brands.delete(brand.id).subscribe({
            next: () => this.load(),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the brand.'))
        });
    }
}
