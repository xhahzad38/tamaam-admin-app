import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, catalogMediaUrl } from '../catalog.util';
import { CategoryListItem } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-tree',
    standalone: true,
    imports: [RouterLink, BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, TagModule],
    templateUrl: './category-tree.html'
})
export class CategoryTreePage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly router = inject(Router);

    readonly items = signal<CategoryListItem[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly crumbs: MenuItem[] = [{ label: 'Categories' }];
    readonly mediaUrl = catalogMediaUrl;

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.categories.list(this.query(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load categories.'));
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

    openForm(parentCategoryId: string | null = null): void {
        void this.router.navigate(['/catalog/categories/new'], {
            queryParams: parentCategoryId ? { parent: parentCategoryId } : {}
        });
    }

    openEdit(id: string): void {
        void this.router.navigate(['/catalog/categories', id, 'edit']);
    }

    remove(item: CategoryListItem): void {
        if (!window.confirm(`Delete ${item.name}? Categories with children or products cannot be deleted.`)) {
            return;
        }
        this.error.set(null);
        this.categories.delete(item.id).subscribe({
            next: () => this.load(),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the category.'))
        });
    }
}
