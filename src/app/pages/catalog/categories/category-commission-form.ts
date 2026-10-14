import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage, localDateTimeValue, toApiDateTime } from '../catalog.util';
import { CategoryOption, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-commission-form',
    standalone: true,
    imports: [ReactiveFormsModule, BreadCrumbComponent, InputControlComponent, SelectControlComponent, ButtonModule],
    templateUrl: './category-commission-form.html'
})
export class CategoryCommissionFormPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly fulfillmentOptions = [
        { label: 'Both', value: '' },
        { label: 'FBM', value: '0' },
        { label: 'FBT', value: '1' }
    ];
    readonly crumbs: MenuItem[] = [
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Commission', routerLink: '/catalog/categories/commission' },
        { label: 'Add commission' }
    ];
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
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        const category = params.get('category');
        if (params.has('name')) {
            this.fields.patchValue({
                name: params.get('name') || 'Default',
                fulfillmentType: params.get('fulfillment') ?? '',
                commissionPercent: Number(params.get('percent')) || 0,
                closingFee: Number(params.get('fee')) || 0
            });
        }
        this.categories.tree().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (tree) => {
                this.categoryOptions.set(flattenCategories(tree));
                if (category) {
                    this.categoryId.setValue(category);
                }
            },
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load categories.'))
        });
    }

    close(): void {
        void this.router.navigate(['/catalog/categories/commission'], {
            queryParams: { category: this.categoryId.value || null }
        });
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
                    this.saving.set(false);
                    this.notice.set('Commission rate saved.');
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the commission rate.'));
                }
            });
    }
}
