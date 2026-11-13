import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
    ACCOUNT_TYPE_LABEL,
    ReviewListItem,
    approvalStatusLabel,
    approvalStatusSeverity,
    initials
} from '@/app/features/sellers/data-access/seller-review.models';
import { SellerReviewService } from '@/app/features/sellers/data-access/seller-review.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { StatusTab, StatusTabsComponent } from '@/app/shared/ui/status-tabs/status-tabs.component';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';

type ApplicationQueue = 'pending' | 'actionRequired' | 'approved' | 'all';

interface QueueDefinition {
    id: ApplicationQueue;
    label: string;
    tone: StatusTab['tone'];
    emptyTitle: string;
    emptyMessage: string;
}

const QUEUES: QueueDefinition[] = [
    {
        id: 'pending',
        label: 'Pending review',
        tone: 'info',
        emptyTitle: 'You are all caught up',
        emptyMessage: 'New seller applications appear here as soon as they are submitted.'
    },
    {
        id: 'actionRequired',
        label: 'Action required',
        tone: 'warn',
        emptyTitle: 'No applications waiting on sellers',
        emptyMessage: 'Applications with a rejected section stay here until the seller resubmits.'
    },
    {
        id: 'approved',
        label: 'Approved',
        tone: 'neutral',
        emptyTitle: 'No approved sellers yet',
        emptyMessage: 'Sellers move here once every section of their application is approved.'
    },
    { id: 'all', label: 'All', tone: 'neutral', emptyTitle: 'No applications yet', emptyMessage: 'Applications appear here once a seller submits onboarding.' }
];

/** Queue of submitted seller onboarding applications, filtered by review state. */
@Component({
    selector: 'app-seller-application-list',
    standalone: true,
    imports: [DatePipe, RouterLink, TableModule, TagModule, PageHeaderComponent, SearchControlComponent, StatusTabsComponent, TablePaginatorComponent, ErrorStateComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './seller-application-list.html',
    styleUrl: './seller-application-list.scss'
})
export class SellerApplicationListPage {
    private readonly reviews = inject(SellerReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly crumbs: MenuItem[] = [{ label: 'Sellers', routerLink: '/sellers' }, { label: 'Applications' }];
    readonly queue = signal<ApplicationQueue>('pending');
    readonly counts = signal<Record<string, number> | null>(null);
    readonly list = createPagedList<ReviewListItem>((req) => this.reviews.list(this.queue(), req.search, req.pageNo, req.pageSize), {
        errorMessage: 'Could not load seller applications.',
        autoLoad: false
    });

    readonly tabs = computed<StatusTab[]>(() => {
        const counts = this.counts();
        return QUEUES.map((queue) => ({ id: queue.id, label: queue.label, tone: queue.tone, count: counts?.[queue.id] ?? null }));
    });
    readonly activeQueue = computed(() => QUEUES.find((queue) => queue.id === this.queue()) ?? QUEUES[0]);

    readonly accountTypeLabel = ACCOUNT_TYPE_LABEL;
    readonly statusLabel = approvalStatusLabel;
    readonly statusSeverity = approvalStatusSeverity;
    readonly initials = initials;

    constructor() {
        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            const requested = params.get('queue') as ApplicationQueue | null;
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

    open(item: ReviewListItem): void {
        void this.router.navigate(['/sellers/applications', item.organizationId]);
    }

    sellerName(item: ReviewListItem): string {
        return item.displayName || item.legalName || item.email;
    }

    totalSections(item: ReviewListItem): number {
        return item.approvedSections + item.pendingSections + item.rejectedSections;
    }

    share(count: number, item: ReviewListItem): number {
        const total = this.totalSections(item);
        return total > 0 ? (count / total) * 100 : 0;
    }

    /** Whole days since the application was submitted, for "waiting" hints on open applications. */
    daysWaiting(item: ReviewListItem): number | null {
        if (!item.submittedAt || item.pendingSections === 0) {
            return null;
        }
        const elapsed = Date.now() - new Date(item.submittedAt).getTime();
        return Math.max(0, Math.floor(elapsed / 86_400_000));
    }

    private loadCounts(): void {
        this.reviews.queueCounts(this.list.query()).subscribe({
            next: (counts) => this.counts.set(counts),
            error: () => this.counts.set(null)
        });
    }
}
