import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { errorMessage } from '@/app/core/http/api-error';
import { PricingAdminService } from '@/app/features/pricing/data-access/pricing-admin.service';
import { ErrorStateComponent } from '@/app/shared/ui/state/state.components';

export interface PriceRangeTarget {
    variantId: string;
    title: string;
    subtitle: string;
    currentPrice: number | null;
    globalMinPrice: number | null;
    globalMaxPrice: number | null;
}

/**
 * Sets the allowed price range for one SKU across all sellers.
 * Live offers outside the range are paused by the API, so the caller should reload after `saved`.
 */
@Component({
    selector: 'app-price-range-dialog',
    standalone: true,
    imports: [FormsModule, ButtonModule, DialogModule, InputNumberModule, ErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [header]="'Allowed price range'" [visible]="!!target()" (visibleChange)="!$event && close()" [modal]="true" [style]="{ width: 'min(30rem, 94vw)' }" [draggable]="false">
            @if (target(); as t) {
                <p class="m-0 font-medium">{{ t.title }}</p>
                <p class="m-0 mb-4 text-sm text-muted-color">{{ t.subtitle }}</p>

                <div class="form-grid">
                    <div class="flex flex-col gap-1">
                        <label for="range-min" class="text-sm font-medium">Minimum price</label>
                        <p-inputnumber inputId="range-min" [(ngModel)]="min" [min]="0" [maxFractionDigits]="2" prefix="Rs " placeholder="No minimum" fluid />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="range-max" class="text-sm font-medium">Maximum price</label>
                        <p-inputnumber inputId="range-max" [(ngModel)]="max" [min]="0" [maxFractionDigits]="2" prefix="Rs " placeholder="No maximum" fluid />
                    </div>
                </div>

                @if (validation(); as message) {
                    <p class="mt-3 mb-0 text-sm text-danger">{{ message }}</p>
                } @else if (outsideWarning(); as message) {
                    <p class="mt-3 mb-0 text-sm text-warning">{{ message }}</p>
                }
                <p class="mt-3 mb-0 text-sm text-muted-color">Live offers priced outside this range are paused automatically. Leave a field empty for no limit.</p>

                @if (error(); as message) {
                    <div class="mt-3"><app-error-state [message]="message" [retryable]="false" /></div>
                }
            }
            <ng-template #footer>
                <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="close()" />
                <p-button label="Save range" icon="pi pi-check" [loading]="saving()" [disabled]="!!validation()" (onClick)="save()" />
            </ng-template>
        </p-dialog>
    `
})
export class PriceRangeDialogComponent {
    private readonly pricing = inject(PricingAdminService);

    /** The SKU to edit; set to null to close. */
    readonly target = model<PriceRangeTarget | null>(null);
    readonly saved = output<string>();

    readonly min = signal<number | null>(null);
    readonly max = signal<number | null>(null);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);

    readonly validation = computed(() => {
        const min = this.min();
        const max = this.max();
        if (max != null && max <= 0) return 'The maximum must be above zero.';
        if (min != null && max != null && min > max) return 'The minimum cannot be higher than the maximum.';
        return null;
    });

    readonly outsideWarning = computed(() => {
        const price = this.target()?.currentPrice;
        if (price == null) return null;
        const min = this.min();
        const max = this.max();
        return (min != null && price < min) || (max != null && price > max) ? 'This offer\'s current price is outside the range — it will be paused.' : null;
    });

    constructor() {
        effect(() => {
            const t = this.target();
            this.min.set(t?.globalMinPrice ?? null);
            this.max.set(t?.globalMaxPrice ?? null);
            this.error.set(null);
        });
    }

    close(): void {
        this.target.set(null);
    }

    save(): void {
        const t = this.target();
        if (!t || this.validation()) return;
        this.saving.set(true);
        this.error.set(null);
        this.pricing.setPriceRange(t.variantId, { globalMinPrice: this.min(), globalMaxPrice: this.max() }).subscribe({
            next: (message) => {
                this.saving.set(false);
                this.saved.emit(message);
                this.close();
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(errorMessage(err, 'Could not save the price range.'));
            }
        });
    }
}
