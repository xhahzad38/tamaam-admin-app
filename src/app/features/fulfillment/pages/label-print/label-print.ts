import { Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BarcodeComponent } from '@/app/shared/ui/barcode/barcode.component';

import { AdminFulfillmentService } from '@/app/features/fulfillment/data-access/fulfillment.service';
import { CONDITION_LABEL, InboundLabels, UnitLabel } from '@/app/features/fulfillment/data-access/fulfillment.models';

import { errorMessage } from '@/app/core/http/api-error';
import { ErrorStateComponent, LoadingStateComponent } from '@/app/shared/ui/state/state.components';
type Sheet = 'roll' | 'a4';

/** Hard cap so one large shipment cannot freeze the browser. */
const MAX_UNIT_LABELS = 3000;

/**
 * Reprints a seller's inbound labels at the warehouse, for example when a carton label is torn.
 */
@Component({
    selector: 'app-label-print',
    standalone: true,
    imports: [RouterLink, ButtonModule, BarcodeComponent, ErrorStateComponent, LoadingStateComponent],
    templateUrl: './label-print.html',
    styleUrl: './label-print.scss',
    encapsulation: ViewEncapsulation.None
})
export class LabelPrintPage implements OnInit {
    private readonly fulfillment = inject(AdminFulfillmentService);
    private readonly route = inject(ActivatedRoute);

    readonly shipment = signal<InboundLabels | null>(null);
    readonly units = signal<UnitLabel[]>([]);
    readonly sheet = signal<Sheet>('a4');
    readonly showUnits = signal(false);
    readonly showCartons = signal(true);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly conditionLabel = (value: number) => CONDITION_LABEL[value] ?? 'New';
    readonly backLink = signal<unknown[]>(['/fulfillment/inbound']);
    readonly unitCopies = computed(() => {
        const copies: UnitLabel[] = [];
        for (const label of this.units()) {
            for (let index = 0; index < label.copies && copies.length < MAX_UNIT_LABELS; index++) {
                copies.push(label);
            }
        }
        return copies;
    });
    readonly totalRequested = computed(() => this.units().reduce((sum, label) => sum + label.copies, 0));
    readonly capped = computed(() => this.totalRequested() > MAX_UNIT_LABELS);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.backLink.set(['/fulfillment/inbound', id]);
        this.fulfillment.inboundLabels(id).subscribe({
            next: (labels) => {
                this.shipment.set(labels);
                this.units.set(labels.units);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(errorMessage(error, 'Could not load the labels for this shipment.'));
            }
        });
    }

    print(): void {
        window.print();
    }

    truncate(value: string, length: number): string {
        return value.length > length ? `${value.slice(0, length - 1)}…` : value;
    }
}
