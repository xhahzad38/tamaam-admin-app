import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';

import { CategoryListItem } from '@/app/features/catalog/data-access/category.models';
import { CategoryService } from '@/app/features/catalog/data-access/category.service';

import { errorMessage } from '@/app/core/http/api-error';
import { toMediaUrl } from '@/app/shared/utils/media.util';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, EmptyStateComponent } from '@/app/shared/ui/state/state.components';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
@Component({
    selector: 'app-category-tree',
    standalone: true,
    imports: [RouterLink, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, TagModule, PageHeaderComponent, ErrorStateComponent, EmptyStateComponent],
    templateUrl: './category-tree.html'
})
export class CategoryTreePage implements OnInit {
    private readonly confirm = inject(ConfirmService);
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
    readonly mediaUrl = toMediaUrl;

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
                this.error.set(errorMessage(error, 'Could not load categories.'));
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

    async remove(item: CategoryListItem): Promise<void> {
        if (!(await this.confirm.ask({ message: `Delete ${item.name}? Categories with children or products cannot be deleted.`, danger: true, acceptLabel: 'Delete' }))) {
            return;
        }
        this.error.set(null);
        this.categories.delete(item.id).subscribe({
            next: () => this.load(),
            error: (error) => this.error.set(errorMessage(error, 'Could not delete the category.'))
        });
    }
}
