import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { BreadCrumbComponent } from '@/app/shared/ui/bread-crumb/bread-crumb.component';

import { AdminFulfillmentService } from '@/app/features/fulfillment/data-access/fulfillment.service';
import { CONDITION_LABEL, INBOUND_STATUS_LABEL, InboundItem, InboundShipmentDetail, inboundSeverity } from '@/app/features/fulfillment/data-access/fulfillment.models';

import { errorMessage } from '@/app/core/http/api-error';
import { toMediaUrl } from '@/app/shared/utils/media.util';
import { ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
interface Count {
    good: number;
    damaged: number;
}

/**
 * Warehouse receiving: scan FNSKUs (or type counts), save a receipt, and close the shipment when the count is done.
 */
@Component({
    selector: 'app-inbound-receive',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, RouterLink, BreadCrumbComponent, ButtonModule, InputTextModule, TagModule, ErrorStateComponent],
    templateUrl: './inbound-receive.html'
})
export class InboundReceivePage implements OnInit {
    private readonly confirm = inject(ConfirmService);
    private readonly fulfillment = inject(AdminFulfillmentService);
    private readonly route = inject(ActivatedRoute);
    private readonly messages = inject(MessageService);

    @ViewChild('scanInput') scanInput?: ElementRef<HTMLInputElement>;

    readonly crumbs: MenuItem[] = [{ label: 'Inbound receiving', routerLink: '/fulfillment/inbound' }, { label: 'Shipment' }];
    readonly scan = new FormControl('', { nonNullable: true });
    readonly notes = new FormControl('', { nonNullable: true });
    readonly scanDamaged = signal(false);
    readonly shipment = signal<InboundShipmentDetail | null>(null);
    readonly counts = signal<Record<string, Count>>({});
    readonly lastScan = signal<{ ok: boolean; text: string } | null>(null);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly mediaUrl = toMediaUrl;
    readonly statusLabel = (value: number) => INBOUND_STATUS_LABEL[value] ?? 'Draft';
    readonly conditionLabel = (value: number) => CONDITION_LABEL[value] ?? 'New';
    readonly severity = inboundSeverity;
    readonly counted = computed(() => Object.values(this.counts()).reduce((sum, count) => sum + count.good + count.damaged, 0));
    readonly remaining = computed(() => (this.shipment()?.items ?? []).reduce((sum, item) => sum + item.remainingQty, 0));

    ngOnInit(): void {
        this.load();
    }

    count(itemId: string): Count {
        return this.counts()[itemId] ?? { good: 0, damaged: 0 };
    }

    setCount(item: InboundItem, field: keyof Count, value: string): void {
        const qty = Math.max(0, Math.floor(Number(value) || 0));
        this.counts.update((counts) => ({ ...counts, [item.id]: { ...this.count(item.id), [field]: qty } }));
    }

    /** Barcode scanners type the code and press Enter. */
    onScan(): void {
        const code = this.scan.value.trim().toUpperCase();
        this.scan.setValue('');
        const shipment = this.shipment();
        if (!code || !shipment) {
            return;
        }
        const item = shipment.items.find((row) => row.fnsku.toUpperCase() === code || row.sellerSku.toUpperCase() === code || (row.barcode ?? '').toUpperCase() === code);
        if (!item) {
            const carton = shipment.cartons.find((row) => row.cartonNumber.toUpperCase() === code);
            this.lastScan.set(carton
                ? { ok: true, text: `Carton ${carton.cartonNumber}: ${carton.unitCount} units expected inside.` }
                : { ok: false, text: `${code} is not on this shipment. Put the unit aside as a problem receipt.` });
            return;
        }
        const current = this.count(item.id);
        if (current.good + current.damaged >= item.remainingQty) {
            this.lastScan.set({ ok: false, text: `All ${item.remainingQty} expected units of ${item.fnsku} are already counted. Extra unit: note it and put it aside.` });
            return;
        }
        const field: keyof Count = this.scanDamaged() ? 'damaged' : 'good';
        this.counts.update((counts) => ({ ...counts, [item.id]: { ...current, [field]: current[field] + 1 } }));
        this.lastScan.set({ ok: true, text: `${item.fnsku} · ${item.productName}: ${field === 'good' ? 'sellable' : 'damaged'} unit counted.` });
    }

    async save(complete: boolean): Promise<void> {
        const shipment = this.shipment();
        if (!shipment) {
            return;
        }
        const lines = Object.entries(this.counts())
            .filter(([, count]) => count.good + count.damaged > 0)
            .map(([itemId, count]) => ({ itemId, goodQty: count.good, unsellableQty: count.damaged }));
        if (!lines.length && !complete) {
            this.error.set('Count at least one unit before you save a receipt.');
            return;
        }
        if (complete) {
            const short = this.remaining() - this.counted();
            const question = short > 0
                ? `Close ${shipment.asnNumber}? ${short} unit(s) were not counted and will be recorded as missing.`
                : `Close ${shipment.asnNumber}? Every expected unit is counted.`;
            if (!(await this.confirm.ask({ title: 'Close shipment', message: question, acceptLabel: 'Close shipment', danger: short > 0 }))) {
                return;
            }
        }
        this.saving.set(true);
        this.error.set(null);
        this.fulfillment.receive(shipment.id, lines, this.notes.value.trim() || null, complete).subscribe({
            next: (fresh) => {
                this.saving.set(false);
                this.apply(fresh);
                this.notes.setValue('');
                this.messages.add({ severity: 'success', summary: complete ? 'Shipment closed' : 'Receipt saved', detail: `${fresh.receivedUnits} of ${fresh.unitCount} units received on ${fresh.asnNumber}.`, life: 4000 });
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(errorMessage(error, 'Could not save the receipt.'));
            }
        });
    }

    private load(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.fulfillment.inbound(id).subscribe({
            next: (shipment) => this.apply(shipment),
            error: (error) => this.error.set(errorMessage(error, 'Could not load this shipment.'))
        });
    }

    private apply(shipment: InboundShipmentDetail): void {
        this.shipment.set(shipment);
        this.crumbs[1] = { label: shipment.asnNumber };
        this.counts.set({});
        this.lastScan.set(null);
        setTimeout(() => this.scanInput?.nativeElement.focus());
    }
}
