import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem } from 'primeng/api';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { errorMessage } from '@/app/core/http/api-error';
import { SizeTierEditorComponent } from '@/app/features/pricing/components/size-tier-editor/size-tier-editor';
import { FeeSettingsFormComponent } from '@/app/features/pricing/components/fee-settings-form/fee-settings-form';
import { PricingAdminService } from '@/app/features/pricing/data-access/pricing-admin.service';
import { HasUnsavedChanges } from '@/app/shared/data/unsaved-changes.guard';
import { FULFILLMENT_TYPE_LABELS, FeeRateCard, FulfillmentType, SizeTier, tierDimensions } from '@/app/shared/models/rate-card.models';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, NoticeComponent } from '@/app/shared/ui/state/state.components';

/** Admin editor for the fulfillment fee rate card (global settings + size tiers per fulfillment model). */
@Component({
    selector: 'app-rate-card',
    standalone: true,
    imports: [
        AccordionModule,
        ButtonModule,
        TabsModule,
        TagModule,
        PageHeaderComponent,
        FeeSettingsFormComponent,
        SizeTierEditorComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        LoadingStateComponent,
        NoticeComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './rate-card.html'
})
export class RateCardPage implements OnInit, HasUnsavedChanges {
    private readonly pricing = inject(PricingAdminService);
    private readonly confirm = inject(ConfirmService);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [{ label: 'Pricing & offers' }, { label: 'Fee rate card' }];
    readonly types = [FulfillmentType.FBT, FulfillmentType.FBM].map((value) => ({ value, label: FULFILLMENT_TYPE_LABELS[value] }));
    readonly dimensions = tierDimensions;

    readonly card = signal<FeeRateCard | null>(null);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly dirty = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly activeType = signal<FulfillmentType>(FulfillmentType.FBT);
    /** Bumped on every edit so tier lists recompute (the card is mutated in place by the editors). */
    private readonly version = signal(0);

    readonly tiersFor = computed(() => {
        this.version();
        const tiers = this.card()?.tiers ?? [];
        return (type: FulfillmentType) => tiers.filter((t) => t.fulfillmentType === type).sort((a, b) => a.sortOrder - b.sortOrder);
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.pricing
            .rateCard()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (card) => {
                    this.card.set(card);
                    this.dirty.set(false);
                    this.loading.set(false);
                },
                error: (err) => {
                    this.error.set(errorMessage(err, 'Could not load the rate card.'));
                    this.loading.set(false);
                }
            });
    }

    markDirty(): void {
        this.dirty.set(true);
        this.notice.set(null);
        this.version.update((v) => v + 1);
    }

    addTier(type: FulfillmentType): void {
        const card = this.card();
        if (!card) return;
        const sortOrder = Math.max(0, ...card.tiers.filter((t) => t.fulfillmentType === type).map((t) => t.sortOrder)) + 1;
        card.tiers.push({
            id: null,
            fulfillmentType: type,
            code: '',
            name: 'New size tier',
            maxLongestCm: null,
            maxMedianCm: null,
            maxShortestCm: null,
            packagingKg: 0,
            maxShippingKg: null,
            useVolumetricWeight: true,
            sortOrder,
            slabs: []
        });
        this.markDirty();
    }

    async removeTier(tier: SizeTier): Promise<void> {
        const ok = await this.confirm.ask({ message: `Remove the size tier "${tier.name}" and its fees? This takes effect when you save.`, danger: true, acceptLabel: 'Remove' });
        const card = this.card();
        if (!ok || !card) return;
        card.tiers.splice(card.tiers.indexOf(tier), 1);
        this.markDirty();
    }

    async discard(): Promise<void> {
        if (await this.confirm.ask({ message: 'Discard your changes and reload the saved rate card?', danger: true, acceptLabel: 'Discard' })) {
            this.load();
        }
    }

    save(): void {
        const card = this.card();
        if (!card || this.saving()) return;
        this.saving.set(true);
        this.error.set(null);
        this.pricing.saveRateCard(card).subscribe({
            next: (saved) => {
                this.card.set(saved);
                this.dirty.set(false);
                this.saving.set(false);
                this.notice.set('Rate card saved. New fees apply to fee estimates and orders from now on.');
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(errorMessage(err, 'Could not save the rate card.'));
            }
        });
    }

    hasUnsavedChanges(): boolean {
        return this.dirty();
    }

    /** Browser-level warning for refresh / tab close with unsaved edits. */
    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent): void {
        if (this.dirty()) {
            event.preventDefault();
        }
    }
}
