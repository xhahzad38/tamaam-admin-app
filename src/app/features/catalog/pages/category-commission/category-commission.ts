import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared/ui/select-control/select-control.component';

import { CategoryCommission, CategoryOption, flattenCategories, fulfillmentLabel } from '@/app/features/catalog/data-access/category.models';
import { CategoryService } from '@/app/features/catalog/data-access/category.service';

import { errorMessage } from '@/app/core/http/api-error';
import { localDateTimeValue, toApiDateTime } from '@/app/shared/utils/date.util';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, EmptyStateComponent } from '@/app/shared/ui/state/state.components';
@Component({
    selector: 'app-category-commission',
    standalone: true,
    imports: [
        DatePipe,
        ReactiveFormsModule,
        SearchControlComponent,
        InputControlComponent,
        SelectControlComponent,
        ButtonModule,
        DialogModule,
        PaginatorModule,
        TableModule, PageHeaderComponent, ErrorStateComponent, EmptyStateComponent],
    templateUrl: './category-commission.html'
})
export class CategoryCommissionPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly fulfillmentOptions = [
        { label: 'Both', value: '' },
        { label: 'FBM', value: '0' },
        { label: 'FBT', value: '1' }
    ];
    readonly crumbs: MenuItem[] = [
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Commission' }
    ];
    readonly fulfillmentLabel = fulfillmentLabel;
    readonly categoryOptions = signal<CategoryOption[]>([]);
    readonly categoryFilter = new FormControl<string | null>(null);
    readonly categoryId = new FormControl<string | null>(null, Validators.required);
    readonly fields = new FormGroup({
        name: new FormControl('Default', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
        fulfillmentType: new FormControl('', { nonNullable: true }),
        commissionPercent: new FormControl(0, { nonNullable: true }),
        closingFee: new FormControl(0, { nonNullable: true }),
        effectiveFrom: new FormControl(localDateTimeValue(), { nonNullable: true }),
        effectiveTo: new FormControl('', { nonNullable: true })
    });
    readonly rates = signal<CategoryCommission[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogOpen = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        const preset = this.route.snapshot.queryParamMap.get('category');
        if (preset) {
            this.categoryFilter.setValue(preset, { emitEvent: false });
        }
        this.load();
        this.categories.tree().subscribe({
            next: (tree) => this.categoryOptions.set(flattenCategories(tree)),
            error: (error) => this.error.set(errorMessage(error, 'Could not load categories.'))
        });
        this.categoryFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.first.set(0);
            this.load();
        });
    }

    onSearch(value: string): void {
        this.query.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.load();
    }

    openCreate(): void {
        this.error.set(null);
        this.apply(null);
        this.categoryId.setValue(this.categoryFilter.value, { emitEvent: false });
        this.categoryId.markAsUntouched();
        this.fields.controls.name.markAsUntouched();
        this.dialogOpen.set(true);
    }

    openEdit(rate: CategoryCommission): void {
        this.error.set(null);
        this.apply(rate);
        this.dialogOpen.set(true);
    }

    save(): void {
        const id = this.categoryId.value;
        const current = this.fields.getRawValue();
        const effectiveFrom = toApiDateTime(current.effectiveFrom);
        if (!id || this.fields.controls.name.invalid || !effectiveFrom) {
            this.categoryId.markAsTouched();
            this.fields.controls.name.markAsTouched();
            this.error.set(id ? 'Enter a commission name and a start date.' : 'Choose a category.');
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.categories
            .saveCommission({
                name: current.name.trim(),
                categoryId: id,
                fulfillmentType: current.fulfillmentType === '' ? null : Number(current.fulfillmentType),
                commissionPercent: Number(current.commissionPercent) || 0,
                closingFee: Number(current.closingFee) || 0,
                effectiveFrom,
                effectiveTo: toApiDateTime(current.effectiveTo)
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.dialogOpen.set(false);
                    this.load();
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(errorMessage(error, 'Could not save the commission rate.'));
                }
            });
    }

    private load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.categories.commissions(this.query(), this.categoryFilter.value, pageNo, this.rows()).subscribe({
            next: (page) => {
                this.rates.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.rates.set([]);
                this.totalRecords.set(0);
                this.error.set(errorMessage(error, 'Could not load commission rates.'));
            }
        });
    }

    private apply(rate: CategoryCommission | null): void {
        this.categoryId.setValue(rate?.categoryId ?? null, { emitEvent: false });
        this.fields.reset(
            {
                name: rate?.name || 'Default',
                fulfillmentType: rate == null || rate.fulfillmentType === null || rate.fulfillmentType === undefined ? '' : String(rate.fulfillmentType),
                commissionPercent: rate?.commissionPercent ?? 0,
                closingFee: rate?.closingFee ?? 0,
                effectiveFrom: rate?.effectiveFrom ? this.toLocalInput(rate.effectiveFrom) : localDateTimeValue(),
                effectiveTo: this.toLocalInput(rate?.effectiveTo)
            },
            { emitEvent: false }
        );
    }

    private toLocalInput(value: string | null | undefined): string {
        if (!value) {
            return '';
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return '';
        }
        return localDateTimeValue(parsed);
    }
}
