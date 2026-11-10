import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { FEE_KINDS_BY_TYPE, FEE_RATE_KIND_LABELS, FeeSlab, SizeTier, tierDimensions } from '@/app/shared/models/rate-card.models';

/** Edits one size tier: its size/weight limits and its weight-band fees. Mutates the tier and emits `changed`. */
@Component({
    selector: 'app-size-tier-editor',
    standalone: true,
    imports: [FormsModule, ButtonModule, CheckboxModule, InputNumberModule, InputTextModule, SelectModule, TableModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './size-tier-editor.html'
})
export class SizeTierEditorComponent {
    readonly tier = input.required<SizeTier>();
    readonly currency = input('PKR');
    readonly changed = output<void>();
    readonly remove = output<void>();

    readonly kindOptions = computed(() => FEE_KINDS_BY_TYPE[this.tier().fulfillmentType].map((kind) => ({ value: kind, label: FEE_RATE_KIND_LABELS[kind] })));
    readonly dimensions = tierDimensions;

    /** Prefix for ids so several editors on one page don't clash. */
    readonly idPrefix = `tier-${Math.random().toString(36).slice(2, 8)}`;

    addSlab(): void {
        const slabs = this.tier().slabs;
        const last = slabs[slabs.length - 1];
        slabs.push({
            kind: last?.kind ?? this.kindOptions()[0].value,
            fromKg: last?.toKg ?? 0,
            toKg: null,
            fee: 0,
            stepKg: null,
            feePerStep: null
        });
        this.changed.emit();
    }

    removeSlab(slab: FeeSlab): void {
        const slabs = this.tier().slabs;
        slabs.splice(slabs.indexOf(slab), 1);
        this.changed.emit();
    }

    /** Client-side check mirroring the API's validation, shown inline before saving. */
    slabError(slab: FeeSlab): string | null {
        if (slab.fee < 0) return 'Fee cannot be negative.';
        if (slab.toKg != null && slab.toKg <= slab.fromKg) return 'Must end above where it starts.';
        return null;
    }
}
