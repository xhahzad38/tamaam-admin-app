import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { errorMessage } from '@/app/core/http/api-error';
import {
    CATALOG_STATUS_LABEL,
    CatalogChangeDetail,
    STRUCTURE_LABEL,
    catalogContentBullets,
    catalogContentDescription,
    catalogContentName
} from '@/app/features/catalog/data-access/catalog-review.models';
import { CatalogReviewService } from '@/app/features/catalog/data-access/catalog-review.service';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, LoadingStateComponent } from '@/app/shared/ui/state/state.components';
import { toMediaUrl } from '@/app/shared/utils/media.util';
import { DiffPart, RowChange, countChanges, diffBundle, diffList, diffMedia, diffSpecs, diffVariants, diffWords } from './change-diff';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const STATUS_SEVERITY: Record<string, Severity> = { PENDING: 'info', APPROVED: 'success', REJECTED: 'danger' };

const REASONS = [
    'The new title does not follow the naming format: Brand + product + key attribute.',
    'Photos must show the product on a plain white background without text or watermarks.',
    'The change describes a different product. Create a new listing instead.',
    'Specifications contradict the description or the product photos.',
    'Remove contact details, prices or promotional text from the content.',
    'Barcodes (GTIN) must belong to the brand of this product.'
];

interface Section {
    id: string;
    label: string;
    icon: string;
    changes: number;
}

/**
 * Review of a seller's edit to a live product: every section is compared with what shoppers see now,
 * changed sections first, with the decision panel always in view.
 */
@Component({
    selector: 'app-change-request-detail',
    standalone: true,
    imports: [DatePipe, NgTemplateOutlet, ReactiveFormsModule, RouterLink, ButtonModule, TagModule, TextareaModule, PageHeaderComponent, ErrorStateComponent, LoadingStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './change-request-detail.html',
    styleUrl: './change-request-detail.scss'
})
export class ChangeRequestDetailPage implements OnInit {
    private readonly reviews = inject(CatalogReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly confirm = inject(ConfirmService);
    private readonly messages = inject(MessageService);

    readonly crumbs = signal<MenuItem[]>([{ label: 'Product change requests', routerLink: '/catalog/change-requests' }, { label: 'Request' }]);
    readonly request = signal<CatalogChangeDetail | null>(null);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal<'approve' | 'reject' | null>(null);
    readonly error = signal<string | null>(null);
    readonly onlyChanges = signal(true);
    readonly note = new FormControl('', { nonNullable: true });
    readonly reasons = REASONS;

    readonly mediaUrl = toMediaUrl;
    readonly structureLabel = (value: number) => STRUCTURE_LABEL[value] ?? 'Simple';
    readonly productStatus = (value: number) => CATALOG_STATUS_LABEL[value] ?? 'Draft';

    readonly isPending = computed(() => this.request()?.statusCode?.toUpperCase() === 'PENDING');
    readonly statusSeverity = computed<Severity>(() => STATUS_SEVERITY[this.request()?.statusCode?.toUpperCase() ?? ''] ?? 'secondary');
    readonly title = computed(() => {
        const request = this.request();
        return request ? catalogContentName(request.current) || catalogContentName(request.proposed) || 'Product change request' : 'Product change request';
    });

    // ---- comparisons -------------------------------------------------------------------------

    readonly titleDiff = computed<DiffPart[] | null>(() => {
        const r = this.request();
        return r ? diffWords(catalogContentName(r.current), catalogContentName(r.proposed)) : null;
    });
    readonly titleChanged = computed(() => {
        const r = this.request();
        return !!r && catalogContentName(r.current) !== catalogContentName(r.proposed);
    });
    readonly descriptionDiff = computed<DiffPart[] | null>(() => {
        const r = this.request();
        return r ? diffWords(catalogContentDescription(r.current), catalogContentDescription(r.proposed)) : null;
    });
    readonly descriptionChanged = computed(() => {
        const r = this.request();
        return !!r && catalogContentDescription(r.current) !== catalogContentDescription(r.proposed);
    });
    readonly bullets = computed(() => {
        const r = this.request();
        return r ? diffList(catalogContentBullets(r.current), catalogContentBullets(r.proposed)) : [];
    });
    readonly photos = computed(() => {
        const r = this.request();
        return r ? diffMedia(r.current.media, r.proposed.media) : [];
    });
    readonly variants = computed(() => {
        const r = this.request();
        return r ? diffVariants(r.current.variants, r.proposed.variants) : [];
    });
    readonly specs = computed(() => {
        const r = this.request();
        return r ? diffSpecs(r.current, r.proposed) : [];
    });
    readonly bundle = computed(() => {
        const r = this.request();
        return r ? diffBundle(r.current.bundleItems ?? [], r.proposed.bundleItems) : [];
    });

    readonly sections = computed<Section[]>(() => [
        { id: 'title', label: 'Title', icon: 'pi pi-pencil', changes: this.titleChanged() ? 1 : 0 },
        { id: 'photos', label: 'Photos', icon: 'pi pi-images', changes: countChanges(this.photos()) },
        { id: 'description', label: 'Description', icon: 'pi pi-align-left', changes: this.descriptionChanged() ? 1 : 0 },
        { id: 'features', label: 'Key features', icon: 'pi pi-list', changes: countChanges(this.bullets()) },
        { id: 'specs', label: 'Specifications', icon: 'pi pi-sliders-h', changes: countChanges(this.specs()) },
        { id: 'variants', label: 'Variants', icon: 'pi pi-clone', changes: countChanges(this.variants()) },
        ...(this.bundle().length ? [{ id: 'bundle', label: 'Bundle contents', icon: 'pi pi-box', changes: countChanges(this.bundle()) }] : [])
    ]);
    readonly changedSections = computed(() => this.sections().filter((section) => section.changes > 0));

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            return;
        }
        this.loading.set(true);
        this.loadError.set(null);
        this.reviews.change(id).subscribe({
            next: (request) => {
                this.apply(request);
                this.loading.set(false);
                // Nothing to compare section by section when the seller changed nothing visible: show everything.
                if (!this.changedSections().length) {
                    this.onlyChanges.set(false);
                }
            },
            error: (error) => {
                this.loading.set(false);
                this.loadError.set(errorMessage(error, 'Could not load the change request.'));
            }
        });
    }

    changes(id: string): number {
        return this.sections().find((section) => section.id === id)?.changes ?? 0;
    }

    /** Hidden when "Show only changes" is on and the section did not change. */
    visible(id: string): boolean {
        return !this.onlyChanges() || this.changes(id) > 0;
    }

    scrollTo(id: string): void {
        if (!this.visible(id)) {
            this.onlyChanges.set(false);
        }
        setTimeout(() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    changeLabel(change: RowChange): string {
        return { added: 'New', removed: 'Removed', changed: 'Changed', same: '' }[change];
    }

    addReason(reason: string): void {
        const current = this.note.value.trim();
        this.note.setValue(current ? `${current}\n${reason}` : reason);
    }

    async approve(): Promise<void> {
        const changed = this.changedSections().map((section) => section.label.toLowerCase());
        const ok = await this.confirm.ask({
            title: 'Approve and apply',
            message: changed.length
                ? `The new ${changed.join(', ')} go live on the product page straight away.`
                : 'The seller’s update goes live on the product page straight away.',
            acceptLabel: 'Approve and apply'
        });
        if (ok) {
            this.decide(true);
        }
    }

    reject(): void {
        if (!this.note.value.trim()) {
            this.error.set('Write a note to the seller explaining what to fix before you reject.');
            return;
        }
        this.decide(false);
    }

    private decide(approve: boolean): void {
        const request = this.request();
        if (!request) {
            return;
        }
        this.saving.set(approve ? 'approve' : 'reject');
        this.error.set(null);
        this.reviews.reviewChange(request.id, approve, this.note.value.trim()).subscribe({
            next: (fresh) => {
                this.saving.set(null);
                this.apply(fresh);
                this.messages.add({
                    severity: approve ? 'success' : 'warn',
                    summary: approve ? 'Change applied' : 'Change rejected',
                    detail: approve ? 'The product page now shows the seller’s update.' : 'The seller was sent your note.',
                    life: 4000
                });
            },
            error: (error) => {
                this.saving.set(null);
                this.error.set(errorMessage(error, 'Could not review the change.'));
            }
        });
    }

    private apply(request: CatalogChangeDetail): void {
        this.request.set(request);
        this.crumbs.set([
            { label: 'Product change requests', routerLink: '/catalog/change-requests' },
            { label: catalogContentName(request.current) || 'Request' }
        ]);
    }
}
