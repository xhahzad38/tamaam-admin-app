import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from './seller-review.models';
import { SellerDirectoryItem, SellerReviewService } from './seller-review.service';

interface StatusOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-seller-directory',
    standalone: true,
    imports: [DatePipe, FormsModule, RouterLink, BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, TagModule],
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

    readonly crumbs: MenuItem[] = [{ label: 'All sellers' }];
    readonly status = signal('');
    readonly search = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly items = signal<SellerDirectoryItem[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.status.set(params.get('status') ?? '');
            this.first.set(0);
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
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.reviews.directory(this.search(), this.status(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(error?.messages?.[0] ?? 'Could not load sellers.');
            }
        });
    }
}
