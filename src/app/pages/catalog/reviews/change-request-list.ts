import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage } from '../catalog.util';
import { CatalogChangeListItem } from './catalog-review.models';
import { CatalogReviewService } from './catalog-review.service';

@Component({
    selector: 'app-change-request-list',
    standalone: true,
    imports: [DatePipe, RouterLink, BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule],
    templateUrl: './change-request-list.html'
})
export class ChangeRequestListPage implements OnInit {
    private readonly reviews = inject(CatalogReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly queues = [
        { id: 'pending', label: 'Pending' },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' },
        { id: 'all', label: 'All' }
    ];
    readonly crumbs: MenuItem[] = [{ label: 'Catalog changes' }];
    readonly queue = signal('pending');
    readonly search = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly items = signal<CatalogChangeListItem[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const queue = params.get('queue');
            if (queue && this.queues.some((option) => option.id === queue)) {
                this.queue.set(queue);
            }
            this.first.set(0);
            this.load();
        });
    }

    selectQueue(id: string): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { queue: id } });
    }

    onSearch(value: string): void {
        this.search.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.reviews.changes(this.queue(), this.search(), Math.floor(this.first() / this.rows()) + 1, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load change requests.'));
            }
        });
    }
}
