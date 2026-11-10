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
    CatalogProductDetail,
    STRUCTURE_LABEL,
    attributeTextValue,
    catalogContentBullets,
    catalogContentDescription,
    catalogContentName
} from '@/app/features/catalog/data-access/catalog-review.models';
import { CatalogReviewService } from '@/app/features/catalog/data-access/catalog-review.service';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, NoticeComponent } from '@/app/shared/ui/state/state.components';
import { toMediaUrl } from '@/app/shared/utils/media.util';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

interface Check {
    label: string;
    ok: boolean;
    /** Shown when the check fails; a failed "required" check should usually lead to rejection. */
    hint: string;
    required: boolean;
}

/** Common rejection reasons; clicking one adds it to the note. */
const REASONS = [
    'Main photo must show the product on a plain white background.',
    'Add at least 3 photos, including the product from different angles.',
    'The title must include brand, product type and key attribute (e.g. size or colour).',
    'The description is missing or does not describe the product.',
    'Add key features as bullet points.',
    'Barcode/GTIN is missing or invalid for one or more variants.',
    'The product is in the wrong category.',
    'Photos contain watermarks, logos, text or contact details.'
];

/** Admin product review console: inspect a pending listing, run quality checks, approve or reject. */
@Component({
    selector: 'app-product-review-detail',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, TagModule, TextareaModule, PageHeaderComponent, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, NoticeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './product-review-detail.html',
    styleUrl: './product-review-detail.scss'
})
export class ProductReviewDetailPage implements OnInit {
    private readonly reviews = inject(CatalogReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly confirm = inject(ConfirmService);
    private readonly messages = inject(MessageService);

    readonly product = signal<CatalogProductDetail | null>(null);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal<'approve' | 'reject' | null>(null);
    readonly error = signal<string | null>(null);
    readonly decided = signal<string | null>(null);
    readonly selectedMedia = signal(0);
    readonly note = new FormControl('', { nonNullable: true });
    readonly reasons = REASONS;

    readonly mediaUrl = toMediaUrl;
    readonly contentName = catalogContentName;
    readonly contentDescription = catalogContentDescription;
    readonly contentBullets = catalogContentBullets;
    readonly textValue = attributeTextValue;
    readonly structureLabel = (value: number) => STRUCTURE_LABEL[value] ?? 'Simple';

    readonly title = computed(() => {
        const p = this.product();
        return p ? catalogContentName(p) || 'Untitled product' : 'Product review';
    });
    readonly crumbs = computed<MenuItem[]>(() => [{ label: 'Product review', routerLink: '/catalog/product-reviews' }, { label: this.title() }]);
    readonly status = computed(() => {
        const s = this.product()?.status ?? 0;
        const severity: Severity = s === 1 ? 'warn' : s === 2 ? 'success' : s === 3 ? 'danger' : 'secondary';
        return { label: CATALOG_STATUS_LABEL[s] ?? 'Draft', severity };
    });
    readonly isPending = computed(() => this.product()?.status === 1);
    readonly photos = computed(() => (this.product()?.media ?? []).slice().sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)));
    readonly current = computed(() => this.photos()[this.selectedMedia()] ?? null);

    /** Listing-quality checks the reviewer would otherwise do by eye. */
    readonly checks = computed<Check[]>(() => {
        const p = this.product();
        if (!p) return [];
        const name = catalogContentName(p) ?? '';
        const imageCount = p.media.filter((m) => m.mediaType === 1).length;
        const variantsWithCode = p.variants.filter((v) => v.barcode || v.gtin).length;
        return [
            { label: 'Has a main photo', ok: p.media.some((m) => m.isPrimary), hint: 'No primary photo is set.', required: true },
            { label: 'At least 3 photos', ok: imageCount >= 3, hint: `Only ${imageCount} photo(s).`, required: false },
            { label: 'Clear title (15–200 chars)', ok: name.length >= 15 && name.length <= 200, hint: `Title is ${name.length} characters.`, required: true },
            { label: 'Has a description', ok: (catalogContentDescription(p) ?? '').trim().length >= 50, hint: 'Description is missing or very short.', required: true },
            { label: 'Has key features', ok: catalogContentBullets(p).length >= 2, hint: 'Fewer than 2 bullet points.', required: false },
            { label: 'Barcodes on all variants', ok: p.variants.length > 0 && variantsWithCode === p.variants.length, hint: `${variantsWithCode} of ${p.variants.length} variants have a barcode/GTIN.`, required: false },
            { label: 'Has attribute values', ok: p.attributeValues.length + p.attributeTexts.length > 0, hint: 'No category attributes filled in.', required: false }
        ];
    });
    readonly passed = computed(() => this.checks().filter((c) => c.ok).length);
    readonly blockers = computed(() => this.checks().filter((c) => !c.ok && c.required).length);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;
        this.loading.set(true);
        this.loadError.set(null);
        this.reviews.product(id).subscribe({
            next: (product) => {
                this.product.set(product);
                this.selectedMedia.set(0);
                this.loading.set(false);
            },
            error: (err) => {
                this.loadError.set(errorMessage(err, 'Could not load the product.'));
                this.loading.set(false);
            }
        });
    }

    addReason(reason: string): void {
        const current = this.note.value.trim();
        if (current.includes(reason)) return;
        this.note.setValue(current ? `${current}\n${reason}` : reason);
        this.note.markAsDirty();
    }

    async approve(): Promise<void> {
        const product = this.product();
        if (!product || this.saving()) return;
        const warning = this.blockers() ? ` ${this.blockers()} required check(s) failed.` : '';
        if (!(await this.confirm.ask({ title: 'Approve product', message: `Publish "${this.title()}" so buyers can see it?${warning}`, acceptLabel: 'Approve and publish' }))) return;
        this.saving.set('approve');
        this.error.set(null);
        this.reviews.approve(product.id).subscribe({
            next: (fresh) => this.finish(fresh, 'Approved — the product is live and the seller has been notified.'),
            error: (err) => this.fail(err, 'Could not approve the product.')
        });
    }

    reject(): void {
        const product = this.product();
        const note = this.note.value.trim();
        if (!product || this.saving()) return;
        if (!note) {
            this.error.set('Add a note so the seller knows what to fix.');
            return;
        }
        this.saving.set('reject');
        this.error.set(null);
        this.reviews.reject(product.id, note).subscribe({
            next: (fresh) => this.finish(fresh, 'Sent back to the seller with your note.'),
            error: (err) => this.fail(err, 'Could not reject the product.')
        });
    }

    private finish(fresh: CatalogProductDetail, message: string): void {
        this.product.set(fresh);
        this.saving.set(null);
        this.decided.set(message);
        this.note.reset();
        this.messages.add({ severity: 'success', summary: 'Review saved', detail: message, life: 3500 });
    }

    private fail(err: unknown, fallback: string): void {
        this.saving.set(null);
        this.error.set(errorMessage(err, fallback));
    }
}
