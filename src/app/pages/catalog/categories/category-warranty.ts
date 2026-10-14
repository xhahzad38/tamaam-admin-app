import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage } from '../catalog.util';
import { CategoryOption, CategoryWarrantyRule, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-warranty',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, BreadCrumbComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule],
    templateUrl: './category-warranty.html'
})
export class CategoryWarrantyPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Warranty rule' }
    ];
    readonly categoryOptions = signal<CategoryOption[]>([]);
    readonly categoryId = new FormControl<string | null>(null, Validators.required);
    readonly warranty = signal<CategoryWarrantyRule>({ warrantyRequired: false, minDurationMonths: 0, serialOrImeiRequired: false });
    readonly fields = new FormGroup({
        minDurationMonths: new FormControl(0, { nonNullable: true })
    });
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

    patch(partial: Partial<CategoryWarrantyRule>): void {
        this.warranty.update((current) => ({ ...current, ...partial }));
    }

    save(): void {
        const id = this.categoryId.value;
        if (!id) {
            this.categoryId.markAsTouched();
            this.error.set('Choose a category.');
            return;
        }
        const current = this.warranty();
        this.saving.set(true);
        this.error.set(null);
        this.notice.set(null);
        this.categories
            .saveWarranty(id, {
                warrantyRequired: current.warrantyRequired,
                minDurationMonths: Number(this.fields.controls.minDurationMonths.value) || 0,
                serialOrImeiRequired: current.serialOrImeiRequired
            })
            .subscribe({
                next: (detail) => {
                    this.apply(detail.warrantyRule);
                    this.notice.set('Warranty rule saved.');
                    this.saving.set(false);
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the warranty rule.'));
                }
            });
    }

    private load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.notice.set(null);
        this.categories.get(id).subscribe({
            next: (detail) => {
                this.apply(detail.warrantyRule);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load the warranty rule.'));
            }
        });
    }

    private apply(rule: CategoryWarrantyRule | null): void {
        const next = {
            warrantyRequired: rule?.warrantyRequired ?? false,
            minDurationMonths: rule?.minDurationMonths ?? 0,
            serialOrImeiRequired: rule?.serialOrImeiRequired ?? false
        };
        this.warranty.set(next);
        this.fields.patchValue({ minDurationMonths: next.minDurationMonths }, { emitEvent: false });
    }
}
