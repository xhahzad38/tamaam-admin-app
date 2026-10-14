import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage, includesQuery, localDateTimeValue, toApiDateTime } from '../catalog.util';
import { CategoryCommission, CategoryOption, flattenCategories, fulfillmentLabel } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-commission',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, BreadCrumbComponent, SearchControlComponent, InputControlComponent, SelectControlComponent, ButtonModule, TableModule],
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
    readonly rateQuery = signal('');
    readonly visibleRates = computed(() => this.rates().filter((rate) => includesQuery(this.rateQuery(), rate.name, this.fulfillmentLabel(rate.fulfillmentType), rate.commissionPercent, rate.closingFee)));
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);

    ngOnInit(): void {
        const preset = this.route.snapshot.queryParamMap.get('category');
        this.categories.tree().subscribe({
            next: (tree) => {
                this.categoryOptions.set(flattenCategories(tree));
                if (preset) {
                    this.categoryId.setValue(preset);
                }
            },
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load categories.'))
        });
        this.categoryId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
            if (id) {
                this.load(id);
            }
        });
    }

    editRate(rate: CategoryCommission): void {
        this.fields.patchValue({
            name: rate.name,
            fulfillmentType: rate.fulfillmentType === null || rate.fulfillmentType === undefined ? '' : String(rate.fulfillmentType),
            commissionPercent: rate.commissionPercent,
            closingFee: rate.closingFee,
            effectiveFrom: localDateTimeValue(),
            effectiveTo: ''
        });
        this.notice.set(null);
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
        this.notice.set(null);
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
                    this.notice.set('Commission rate saved.');
                    this.load(id);
                    this.saving.set(false);
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the commission rate.'));
                }
            });
    }

    private load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.categories.get(id).subscribe({
            next: (detail) => {
                this.rates.set(detail.commissionRates ?? []);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load commission rates.'));
            }
        });
    }
}
