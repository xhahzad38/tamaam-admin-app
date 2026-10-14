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
import { CategoryOption, CategoryReturnPolicy, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-return-policy',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, BreadCrumbComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule],
    templateUrl: './category-returns.html'
})
export class CategoryReturnPolicyPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Return policy' }
    ];
    readonly categoryOptions = signal<CategoryOption[]>([]);
    readonly categoryId = new FormControl<string | null>(null, Validators.required);
    readonly returns = signal<CategoryReturnPolicy>({ returnsAllowed: true, returnWindowDays: 14, notes: '' });
    readonly fields = new FormGroup({
        returnWindowDays: new FormControl(14, { nonNullable: true }),
        notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
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

    patch(partial: Partial<CategoryReturnPolicy>): void {
        this.returns.update((current) => ({ ...current, ...partial }));
    }

    save(): void {
        const id = this.categoryId.value;
        if (!id) {
            this.categoryId.markAsTouched();
            this.error.set('Choose a category.');
            return;
        }
        const current = this.returns();
        const fields = this.fields.getRawValue();
        this.saving.set(true);
        this.error.set(null);
        this.notice.set(null);
        this.categories
            .saveReturnPolicy(id, {
                returnsAllowed: current.returnsAllowed,
                returnWindowDays: current.returnsAllowed ? Number(fields.returnWindowDays) || 0 : 0,
                notes: fields.notes.trim() || null
            })
            .subscribe({
                next: (detail) => {
                    this.apply(detail.returnPolicy);
                    this.notice.set('Return policy saved.');
                    this.saving.set(false);
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the return policy.'));
                }
            });
    }

    private load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.notice.set(null);
        this.categories.get(id).subscribe({
            next: (detail) => {
                this.apply(detail.returnPolicy);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load the return policy.'));
            }
        });
    }

    private apply(policy: CategoryReturnPolicy | null): void {
        const next = {
            returnsAllowed: policy?.returnsAllowed ?? true,
            returnWindowDays: policy?.returnWindowDays ?? 14,
            notes: policy?.notes ?? ''
        };
        this.returns.set(next);
        this.fields.patchValue({ returnWindowDays: next.returnWindowDays, notes: next.notes }, { emitEvent: false });
    }
}
