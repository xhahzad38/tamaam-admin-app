import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from '@/app/features/sellers/data-access/seller-review.models';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';

import { BrandChangeRequest } from '@/app/features/catalog/data-access/brand.models';
import { BrandService } from '@/app/features/catalog/data-access/brand.service';

import { errorMessage } from '@/app/core/http/api-error';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, EmptyStateComponent } from '@/app/shared/ui/state/state.components';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
@Component({
    selector: 'app-brand-requests',
    standalone: true,
    imports: [DatePipe, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, PageHeaderComponent, ErrorStateComponent, EmptyStateComponent],
    templateUrl: './brand-requests.html'
})
export class BrandRequestsPage implements OnInit {
    private readonly confirm = inject(ConfirmService);
    private readonly brands = inject(BrandService);
    readonly crumbs: MenuItem[] = [
        { label: 'Brands', routerLink: '/catalog/brands' },
        { label: 'Change requests' }
    ];

    readonly items = signal<BrandChangeRequest[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly actingId = signal<string | null>(null);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.brands.changeRequests(this.query(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(errorMessage(error, 'Could not load brand change requests.'));
            }
        });
    }

    onSearch(value: string): void {
        this.query.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.load();
    }

    statusLabel(status: number): string {
        return APPROVAL_STATUS_LABEL[status as ApprovalStatus] ?? 'Pending';
    }

    async review(request: BrandChangeRequest, approve: boolean): Promise<void> {
        const verb = approve ? 'Approve' : 'Reject';
        if (!(await this.confirm.ask({ message: `${verb} the ${request.fieldName} change for ${request.brandName}?`, acceptLabel: verb }))) {
            return;
        }
        this.actingId.set(request.id);
        this.error.set(null);
        this.brands.review(request.id, approve).subscribe({
            next: () => {
                this.actingId.set(null);
                this.load();
            },
            error: (error) => {
                this.actingId.set(null);
                this.error.set(errorMessage(error, `Could not ${verb.toLowerCase()} this request.`));
            }
        });
    }
}
