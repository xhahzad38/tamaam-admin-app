import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AdminFulfillmentService } from '@/app/features/fulfillment/data-access/fulfillment.service';
import { INBOUND_STATUS_LABEL, InboundShipmentListItem, InboundStatus, InboundSummary, inboundSeverity } from '@/app/features/fulfillment/data-access/fulfillment.models';
import { createPagedList } from '@/app/shared/data/paged-list';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { StatCardComponent } from '@/app/shared/ui/stat-card/stat-card.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { StatusTab, StatusTabsComponent } from '@/app/shared/ui/status-tabs/status-tabs.component';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';

type Queue = 'all' | 'transit' | 'arrived' | 'receiving' | 'discrepancy' | 'received' | 'sealed' | 'cancelled';

interface QueueDefinition {
    id: Queue;
    label: string;
    status: InboundStatus | null;
    count: (summary: InboundSummary) => number;
    tone: StatusTab['tone'];
    empty: string;
}

const QUEUES: QueueDefinition[] = [
    { id: 'all', label: 'All', status: null, count: (s) => s.all, tone: 'neutral', empty: 'Sealed seller shipments show up here.' },
    { id: 'transit', label: 'On its way', status: InboundStatus.InTransit, count: (s) => s.inTransit, tone: 'info', empty: 'No shipments are on the road to a fulfillment center.' },
    { id: 'arrived', label: 'Arrived · to count', status: InboundStatus.Arrived, count: (s) => s.arrived, tone: 'warn', empty: 'Nothing is waiting on the dock.' },
    { id: 'receiving', label: 'Being received', status: InboundStatus.Receiving, count: (s) => s.receiving, tone: 'info', empty: 'No count is in progress.' },
    { id: 'discrepancy', label: 'Discrepancy', status: InboundStatus.PartiallyReceived, count: (s) => s.discrepancy, tone: 'danger', empty: 'No shipment was closed short.' },
    { id: 'received', label: 'Received', status: InboundStatus.Received, count: (s) => s.received, tone: 'neutral', empty: 'Fully received shipments are kept here.' },
    { id: 'sealed', label: 'Not shipped yet', status: InboundStatus.Sealed, count: (s) => s.readyToShip, tone: 'neutral', empty: 'Sellers have no sealed shipments waiting to leave.' },
    { id: 'cancelled', label: 'Cancelled', status: InboundStatus.Cancelled, count: (s) => s.cancelled, tone: 'neutral', empty: 'No cancelled shipments.' }
];

export type InboundAction = { label: string; icon: string; primary: boolean };

/**
 * Fulfillment center work queue for seller (FBT) shipments.
 * Flow: on its way → check in cartons at the dock → count units → close (received or with discrepancy).
 */
@Component({
    selector: 'app-admin-inbound-list',
    standalone: true,
    imports: [
        DatePipe,
        DecimalPipe,
        RouterLink,
        ButtonModule,
        TableModule,
        TagModule,
        PageHeaderComponent,
        SearchControlComponent,
        StatCardComponent,
        StatusTabsComponent,
        TablePaginatorComponent,
        EmptyStateComponent,
        ErrorStateComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './inbound-list.html',
    styleUrl: './inbound-list.scss'
})
export class AdminInboundListPage {
    private readonly fulfillment = inject(AdminFulfillmentService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly crumbs: MenuItem[] = [{ label: 'Inbound receiving' }];
    readonly queue = signal<Queue>('all');
    readonly summary = signal<InboundSummary | null>(null);
    readonly list = createPagedList<InboundShipmentListItem>(
        (req) => this.fulfillment.inboundShipments(req.search, this.activeQueue().status, req.pageNo, req.pageSize),
        { errorMessage: 'Could not load inbound shipments.', autoLoad: false, pageSize: 20 }
    );

    readonly activeQueue = computed(() => QUEUES.find((queue) => queue.id === this.queue()) ?? QUEUES[0]);
    readonly tabs = computed<StatusTab[]>(() => {
        const summary = this.summary();
        return QUEUES.map((queue) => ({ id: queue.id, label: queue.label, tone: queue.tone, count: summary ? queue.count(summary) : null }));
    });
    readonly atDock = computed(() => {
        const summary = this.summary();
        return summary ? summary.arrived + summary.receiving : null;
    });

    readonly statusLabel = (value: number) => INBOUND_STATUS_LABEL[value] ?? 'Draft';
    readonly severity = inboundSeverity;
    readonly Status = InboundStatus;

    constructor() {
        this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            const requested = params.get('queue') as Queue | null;
            this.queue.set(requested && QUEUES.some((queue) => queue.id === requested) ? requested : 'all');
            this.list.reset();
        });
        this.loadSummary();
    }

    selectQueue(id: string): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { queue: id === 'all' ? null : id }, queryParamsHandling: 'merge' });
    }

    onSearch(text: string): void {
        this.list.search(text);
        this.loadSummary();
    }

    /** One clear next step per row, matching the shipment page. */
    action(item: InboundShipmentListItem): InboundAction {
        switch (item.status) {
            case InboundStatus.InTransit:
                return { label: 'Check in', icon: 'pi pi-sign-in', primary: true };
            case InboundStatus.Arrived:
                return { label: 'Count units', icon: 'pi pi-barcode', primary: true };
            case InboundStatus.Receiving:
                return { label: 'Continue', icon: 'pi pi-barcode', primary: true };
            default:
                return { label: 'View', icon: 'pi pi-angle-right', primary: false };
        }
    }

    progress(item: InboundShipmentListItem): number {
        return item.unitCount ? Math.min(100, Math.round((item.receivedUnits / item.unitCount) * 100)) : 0;
    }

    isOverdue(item: InboundShipmentListItem): boolean {
        if (item.status !== InboundStatus.InTransit || !item.expectedAt) {
            return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(item.expectedAt) < today;
    }

    open(item: InboundShipmentListItem): void {
        void this.router.navigate(['/fulfillment/inbound', item.id]);
    }

    private loadSummary(): void {
        this.fulfillment.inboundSummary(this.list.query()).subscribe({
            next: (summary) => this.summary.set(summary),
            error: () => this.summary.set(null)
        });
    }
}
