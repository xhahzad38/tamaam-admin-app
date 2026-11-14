import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { AdminFulfillmentService } from '@/app/features/fulfillment/data-access/fulfillment.service';
import {
    CONDITION_LABEL,
    CartonStatus,
    INBOUND_STATUS_LABEL,
    InboundCarton,
    InboundItem,
    InboundShipmentDetail,
    InboundStatus,
    Severity,
    inboundSeverity
} from '@/app/features/fulfillment/data-access/fulfillment.models';
import { errorMessage } from '@/app/core/http/api-error';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, LoadingStateComponent } from '@/app/shared/ui/state/state.components';
import { toMediaUrl } from '@/app/shared/utils/media.util';

interface Count {
    good: number;
    damaged: number;
}

interface ScanResult {
    tone: 'ok' | 'warn' | 'error';
    title: string;
    detail: string;
}

interface Step {
    label: string;
    detail: string;
    when: string | null;
    state: 'done' | 'current' | 'todo' | 'problem';
}

/**
 * One inbound shipment at the fulfillment center, as a guided flow:
 * 1. Check in: scan every carton label at the dock (cartons not scanned become missing).
 * 2. Count: scan every unit's FNSKU (sellable or damaged), save progress as often as needed.
 * 3. Close: sellable units become available; anything not counted is a discrepancy.
 */
@Component({
    selector: 'app-inbound-receive',
    standalone: true,
    imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, TagModule, PageHeaderComponent, ErrorStateComponent, LoadingStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './inbound-receive.html',
    styleUrl: './inbound-receive.scss'
})
export class InboundReceivePage implements OnInit {
    private readonly confirm = inject(ConfirmService);
    private readonly fulfillment = inject(AdminFulfillmentService);
    private readonly route = inject(ActivatedRoute);
    private readonly messages = inject(MessageService);

    private readonly scanInput = viewChild<ElementRef<HTMLInputElement>>('scanInput');

    readonly crumbs = signal<MenuItem[]>([{ label: 'Inbound receiving', routerLink: '/fulfillment/inbound' }, { label: 'Shipment' }]);
    readonly scan = new FormControl('', { nonNullable: true });
    readonly notes = new FormControl('', { nonNullable: true });
    readonly shipment = signal<InboundShipmentDetail | null>(null);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly lastScan = signal<ScanResult | null>(null);
    readonly lastItemId = signal<string | null>(null);

    /** Check-in step: carton numbers scanned (or ticked) at the dock, not yet submitted. */
    readonly arrivedCartons = signal<Set<string>>(new Set());
    /** Count step: units counted in this session, not yet saved. */
    readonly counts = signal<Record<string, Count>>({});
    readonly damagedMode = signal(false);

    readonly Status = InboundStatus;
    readonly mediaUrl = toMediaUrl;
    readonly statusLabel = (value: number) => INBOUND_STATUS_LABEL[value] ?? 'Draft';
    readonly conditionLabel = (value: number) => CONDITION_LABEL[value] ?? 'New';
    readonly severity = inboundSeverity;

    readonly phase = computed<'not-shipped' | 'check-in' | 'count' | 'closed' | 'cancelled'>(() => {
        switch (this.shipment()?.status) {
            case InboundStatus.InTransit:
                return 'check-in';
            case InboundStatus.Arrived:
            case InboundStatus.Receiving:
                return 'count';
            case InboundStatus.Received:
            case InboundStatus.PartiallyReceived:
                return 'closed';
            case InboundStatus.Cancelled:
                return 'cancelled';
            default:
                return 'not-shipped';
        }
    });

    readonly steps = computed<Step[]>(() => {
        const s = this.shipment();
        if (!s) {
            return [];
        }
        const phase = this.phase();
        const counted = s.items.reduce((sum, item) => sum + item.receivedGoodQty + item.receivedUnsellableQty, 0);
        const order = ['not-shipped', 'check-in', 'count', 'closed'];
        const at = order.indexOf(phase === 'cancelled' ? 'not-shipped' : phase);
        const state = (index: number): Step['state'] => (at > index ? 'done' : at === index ? 'current' : 'todo');
        return [
            { label: 'Shipped by seller', detail: s.courierName ?? 'Waiting for the seller', when: s.shippedAt, state: s.shippedAt ? 'done' : 'current' },
            {
                label: 'Checked in at dock',
                detail: s.arrivedAt
                    ? s.missingCartons
                        ? `${s.checkedInCartons} of ${s.cartonCount} cartons · ${s.missingCartons} missing`
                        : `All ${s.cartonCount} cartons arrived`
                    : `${s.cartonCount} carton(s) expected`,
                when: s.arrivedAt,
                state: s.arrivedAt && s.missingCartons ? 'problem' : state(1)
            },
            { label: 'Units counted', detail: `${counted} of ${s.unitCount} units`, when: null, state: state(2) },
            {
                label: 'Closed',
                detail: s.status === InboundStatus.PartiallyReceived ? 'With discrepancy' : s.status === InboundStatus.Received ? 'All units received' : 'Not yet',
                when: s.receivedAt,
                state: s.status === InboundStatus.PartiallyReceived ? 'problem' : at >= 3 ? 'done' : 'todo'
            }
        ];
    });

    // ---- check-in -------------------------------------------------------------------------
    readonly cartonsToCheck = computed(() => this.shipment()?.cartons ?? []);
    readonly arrivedCount = computed(() => this.cartonsToCheck().filter((carton) => this.isArrived(carton)).length);

    // ---- counting -------------------------------------------------------------------------
    readonly sessionCounted = computed(() => Object.values(this.counts()).reduce((sum, count) => sum + count.good + count.damaged, 0));
    readonly sessionDamaged = computed(() => Object.values(this.counts()).reduce((sum, count) => sum + count.damaged, 0));
    readonly stillExpected = computed(() => (this.shipment()?.items ?? []).reduce((sum, item) => sum + item.remainingQty, 0) - this.sessionCounted());
    readonly missingCartons = computed(() => (this.shipment()?.cartons ?? []).filter((carton) => carton.status === CartonStatus.Missing));

    // ---- result ---------------------------------------------------------------------------
    readonly totals = computed(() => {
        const items = this.shipment()?.items ?? [];
        const expected = items.reduce((sum, item) => sum + item.expectedQty, 0);
        const good = items.reduce((sum, item) => sum + item.receivedGoodQty, 0);
        const damaged = items.reduce((sum, item) => sum + item.receivedUnsellableQty, 0);
        return { expected, good, damaged, missing: Math.max(0, expected - good - damaged) };
    });

    ngOnInit(): void {
        this.load();
    }

    // ---- shared ---------------------------------------------------------------------------

    cartonStatus(carton: InboundCarton): { label: string; severity: Severity } {
        switch (carton.status) {
            case CartonStatus.Received:
                return { label: 'Checked in', severity: 'success' };
            case CartonStatus.Missing:
                return { label: 'Missing', severity: 'danger' };
            default:
                return this.phase() === 'check-in' && this.isArrived(carton) ? { label: 'Scanned', severity: 'info' } : { label: 'Expected', severity: 'secondary' };
        }
    }

    /** Barcode scanners type the code and press Enter. */
    onScan(): void {
        const code = this.scan.value.trim().toUpperCase();
        this.scan.setValue('');
        if (!code || !this.shipment()) {
            return;
        }
        if (this.phase() === 'check-in') {
            this.scanCarton(code);
        } else if (this.phase() === 'count') {
            this.scanUnit(code);
        }
        this.focusScan();
    }

    // ---- step 1: check in -----------------------------------------------------------------

    isArrived(carton: InboundCarton): boolean {
        return carton.status === CartonStatus.Received || this.arrivedCartons().has(carton.cartonNumber.toUpperCase());
    }

    toggleCarton(carton: InboundCarton): void {
        const key = carton.cartonNumber.toUpperCase();
        this.arrivedCartons.update((current) => {
            const next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }

    markAllArrived(): void {
        this.arrivedCartons.set(new Set(this.cartonsToCheck().map((carton) => carton.cartonNumber.toUpperCase())));
        this.lastScan.set({ tone: 'ok', title: 'All cartons marked as arrived', detail: 'Confirm the arrival when the count of boxes on the dock matches.' });
    }

    async confirmArrival(): Promise<void> {
        const shipment = this.shipment();
        if (!shipment) {
            return;
        }
        const scanned = [...this.arrivedCartons()];
        if (!scanned.length) {
            this.lastScan.set({ tone: 'error', title: 'No carton scanned yet', detail: 'Scan the label on each carton as it comes off the truck.' });
            return;
        }
        const missing = shipment.cartonCount - scanned.length;
        const message = missing > 0
            ? `${missing} of ${shipment.cartonCount} carton(s) were not scanned and will be recorded as missing. The seller is notified. You can still check a late carton in while counting.`
            : `All ${shipment.cartonCount} carton(s) are on the dock. Next you will count the units inside.`;
        const ok = await this.confirm.ask({ title: 'Confirm arrival', message, acceptLabel: missing > 0 ? 'Confirm with missing cartons' : 'Confirm arrival', danger: missing > 0 });
        if (!ok) {
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.fulfillment.checkIn(shipment.id, scanned, this.notes.value.trim() || null).subscribe({
            next: ({ data, message: text }) => {
                this.saving.set(false);
                this.notes.setValue('');
                this.apply(data);
                this.messages.add({ severity: missing > 0 ? 'warn' : 'success', summary: 'Checked in', detail: text, life: 5000 });
                this.lastScan.set({ tone: 'ok', title: 'Ready to count', detail: 'Open the first carton and scan each unit\'s FNSKU label.' });
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(errorMessage(error, 'Could not check the shipment in.'));
            }
        });
    }

    private scanCarton(code: string): void {
        const shipment = this.shipment()!;
        const carton = shipment.cartons.find((row) => row.cartonNumber.toUpperCase() === code);
        if (!carton) {
            const unit = this.findItem(code);
            this.lastScan.set(unit
                ? { tone: 'warn', title: 'That is a unit label', detail: `${code} is a product FNSKU. At check-in, scan the carton label (it starts with ${shipment.asnNumber}-C).` }
                : { tone: 'error', title: `${code} is not on this shipment`, detail: 'Put the carton aside as a problem receipt and check the ASN on its label.' });
            return;
        }
        if (this.isArrived(carton)) {
            this.lastScan.set({ tone: 'warn', title: `${carton.cartonNumber} already scanned`, detail: 'This carton is already checked in. Make sure it was not labelled twice.' });
            return;
        }
        this.arrivedCartons.update((current) => new Set(current).add(code));
        const left = shipment.cartonCount - this.arrivedCount();
        this.lastScan.set({
            tone: 'ok',
            title: `${carton.cartonNumber} checked in`,
            detail: `${carton.unitCount} units inside. ${left > 0 ? `${left} carton(s) still to scan.` : 'Every carton is here. Confirm the arrival.'}`
        });
    }

    // ---- step 2: count --------------------------------------------------------------------

    count(itemId: string): Count {
        return this.counts()[itemId] ?? { good: 0, damaged: 0 };
    }

    left(item: InboundItem): number {
        const now = this.count(item.id);
        return Math.max(0, item.remainingQty - now.good - now.damaged);
    }

    progress(item: InboundItem): number {
        const now = this.count(item.id);
        const done = item.receivedGoodQty + item.receivedUnsellableQty + now.good + now.damaged;
        return item.expectedQty ? Math.min(100, Math.round((done / item.expectedQty) * 100)) : 0;
    }

    setCount(item: InboundItem, field: keyof Count, value: string): void {
        const other = field === 'good' ? this.count(item.id).damaged : this.count(item.id).good;
        const qty = Math.min(Math.max(0, Math.floor(Number(value) || 0)), Math.max(0, item.remainingQty - other));
        this.counts.update((counts) => ({ ...counts, [item.id]: { ...this.count(item.id), [field]: qty } }));
    }

    step(item: InboundItem, field: keyof Count, delta: number): void {
        this.setCount(item, field, String(this.count(item.id)[field] + delta));
    }

    clearSession(): void {
        this.counts.set({});
        this.lastScan.set(null);
        this.focusScan();
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
            this.lastScan.set({ tone: 'error', title: 'Nothing to save', detail: 'Scan or enter at least one unit first.' });
            return;
        }
        if (complete) {
            const short = this.stillExpected();
            const message = short > 0
                ? `${short} unit(s) were not counted. They will be recorded as missing and the shipment closes with a discrepancy. The seller is notified.`
                : 'Every expected unit is counted. Sellable units become available to sell right away.';
            const ok = await this.confirm.ask({ title: `Close ${shipment.asnNumber}`, message, acceptLabel: short > 0 ? 'Close with discrepancy' : 'Close shipment', danger: short > 0 });
            if (!ok) {
                return;
            }
        }
        this.saving.set(true);
        this.error.set(null);
        this.fulfillment.receive(shipment.id, lines, this.notes.value.trim() || null, complete).subscribe({
            next: (fresh) => {
                this.saving.set(false);
                this.notes.setValue('');
                this.apply(fresh);
                this.messages.add({
                    severity: 'success',
                    summary: complete ? 'Shipment closed' : 'Progress saved',
                    detail: `${fresh.receivedUnits} of ${fresh.unitCount} units received on ${fresh.asnNumber}.`,
                    life: 4000
                });
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(errorMessage(error, 'Could not save the count.'));
            }
        });
    }

    private scanUnit(code: string): void {
        const shipment = this.shipment()!;
        const item = this.findItem(code);
        if (!item) {
            const carton = shipment.cartons.find((row) => row.cartonNumber.toUpperCase() === code);
            if (carton?.status === CartonStatus.Missing) {
                this.checkInLateCarton(carton);
            } else if (carton) {
                const contents = carton.lines.map((line) => `${line.qty} × ${line.fnsku}`).join(', ');
                this.lastScan.set({ tone: 'ok', title: `Carton ${carton.cartonNumber}`, detail: `Should contain ${contents || `${carton.unitCount} units`}. Scan each unit inside.` });
            } else {
                this.lastScan.set({ tone: 'error', title: `${code} is not on this shipment`, detail: 'Put the unit aside as a problem receipt and add a note.' });
            }
            return;
        }
        this.lastItemId.set(item.id);
        if (this.left(item) <= 0) {
            this.lastScan.set({ tone: 'warn', title: `Extra unit of ${item.fnsku}`, detail: `All ${item.expectedQty} expected units are counted. Put it aside and add a note.` });
            return;
        }
        const field: keyof Count = this.damagedMode() ? 'damaged' : 'good';
        const current = this.count(item.id);
        this.counts.update((counts) => ({ ...counts, [item.id]: { ...current, [field]: current[field] + 1 } }));
        this.lastScan.set({
            tone: field === 'good' ? 'ok' : 'warn',
            title: `+1 ${field === 'good' ? 'sellable' : 'damaged'} · ${item.fnsku}`,
            detail: `${item.productName}. ${this.left(item)} more expected.`
        });
    }

    private checkInLateCarton(carton: InboundCarton): void {
        const shipment = this.shipment()!;
        this.saving.set(true);
        this.fulfillment.checkIn(shipment.id, [carton.cartonNumber], null).subscribe({
            next: ({ data }) => {
                this.saving.set(false);
                // Keep the counts in progress: only refresh the shipment, carton statuses changed.
                this.shipment.set(data);
                this.lastScan.set({ tone: 'ok', title: `Late carton ${carton.cartonNumber} checked in`, detail: `${carton.unitCount} units inside. Scan them as usual.` });
            },
            error: (error) => {
                this.saving.set(false);
                this.lastScan.set({ tone: 'error', title: 'Could not check the carton in', detail: errorMessage(error, 'Try again.') });
            }
        });
    }

    private findItem(code: string): InboundItem | undefined {
        return this.shipment()?.items.find(
            (row) => row.fnsku.toUpperCase() === code || row.sellerSku.toUpperCase() === code || (row.barcode ?? '').toUpperCase() === code
        );
    }

    private load(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.loading.set(true);
        this.fulfillment.inbound(id).subscribe({
            next: (shipment) => {
                this.loading.set(false);
                this.apply(shipment);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(errorMessage(error, 'Could not load this shipment.'));
            }
        });
    }

    private apply(shipment: InboundShipmentDetail): void {
        this.shipment.set(shipment);
        this.crumbs.set([{ label: 'Inbound receiving', routerLink: '/fulfillment/inbound' }, { label: shipment.asnNumber }]);
        this.counts.set({});
        this.arrivedCartons.set(new Set());
        this.lastItemId.set(null);
        this.focusScan();
    }

    private focusScan(): void {
        setTimeout(() => this.scanInput()?.nativeElement.focus());
    }
}
