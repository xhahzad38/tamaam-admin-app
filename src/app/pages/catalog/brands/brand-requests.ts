import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from '@/app/pages/seller-reviews/seller-review.models';
import { catalogErrorMessage } from '../catalog.util';
import { BrandChangeRequest } from './brand.models';
import { BrandService } from './brand.service';

@Component({
    selector: 'app-brand-requests',
    standalone: true,
    imports: [DatePipe, RouterLink, ButtonModule, TableModule],
    templateUrl: './brand-requests.html'
})
export class BrandRequestsPage implements OnInit {
    private readonly brands = inject(BrandService);

    readonly items = signal<BrandChangeRequest[]>([]);
    readonly loading = signal(false);
    readonly actingId = signal<string | null>(null);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.brands.changeRequests().subscribe({
            next: (items) => {
                this.items.set(items);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load brand change requests.'));
            }
        });
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
