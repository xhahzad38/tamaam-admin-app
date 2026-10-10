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
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from './seller-review.models';
import { SellerDirectoryItem, SellerReviewService } from './seller-review.service';

interface StatusOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-seller-directory',
    standalone: true,
    imports: [DatePipe, FormsModule, RouterLink, ButtonModule, IconFieldModule, InputIconModule, InputTextModule, TableModule, TagModule],
    templateUrl: './seller-directory.html'
})
export class SellerDirectoryPage implements OnInit {
    private readonly reviews = inject(SellerReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly statuses: StatusOption[] = [
        { label: 'All statuses', value: '' },
        { label: 'Draft', value: 'Draft' },
        { label: 'Submitted', value: 'Submitted' },
        { label: 'Under review', value: 'UnderReview' },
        { label: 'Action required', value: 'ActionRequired' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' },
        { label: 'Suspended', value: 'Suspended' }
    ];

    readonly status = signal('');
    readonly search = signal('');
    readonly page = signal(1);
    readonly pageSize = 20;
    readonly total = signal(0);
    readonly totalPages = signal(0);
    readonly items = signal<SellerDirectoryItem[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.status.set(params.get('status') ?? '');
            this.page.set(1);
            this.load();
        });
    }

    setStatus(status: string): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { status: status || null },
            queryParamsHandling: 'merge'
        });
    }

    searchNow(): void {
        this.page.set(1);
        this.load();
    }

    go(page: number): void {
        if (page < 1 || (this.totalPages() > 0 && page > this.totalPages())) {
            return;
        }
        this.page.set(page);
        this.load();
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

    private load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.reviews.directory(this.search(), this.status(), this.page(), this.pageSize).subscribe({
            next: (response) => {
                this.items.set(response.data ?? []);
                this.total.set(response.totalCount ?? 0);
                this.totalPages.set(response.totalPages ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(error?.messages?.[0] ?? 'Could not load sellers.');
            }
        });
    }
}
