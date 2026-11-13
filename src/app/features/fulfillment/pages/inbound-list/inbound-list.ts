import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { TableFilterComponent } from '@/app/shared/ui/table-filter/table-filter.component';

import { AdminFulfillmentService } from '@/app/features/fulfillment/data-access/fulfillment.service';
import { INBOUND_STATUS_LABEL, InboundShipmentListItem, InboundStatus, inboundSeverity } from '@/app/features/fulfillment/data-access/fulfillment.models';

import { errorMessage } from '@/app/core/http/api-error';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent } from '@/app/shared/ui/state/state.components';
@Component({
    selector: 'app-admin-inbound-list',
    standalone: true,
    imports: [DatePipe, RouterLink, SearchControlComponent, TableFilterComponent, ButtonModule, PaginatorModule, TableModule, TagModule, PageHeaderComponent, ErrorStateComponent],
    templateUrl: './inbound-list.html'
})
export class AdminInboundListPage implements OnInit {
    private readonly fulfillment = inject(AdminFulfillmentService);

    readonly crumbs: MenuItem[] = [{ label: 'Inbound receiving' }];
    readonly statuses: Array<{ label: string; value: InboundStatus | null }> = [
        { label: 'All', value: null },
        { label: 'On its way', value: InboundStatus.InTransit },
        { label: 'Being received', value: InboundStatus.Receiving },
        { label: 'Ready to ship', value: InboundStatus.Sealed },
        { label: 'Received', value: InboundStatus.Received },
        { label: 'Shortfall', value: InboundStatus.PartiallyReceived },
        { label: 'Cancelled', value: InboundStatus.Cancelled }
    ];
    readonly status = signal<InboundStatus | null>(null);
    readonly search = signal('');
    readonly first = signal(0);
    readonly rows = signal(20);
    readonly totalRecords = signal(0);
    readonly items = signal<InboundShipmentListItem[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly statusLabel = (value: number) => INBOUND_STATUS_LABEL[value] ?? 'Draft';
    readonly severity = inboundSeverity;

    ngOnInit(): void {
        this.load();
    }

    setStatus(value: InboundStatus | null): void {
        this.status.set(value);
        this.first.set(0);
        this.load();
    }

    onSearch(value: string): void {
        this.search.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 20);
        this.load();
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.fulfillment.inboundShipments(this.search(), this.status(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(errorMessage(error, 'Could not load inbound shipments.'));
            }
        });
    }
}
