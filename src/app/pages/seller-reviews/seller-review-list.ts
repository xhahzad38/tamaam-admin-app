import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { AccountType, APPROVAL_STATUS_LABEL, ApprovalStatus, ReviewListItem } from './seller-review.models';
import { SellerReviewService } from './seller-review.service';

interface QueueOption {
    id: string;
    label: string;
}

@Component({
    selector: 'app-seller-review-list',
    standalone: true,
    imports: [DatePipe, RouterLink, BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, TagModule],
    templateUrl: './seller-review-list.html'
})
export class SellerReviewList implements OnInit {
    private readonly reviews = inject(SellerReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly queues: QueueOption[] = [
        { id: 'pending', label: 'Pending' },
        { id: 'actionRequired', label: 'Action required' },
        { id: 'approved', label: 'Approved' },
        { id: 'all', label: 'All' }
    ];
    readonly crumbs: MenuItem[] = [{ label: 'Seller reviews' }];
    readonly queue = signal('pending');
    readonly search = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly items = signal<ReviewListItem[]>([]);
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
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.reviews.list(this.queue(), this.search(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(error?.messages?.[0] ?? 'Could not load seller applications.');
            }
        });
    }

    accountLabel(item: ReviewListItem): string {
        return item.accountType === AccountType.Business ? 'Business' : 'Individual';
    }

    statusLabel(status: ApprovalStatus): string {
        return APPROVAL_STATUS_LABEL[status] ?? 'Draft';
    }

    statusSeverity(status: ApprovalStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (status) {
            case ApprovalStatus.Approved:
                return 'success';
            case ApprovalStatus.Submitted:
            case ApprovalStatus.UnderReview:
                return 'info';
            case ApprovalStatus.ActionRequired:
                return 'warn';
            case ApprovalStatus.Rejected:
            case ApprovalStatus.Suspended:
                return 'danger';
            default:
                return 'secondary';
        }
    }
}
