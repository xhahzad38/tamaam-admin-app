import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccountType, APPROVAL_STATUS_LABEL, ApprovalStatus, ReviewListItem } from './seller-review.models';
import { SellerReviewService } from './seller-review.service';

interface QueueOption {
    id: string;
    label: string;
}

@Component({
    selector: 'app-seller-review-list',
    standalone: true,
    imports: [DatePipe, FormsModule, RouterLink, ButtonModule, IconFieldModule, InputIconModule, InputTextModule, TableModule, TagModule],
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
    readonly queue = signal('pending');
    readonly search = signal('');
    readonly items = signal<ReviewListItem[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const queue = params.get('queue');
            if (queue && this.queues.some((option) => option.id === queue)) {
                this.queue.set(queue);
            }
            this.load();
        });
    }

    selectQueue(id: string): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { queue: id } });
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.reviews.list(this.queue(), this.search()).subscribe({
            next: (items) => {
                this.items.set(items);
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
