import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from '@/app/pages/seller-reviews/seller-review.models';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage } from '../catalog.util';
import { BrandChangeRequest } from './brand.models';
import { BrandService } from './brand.service';

@Component({
    selector: 'app-brand-requests',
    standalone: true,
    imports: [DatePipe, BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule],
    templateUrl: './brand-requests.html'
})
export class BrandRequestsPage implements OnInit {
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
                this.error.set(catalogErrorMessage(error, 'Could not load brand change requests.'));
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

    review(request: BrandChangeRequest, approve: boolean): void {
        const verb = approve ? 'Approve' : 'Reject';
        if (!window.confirm(`${verb} the ${request.fieldName} change for ${request.brandName}?`)) {
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
                this.error.set(catalogErrorMessage(error, `Could not ${verb.toLowerCase()} this request.`));
            }
        });
    }
}
