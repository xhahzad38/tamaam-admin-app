import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, catalogMediaUrl } from '../../catalog/catalog.util';
import { AdminFulfillmentService } from '../fulfillment.service';
import { CONDITION_LABEL, FulfillmentType, OFFER_STATUS_LABEL, Offer, OfferStatus, offerSeverity } from '../fulfillment.models';

@Component({
    selector: 'app-admin-offer-list',
    standalone: true,
    imports: [DecimalPipe, RouterLink, BreadCrumbComponent, SearchControlComponent, ButtonModule, PaginatorModule, TableModule, TagModule],
    templateUrl: './offer-list.html'
})
export class AdminOfferListPage implements OnInit {
    private readonly fulfillment = inject(AdminFulfillmentService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [{ label: 'Offers' }];
    readonly statuses: Array<{ label: string; value: OfferStatus | null }> = [
        { label: 'All', value: null },
        { label: 'Live', value: OfferStatus.Active },
        { label: 'Draft', value: OfferStatus.Draft },
        { label: 'Paused', value: OfferStatus.Paused }
    ];
    readonly types: Array<{ label: string; value: FulfillmentType | null }> = [
        { label: 'FBT and FBM', value: null },
        { label: 'FBT', value: FulfillmentType.FBT },
        { label: 'FBM', value: FulfillmentType.FBM }
    ];
    readonly status = signal<OfferStatus | null>(null);
    readonly type = signal<FulfillmentType | null>(null);
    readonly productId = signal<string | null>(null);
    readonly search = signal('');
    readonly first = signal(0);
    readonly rows = signal(20);
    readonly totalRecords = signal(0);
    readonly items = signal<Offer[]>([]);
    readonly loading = signal(false);
    readonly busyId = signal<string | null>(null);
    readonly error = signal<string | null>(null);
    readonly mediaUrl = catalogMediaUrl;
    readonly statusLabel = (value: number) => OFFER_STATUS_LABEL[value] ?? 'Draft';
    readonly conditionLabel = (value: number) => CONDITION_LABEL[value] ?? 'New';
    readonly severity = offerSeverity;

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.productId.set(params.get('productId'));
            this.first.set(0);
            this.load();
        });
    }

    setStatus(value: OfferStatus | null): void {
        this.status.set(value);
        this.first.set(0);
        this.load();
    }

    setType(value: FulfillmentType | null): void {
        this.type.set(value);
        this.first.set(0);
        this.load();
    }

    clearProduct(): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
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

    pause(offer: Offer): void {
        if (!window.confirm(`Pause ${offer.storeName}'s offer ${offer.sellerSku}? Shoppers will stop seeing it.`)) {
            return;
        }
        this.busyId.set(offer.id);
        this.fulfillment.pauseOffer(offer.id).subscribe({
            next: (fresh) => {
                this.busyId.set(null);
                this.items.update((items) => items.map((item) => (item.id === fresh.id ? fresh : item)));
                this.messages.add({ severity: 'success', summary: 'Paused', detail: `${fresh.sellerSku} was paused.`, life: 4000 });
            },
            error: (error) => {
                this.busyId.set(null);
                this.error.set(catalogErrorMessage(error, 'Could not pause the offer.'));
            }
        });
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.fulfillment.offers(this.search(), this.status(), this.type(), this.productId(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load offers.'));
            }
        });
    }
}
