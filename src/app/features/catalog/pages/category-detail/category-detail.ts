import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { CategoryDetail } from '@/app/features/catalog/data-access/category.models';
import { CategoryService } from '@/app/features/catalog/data-access/category.service';

import { errorMessage } from '@/app/core/http/api-error';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, LoadingStateComponent } from '@/app/shared/ui/state/state.components';
@Component({
    selector: 'app-category-detail',
    standalone: true,
    imports: [RouterLink, ButtonModule, PageHeaderComponent, ErrorStateComponent, LoadingStateComponent],
    templateUrl: './category-detail.html'
})
export class CategoryDetailPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs = signal<MenuItem[]>([
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Category' }
    ]);
    readonly detail = signal<CategoryDetail | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.load(id);
            }
        });
    }

    load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.categories.get(id).subscribe({
            next: (detail) => {
                this.detail.set(detail);
                this.crumbs.set([
                    { label: 'Categories', routerLink: '/catalog/categories' },
                    { label: detail.name }
                ]);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(errorMessage(error, 'Could not load this category.'));
            }
        });
    }
}
