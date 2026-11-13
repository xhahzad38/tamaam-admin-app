import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { errorMessage } from '@/app/core/http/api-error';
import { BRAND_AUTHORIZATION_TYPES, BrandAuthorizationQueueCounts, BrandAuthorizationQueueItem } from '@/app/features/catalog/data-access/brand.models';
import { BrandService } from '@/app/features/catalog/data-access/brand.service';
import { ApprovalStatus, approvalStatusLabel, approvalStatusSeverity } from '@/app/features/sellers/data-access/seller-review.models';
import { createPagedList } from '@/app/shared/data/paged-list';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { StatusTab, StatusTabsComponent } from '@/app/shared/ui/status-tabs/status-tabs.component';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';
import { toMediaUrl } from '@/app/shared/utils/media.util';

type AuthorizationQueue = 'submitted' | 'approved' | 'rejected' | 'all';

interface QueueDefinition {
    id: AuthorizationQueue;
    label: string;
    tone: StatusTab['tone'];
    emptyTitle: string;
    emptyMessage: string;
}

const QUEUES: QueueDefinition[] = [
    {
        id: 'submitted',
        label: 'Pending review',
        tone: 'info',
        emptyTitle: 'You are all caught up',
        emptyMessage: 'New requests appear here when a seller asks to sell a restricted brand.'
    },
    { id: 'approved', label: 'Approved', tone: 'neutral', emptyTitle: 'No approved authorizations', emptyMessage: 'Approved requests are listed here with their validity dates.' },
    { id: 'rejected', label: 'Rejected', tone: 'neutral', emptyTitle: 'No rejected requests', emptyMessage: 'Requests you reject are kept here with your note.' },
    { id: 'all', label: 'All', tone: 'neutral', emptyTitle: 'No authorization requests yet', emptyMessage: 'Sellers request access from the brand page in the seller center.' }
];

/** Queue of seller requests to sell restricted brands: review the authorization letter, then approve with dates or reject with a note. */
@Component({
    selector: 'app-brand-authorization-queue',
    standalone: true,
    imports: [
        DatePipe,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        TableModule,
        TagModule,
        InputControlComponent,
        PageHeaderComponent,
        SearchControlComponent,
        StatusTabsComponent,
        TablePaginatorComponent,
        ErrorStateComponent,
        EmptyStateComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './brand-authorization-queue.html',
    styleUrl: './brand-authorization-queue.scss'
})
export class BrandAuthorizationQueuePage {
    private readonly brands = inject(BrandService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);

    readonly crumbs: MenuItem[] = [{ label: 'Brands', routerLink: '/catalog/brands' }, { label: 'Brand authorization review' }];
    readonly queue = signal<AuthorizationQueue>('submitted');
    readonly counts = signal<BrandAuthorizationQueueCounts | null>(null);
    readonly list = createPagedList<BrandAuthorizationQueueItem>(
        (req) => this.brands.authorizationQueue(this.queue(), req.search, req.pageNo, req.pageSize),
        { errorMessage: 'Could not load brand authorizations.', autoLoad: false }
    );

    readonly tabs = computed<StatusTab[]>(() => {
        const counts = this.counts();
        return QUEUES.map((queue) => ({ id: queue.id, label: queue.label, tone: queue.tone, count: counts ? counts[queue.id] : null }));
    });
    readonly activeQueue = computed(() => QUEUES.find((queue) => queue.id === this.queue()) ?? QUEUES[0]);

    readonly selected = signal<BrandAuthorizationQueueItem | null>(null);
    readonly saving = signal<'approve' | 'reject' | null>(null);
    readonly formError = signal<string | null>(null);
    readonly review = new FormGroup({
        validFrom: new FormControl('', { nonNullable: true }),
        validTo: new FormControl('', { nonNullable: true }),
        note: new FormControl('', { nonNullable: true })
    });

    readonly mediaUrl = toMediaUrl;
    readonly statusLabel = approvalStatusLabel;
    readonly statusSeverity = approvalStatusSeverity;

    constructor() {
        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            const requested = params.get('queue') as AuthorizationQueue | null;
            this.queue.set(requested && QUEUES.some((queue) => queue.id === requested) ? requested : 'submitted');
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

    typeLabel(type: string): string {
        return BRAND_AUTHORIZATION_TYPES.find((option) => option.value === type)?.label ?? type;
    }

    brandInitial(name: string): string {
        return (name.trim()[0] ?? '?').toUpperCase();
    }

    isPending(item: BrandAuthorizationQueueItem): boolean {
        return item.approvalStatus === ApprovalStatus.Submitted || item.approvalStatus === ApprovalStatus.UnderReview;
    }

    /** Whole days a pending request has been waiting. */
    daysWaiting(item: BrandAuthorizationQueueItem): number | null {
        if (!this.isPending(item)) {
            return null;
        }
        return Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86_400_000));
    }

    open(item: BrandAuthorizationQueueItem): void {
        this.formError.set(null);
        this.review.setValue({ validFrom: item.validFrom ?? '', validTo: item.validTo ?? '', note: '' });
        this.selected.set(item);
    }

    close(): void {
        if (!this.saving()) {
            this.selected.set(null);
        }
    }

    decide(approve: boolean): void {
        const item = this.selected();
        if (!item || this.saving()) {
            return;
        }
        const value = this.review.getRawValue();
        if (approve && (!value.validFrom || !value.validTo)) {
            this.formError.set('Enter the dates this authorization is valid.');
            return;
        }
        if (approve && value.validTo < value.validFrom) {
            this.formError.set('"Valid to" must be on or after "Valid from".');
            return;
        }
        if (!approve && !value.note.trim()) {
            this.formError.set('Add a note so the seller knows why the request was rejected.');
            return;
        }

        this.saving.set(approve ? 'approve' : 'reject');
        this.formError.set(null);
        this.brands
            .reviewAuthorization(item.brandId, item.id, {
                approve,
                note: value.note.trim() || null,
                validFrom: approve ? value.validFrom : null,
                validTo: approve ? value.validTo : null
            })
            .subscribe({
                next: () => {
                    this.saving.set(null);
                    this.selected.set(null);
                    this.messages.add({
                        severity: 'success',
                        summary: approve ? 'Authorization approved' : 'Authorization rejected',
                        detail: `${item.storeName} · ${item.brandName}`
                    });
                    this.list.reload();
                    this.loadCounts();
                },
                error: (error) => {
                    this.saving.set(null);
                    this.formError.set(errorMessage(error, 'Could not save the review.'));
                }
            });
    }

    private loadCounts(): void {
        this.brands.authorizationQueueCounts(this.list.query()).subscribe({
            next: (counts) => this.counts.set(counts),
            error: () => this.counts.set(null)
        });
    }
}
