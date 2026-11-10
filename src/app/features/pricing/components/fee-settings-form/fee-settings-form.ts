import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { FeeSettings } from '@/app/shared/models/rate-card.models';

type NumericKey = Exclude<keyof FeeSettings, 'currencyCode'>;

interface Field {
    key: NumericKey;
    label: string;
    hint?: string;
    unit: 'money' | 'days' | 'kg' | 'percent' | 'number';
}

const GROUPS: { title: string; fields: Field[] }[] = [
    {
        title: 'Storage (per cubic foot per month)',
        fields: [
            { key: 'storagePerCbfMonth', label: 'Standard storage', unit: 'money' },
            { key: 'longTermStoragePerCbfMonth', label: 'Long-term storage', unit: 'money' },
            { key: 'longTermAfterDays', label: 'Long-term after', hint: 'Days in stock before long-term rates apply', unit: 'days' },
            { key: 'nonSaleableStoragePerCbfMonth', label: 'Non-saleable storage', unit: 'money' },
            { key: 'nonSaleableAfterDays', label: 'Non-saleable after', unit: 'days' }
        ]
    },
    {
        title: 'Weight and price bands',
        fields: [
            { key: 'volumetricDivisor', label: 'Volumetric divisor', hint: 'L × W × H (cm) ÷ divisor = volumetric kg', unit: 'number' },
            { key: 'weightRoundingKg', label: 'Round weight up to', unit: 'kg' },
            { key: 'lowPriceThreshold', label: 'Low-price threshold', hint: 'Items at or below this use the low-price outbound fee', unit: 'money' }
        ]
    },
    {
        title: 'Removals',
        fields: [
            { key: 'removalMinPerRequest', label: 'Minimum per request', unit: 'money' },
            { key: 'removalHandlingPerUnit', label: 'Handling per unit', unit: 'money' },
            { key: 'removalDeliveryPerKg', label: 'Delivery per kg', unit: 'money' },
            { key: 'removalCollectionPerCbf', label: 'Collection per cubic foot', unit: 'money' }
        ]
    },
    {
        title: 'Price safeguards',
        fields: [
            { key: 'maxPriceChangePercent', label: 'Confirm price changes over', hint: 'Sellers must confirm bigger jumps (typo guard)', unit: 'percent' },
            { key: 'priceEngineStep', label: 'Price engine step', hint: 'How much the engine undercuts the buy-box price', unit: 'money' }
        ]
    }
];

/** Editable global fee settings. Mutates the given object and emits `changed`. */
@Component({
    selector: 'app-fee-settings-form',
    standalone: true,
    imports: [FormsModule, InputNumberModule, InputTextModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-6">
            <div class="form-grid">
                <div class="flex flex-col gap-1">
                    <label for="currency" class="text-sm font-medium">Currency</label>
                    <input id="currency" pInputText [(ngModel)]="settings().currencyCode" (ngModelChange)="changed.emit()" maxlength="3" class="w-32 uppercase" />
                </div>
            </div>
            @for (group of groups; track group.title) {
                <section>
                    <h3 class="section-title text-base">{{ group.title }}</h3>
                    <div class="form-grid">
                        @for (field of group.fields; track field.key) {
                            <div class="flex flex-col gap-1">
                                <label [for]="field.key" class="text-sm font-medium">{{ field.label }}</label>
                                <p-inputnumber
                                    [inputId]="field.key"
                                    [(ngModel)]="settings()[field.key]"
                                    (ngModelChange)="changed.emit()"
                                    [min]="0"
                                    [minFractionDigits]="field.unit === 'days' ? 0 : 0"
                                    [maxFractionDigits]="field.unit === 'days' ? 0 : 3"
                                    [prefix]="field.unit === 'money' ? settings().currencyCode + ' ' : ''"
                                    [suffix]="suffix(field)"
                                    fluid
                                />
                                @if (field.hint) {
                                    <small class="text-muted-color">{{ field.hint }}</small>
                                }
                            </div>
                        }
                    </div>
                </section>
            }
        </div>
    `
})
export class FeeSettingsFormComponent {
    readonly settings = input.required<FeeSettings>();
    readonly changed = output<void>();
    readonly groups = GROUPS;

    suffix(field: Field): string {
        return { days: ' days', kg: ' kg', percent: '%', money: '', number: '' }[field.unit];
    }
}
