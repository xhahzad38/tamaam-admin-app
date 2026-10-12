import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, includesQuery, localDateTimeValue, toApiDateTime } from '../catalog.util';
import { CatalogAttribute } from '../attributes/attribute.models';
import { AttributeService } from '../attributes/attribute.service';
import { CategoryAttributeLink, CategoryDetail, CategoryReturnPolicy, CategoryWarrantyRule, fulfillmentLabel } from './category.models';
import { CategoryService } from './category.service';

interface CommissionForm {
    name: string;
    fulfillmentType: string;
    commissionPercent: number;
    closingFee: number;
    effectiveFrom: string;
    effectiveTo: string;
}

function emptyCommission(): CommissionForm {
    return {
        name: 'Default',
        fulfillmentType: '',
        commissionPercent: 0,
        closingFee: 0,
        effectiveFrom: localDateTimeValue(),
        effectiveTo: ''
    };
}

@Component({
    selector: 'app-category-detail',
    standalone: true,
    imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink, BreadCrumbComponent, SearchControlComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule, TableModule],
    templateUrl: './category-detail.html'
})
export class CategoryDetailPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly attributes = inject(AttributeService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly fulfillmentOptions = [
        { label: 'Both', value: '' },
        { label: 'FBM', value: '0' },
        { label: 'FBT', value: '1' }
    ];
    readonly crumbs = signal<MenuItem[]>([
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Category' }
    ]);
    readonly fulfillmentLabel = fulfillmentLabel;

    readonly detail = signal<CategoryDetail | null>(null);
    readonly links = signal<CategoryAttributeLink[]>([]);
    readonly linkQuery = signal('');
    readonly visibleLinks = computed(() => this.links().filter((row) => includesQuery(this.linkQuery(), row.attributeName)));
    readonly rateQuery = signal('');
    readonly visibleRates = computed(() =>
        (this.detail()?.commissionRates ?? []).filter((rate) => includesQuery(this.rateQuery(), rate.name, this.fulfillmentLabel(rate.fulfillmentType), rate.commissionPercent, rate.closingFee))
    );
    readonly returnsForm = new FormGroup({
        returnWindowDays: new FormControl(14, { nonNullable: true }),
        notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
    });
    readonly warrantyForm = new FormGroup({
        minDurationMonths: new FormControl(0, { nonNullable: true })
    });
    readonly commissionForm = new FormGroup({
        name: new FormControl('Default', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
        fulfillmentType: new FormControl('', { nonNullable: true }),
        commissionPercent: new FormControl(0, { nonNullable: true }),
        closingFee: new FormControl(0, { nonNullable: true }),
        effectiveFrom: new FormControl(localDateTimeValue(), { nonNullable: true }),
        effectiveTo: new FormControl('', { nonNullable: true })
    });
    private readonly orderControls = new Map<string, FormControl<number>>();
    readonly returns = signal<CategoryReturnPolicy>({ returnsAllowed: true, returnWindowDays: 14, notes: '' });
    readonly warranty = signal<CategoryWarrantyRule>({ warrantyRequired: false, minDurationMonths: 0, serialOrImeiRequired: false });
    readonly commission = signal<CommissionForm>(emptyCommission());
    readonly search = signal('');
    readonly searchResults = signal<CatalogAttribute[]>([]);
    readonly loading = signal(false);
    readonly searching = signal(false);
    readonly saving = signal<string | null>(null);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.load(id);
            }
        });
    }

    load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.categories.get(id).subscribe({
            next: (detail) => {
                this.apply(detail);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load this category.'));
            }
        });
    }

    onAttributeSearch(value: string): void {
        this.search.set(value);
        this.searchAttributes();
    }

    searchAttributes(): void {
        this.searching.set(true);
        this.attributes.list(this.search(), 1, 20).subscribe({
            next: (page) => {
                this.searchResults.set(page.items ?? []);
                this.searching.set(false);
            },
            error: (error) => {
                this.searching.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not search attributes.'));
            }
        });
    }

    addAttribute(attribute: CatalogAttribute): void {
        this.links.update((rows) => {
            if (rows.some((row) => row.attributeId === attribute.id)) {
                return rows;
            }
            const displayOrder = rows.reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1;
            return [
                ...rows,
                {
                    attributeId: attribute.id,
                    attributeName: attribute.displayName || attribute.name,
                    isRequired: true,
                    displayOrder
                }
            ];
        });
    }

    patchLink(attributeId: string, partial: Partial<CategoryAttributeLink>): void {
        this.links.update((rows) => rows.map((row) => (row.attributeId === attributeId ? { ...row, ...partial } : row)));
    }

    removeLink(attributeId: string): void {
        this.links.update((rows) => rows.filter((row) => row.attributeId !== attributeId));
    }

    orderControl(row: CategoryAttributeLink): FormControl<number> {
        let control = this.orderControls.get(row.attributeId);
        if (!control) {
            control = new FormControl(row.displayOrder, { nonNullable: true });
            control.valueChanges.subscribe((value) => this.patchLink(row.attributeId, { displayOrder: Number(value) || 0 }));
            this.orderControls.set(row.attributeId, control);
        }
        return control;
    }

    saveAttributes(): void {
        const id = this.detail()?.id;
        if (!id) {
            return;
        }
        this.persist('attributes', this.categories.saveAttributes(id, this.links()), 'Category attributes saved.');
    }

    saveReturns(): void {
        const id = this.detail()?.id;
        if (!id) {
            return;
        }
        const current = this.returns();
        const fields = this.returnsForm.getRawValue();
        this.persist(
            'returns',
            this.categories.saveReturnPolicy(id, {
                returnsAllowed: current.returnsAllowed,
                returnWindowDays: current.returnsAllowed ? Number(fields.returnWindowDays) || 0 : 0,
                notes: fields.notes.trim() || null
            }),
            'Return policy saved.'
        );
    }

    saveWarranty(): void {
        const id = this.detail()?.id;
        if (!id) {
            return;
        }
        const current = this.warranty();
        this.persist(
            'warranty',
            this.categories.saveWarranty(id, {
                warrantyRequired: current.warrantyRequired,
                minDurationMonths: Number(this.warrantyForm.controls.minDurationMonths.value) || 0,
                serialOrImeiRequired: current.serialOrImeiRequired
            }),
            'Warranty rule saved.'
        );
    }

    saveCommission(): void {
        const id = this.detail()?.id;
        const current = this.commissionForm.getRawValue();
        const effectiveFrom = toApiDateTime(current.effectiveFrom);
        if (!id || !current.name.trim() || !effectiveFrom) {
            this.error.set('Enter a commission name and a start date.');
            return;
        }
        const effectiveTo = toApiDateTime(current.effectiveTo);
        this.saving.set('commission');
        this.error.set(null);
        this.notice.set(null);
        this.categories
            .saveCommission({
                name: current.name.trim(),
                categoryId: id,
                fulfillmentType: current.fulfillmentType === '' ? null : Number(current.fulfillmentType),
                commissionPercent: Number(current.commissionPercent) || 0,
                closingFee: Number(current.closingFee) || 0,
                effectiveFrom,
                effectiveTo
            })
            .subscribe({
                next: () => {
                    this.commission.set(emptyCommission());
                    this.notice.set('Commission rate saved.');
                    this.load(id);
                    this.saving.set(null);
                },
                error: (error) => {
                    this.saving.set(null);
                    this.error.set(catalogErrorMessage(error, 'Could not save the commission rate.'));
                }
            });
    }

    patchReturns(partial: Partial<CategoryReturnPolicy>): void {
        this.returns.update((current) => ({ ...current, ...partial }));
    }

    patchWarranty(partial: Partial<CategoryWarrantyRule>): void {
        this.warranty.update((current) => ({ ...current, ...partial }));
    }

    patchCommission(partial: Partial<CommissionForm>): void {
        this.commission.update((current) => ({ ...current, ...partial }));
    }

    private persist(key: string, request: Observable<CategoryDetail>, notice: string): void {
        this.saving.set(key);
        this.error.set(null);
        this.notice.set(null);
        request.subscribe({
            next: (detail) => {
                this.apply(detail);
                this.notice.set(notice);
                this.saving.set(null);
            },
            error: (error) => {
                this.saving.set(null);
                this.error.set(catalogErrorMessage(error, 'Could not save.'));
            }
        });
    }

    private apply(detail: CategoryDetail): void {
        this.detail.set(detail);
        this.crumbs.set([
            { label: 'Categories', routerLink: '/catalog/categories' },
            { label: detail.name }
        ]);
        this.orderControls.clear();
        this.links.set([...(detail.attributes ?? [])].sort((a, b) => a.displayOrder - b.displayOrder));
        this.returnsForm.patchValue(
            {
                returnWindowDays: detail.returnPolicy?.returnWindowDays ?? 14,
                notes: detail.returnPolicy?.notes ?? ''
            },
            { emitEvent: false }
        );
        this.warrantyForm.patchValue({ minDurationMonths: detail.warrantyRule?.minDurationMonths ?? 0 }, { emitEvent: false });
        this.returns.set({
            returnsAllowed: detail.returnPolicy?.returnsAllowed ?? true,
            returnWindowDays: detail.returnPolicy?.returnWindowDays ?? 14,
            notes: detail.returnPolicy?.notes ?? ''
        });
        this.warranty.set({
            warrantyRequired: detail.warrantyRule?.warrantyRequired ?? false,
            minDurationMonths: detail.warrantyRule?.minDurationMonths ?? 0,
            serialOrImeiRequired: detail.warrantyRule?.serialOrImeiRequired ?? false
        });
    }
}
