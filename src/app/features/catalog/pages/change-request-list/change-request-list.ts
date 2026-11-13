import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CatalogChangeListItem } from '@/app/features/catalog/data-access/catalog-review.models';
import { CatalogReviewService } from '@/app/features/catalog/data-access/catalog-review.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { StatusTab, StatusTabsComponent } from '@/app/shared/ui/status-tabs/status-tabs.component';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';

type ChangeQueue = 'pending' | 'approved' | 'rejected' | 'all';

interface QueueDefinition {
    id: ChangeQueue;
    label: string;
    tone: StatusTab['tone'];
    emptyTitle: string;
    emptyMessage: string;
}

const QUEUES: QueueDefinition[] = [
    { id: 'pending', label: 'Pending review', tone: 'info', emptyTitle: 'You are all caught up', emptyMessage: 'Edits to live products appear here when sellers submit them.' },
    { id: 'approved', label: 'Approved', tone: 'neutral', emptyTitle: 'No approved changes', emptyMessage: 'Changes you approve are applied to the live product and listed here.' },
    { id: 'rejected', label: 'Rejected', tone: 'neutral', emptyTitle: 'No rejected changes', emptyMessage: 'Changes you reject are kept here with your note.' },
    { id: 'all', label: 'All', tone: 'neutral', emptyTitle: 'No change requests yet', emptyMessage: 'Sellers submit changes from a live product in the seller center.' }
];

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';
const STATUS_SEVERITY: Record<string, Severity> = { PENDING: 'info', APPROVED: 'success', REJECTED: 'danger' };

/** Edits sellers submitted for products that are already live. */
@Component({
    selector: 'app-change-request-list',
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
    templateUrl: './change-request-list.html',
    styleUrl: './change-request-list.scss'
})
export class ChangeRequestListPage {
    private readonly reviews = inject(CatalogReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly crumbs: MenuItem[] = [{ label: 'Product change requests' }];
    readonly queue = signal<ChangeQueue>('pending');
    readonly counts = signal<Record<string, number> | null>(null);
    readonly list = createPagedList<CatalogChangeListItem>((req) => this.reviews.changes(this.queue(), req.search, req.pageNo, req.pageSize), {
        errorMessage: 'Could not load change requests.',
        autoLoad: false
    });

    readonly tabs = computed<StatusTab[]>(() => {
        const counts = this.counts();
        return QUEUES.map((queue) => ({ id: queue.id, label: queue.label, tone: queue.tone, count: counts?.[queue.id] ?? null }));
    });
    readonly activeQueue = computed(() => QUEUES.find((queue) => queue.id === this.queue()) ?? QUEUES[0]);
    readonly statusSeverity = (code: string): Severity => STATUS_SEVERITY[code?.toUpperCase()] ?? 'secondary';

    constructor() {
        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            const requested = params.get('queue') as ChangeQueue | null;
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

    open(item: CatalogChangeListItem): void {
        void this.router.navigate(['/catalog/change-requests', item.id]);
    }

    isPending(item: CatalogChangeListItem): boolean {
        return item.statusCode?.toUpperCase() === 'PENDING';
    }

    /** Whole days a pending change has been waiting. */
    daysWaiting(item: CatalogChangeListItem): number | null {
        if (!this.isPending(item)) {
            return null;
        }
        return Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86_400_000));
    }

    private loadCounts(): void {
        this.reviews.changeCounts(this.list.query()).subscribe({
            next: (counts) => this.counts.set(counts),
            error: () => this.counts.set(null)
        });
    }
}
