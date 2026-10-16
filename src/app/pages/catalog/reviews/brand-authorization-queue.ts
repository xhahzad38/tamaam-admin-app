import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { APPROVAL_STATUS_LABEL } from '@/app/pages/seller-reviews/seller-review.models';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, catalogMediaUrl } from '../catalog.util';
import { BrandAuthorizationQueueItem } from '../brands/brand.models';
import { BrandService } from '../brands/brand.service';

@Component({
    selector: 'app-brand-authorization-queue',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, BreadCrumbComponent, SearchControlComponent, InputControlComponent, ButtonModule, PaginatorModule, TableModule],
    templateUrl: './brand-authorization-queue.html'
})
export class BrandAuthorizationQueuePage implements OnInit {
    private readonly brands = inject(BrandService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly queues = [
        { id: 'submitted', label: 'Submitted' },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' },
        { id: 'all', label: 'All' }
    ];
    readonly crumbs: MenuItem[] = [{ label: 'Brand authorization review' }];
    readonly queue = signal('submitted');
    readonly search = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly items = signal<BrandAuthorizationQueueItem[]>([]);
    readonly selected = signal<BrandAuthorizationQueueItem | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly mediaUrl = catalogMediaUrl;
    readonly statusLabel = (status: number) => APPROVAL_STATUS_LABEL[status] ?? 'Draft';
    readonly dates = new FormGroup({
        validFrom: new FormControl('', { nonNullable: true }),
        validTo: new FormControl('', { nonNullable: true }),
        note: new FormControl('', { nonNullable: true })
    });

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

    open(row: BrandAuthorizationQueueItem): void {
        this.selected.set(row);
        this.notice.set(null);
        this.error.set(null);
        this.dates.setValue({
            validFrom: row.validFrom ?? '',
            validTo: row.validTo ?? '',
            note: ''
        });
    }

    decide(approve: boolean): void {
        const row = this.selected();
        if (!row) {
            return;
        }
        const value = this.dates.getRawValue();
        if (approve && (!value.validFrom || !value.validTo)) {
            this.error.set('Enter the dates this authorization is valid.');
            return;
        }
        if (!approve && !value.note.trim()) {
            this.error.set('Enter a note explaining the rejection.');
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.brands.reviewAuthorization(row.brandId, row.id, {
            approve,
            note: value.note.trim() || null,
            validFrom: approve ? value.validFrom : null,
            validTo: approve ? value.validTo : null
        }).subscribe({
            next: () => {
                this.saving.set(false);
                this.notice.set(approve ? 'Authorization approved.' : 'Authorization rejected.');
                this.selected.set(null);
                this.load();
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not review the authorization.'));
            }
        });
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.brands.authorizationQueue(this.queue(), this.search(), Math.floor(this.first() / this.rows()) + 1, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load brand authorizations.'));
            }
        });
    }
}
