import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CATALOG_STATUS_LABEL, CatalogProductListItem, STRUCTURE_LABEL } from '@/app/features/catalog/data-access/catalog-review.models';
import { CatalogReviewService } from '@/app/features/catalog/data-access/catalog-review.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { StatusTab, StatusTabsComponent } from '@/app/shared/ui/status-tabs/status-tabs.component';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';
import { toMediaUrl } from '@/app/shared/utils/media.util';

type ProductQueue = 'pending' | 'live' | 'rejected' | 'archived' | 'all';

interface QueueDefinition {
    id: ProductQueue;
    label: string;
    tone: StatusTab['tone'];
    emptyTitle: string;
    emptyMessage: string;
}

const QUEUES: QueueDefinition[] = [
    { id: 'pending', label: 'Pending review', tone: 'info', emptyTitle: 'You are all caught up', emptyMessage: 'New listings appear here when sellers submit them.' },
    { id: 'live', label: 'Live', tone: 'neutral', emptyTitle: 'No live products', emptyMessage: 'Products you approve go live and are listed here.' },
    { id: 'rejected', label: 'Rejected', tone: 'neutral', emptyTitle: 'No rejected products', emptyMessage: 'Listings you reject are kept here with your note.' },
    { id: 'archived', label: 'Archived', tone: 'neutral', emptyTitle: 'No archived products', emptyMessage: 'Archived products are no longer sold.' },
    { id: 'all', label: 'All', tone: 'neutral', emptyTitle: 'No products yet', emptyMessage: 'Listings appear here once sellers submit them.' }
];

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';
const STATUS_SEVERITY: Record<number, Severity> = { 1: 'info', 2: 'success', 3: 'danger', 4: 'secondary' };

/** New product listings waiting to go live, plus every reviewed listing by status. */
@Component({
    selector: 'app-product-review-list',
    standalone: true,
    imports: [
        DatePipe,
        RouterLink,
        ButtonModule,
        TableModule,
        TagModule,
        PageHeaderComponent,
        SearchControlComponent,
        StatusTabsComponent,
        TablePaginatorComponent,
        ErrorStateComponent,
        EmptyStateComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './product-review-list.html',
    styleUrl: './product-review-list.scss'
})
export class ProductReviewListPage {
    private readonly reviews = inject(CatalogReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly crumbs: MenuItem[] = [{ label: 'Product review' }];
    readonly queue = signal<ProductQueue>('pending');
    readonly counts = signal<Record<string, number> | null>(null);
    readonly list = createPagedList<CatalogProductListItem>((req) => this.reviews.products(this.queue(), req.search, req.pageNo, req.pageSize), {
        errorMessage: 'Could not load the product queue.',
        autoLoad: false
    });

    readonly tabs = computed<StatusTab[]>(() => {
        const counts = this.counts();
        return QUEUES.map((queue) => ({ id: queue.id, label: queue.label, tone: queue.tone, count: counts?.[queue.id] ?? null }));
    });
    readonly activeQueue = computed(() => QUEUES.find((queue) => queue.id === this.queue()) ?? QUEUES[0]);

    readonly mediaUrl = toMediaUrl;
    readonly statusLabel = (value: number) => CATALOG_STATUS_LABEL[value] ?? 'Draft';
    readonly statusSeverity = (value: number): Severity => STATUS_SEVERITY[value] ?? 'secondary';
    readonly structureLabel = (value: number) => STRUCTURE_LABEL[value] ?? 'Simple';

    constructor() {
        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            const requested = params.get('queue') as ProductQueue | null;
            this.queue.set(requested && QUEUES.some((queue) => queue.id === requested) ? requested : 'pending');
            this.list.reset();
        });
        this.loadCounts();
    }

    selectQueue(id: string): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { queue: id }, queryParamsHandling: 'merge' });
    }

    onSearch(text: string): void {
        this.list.search(text);
        this.loadCounts();
    }

    open(item: CatalogProductListItem): void {
        void this.router.navigate(['/catalog/product-reviews', item.id]);
    }

    isPending(item: CatalogProductListItem): boolean {
        return item.status === 1;
    }

    /** Whole days a pending listing has been waiting. */
    daysWaiting(item: CatalogProductListItem): number | null {
        if (!this.isPending(item)) {
            return null;
        }
        return Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86_400_000));
    }

    private loadCounts(): void {
        this.reviews.productCounts(this.list.query()).subscribe({
            next: (counts) => this.counts.set(counts),
            error: () => this.counts.set(null)
        });
    }
}
