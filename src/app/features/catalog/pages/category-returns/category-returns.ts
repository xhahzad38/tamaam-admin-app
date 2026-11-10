import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared/ui/select-control/select-control.component';

import { CategoryOption, CategoryReturnPolicy, CategoryReturnPolicyRow, flattenCategories } from '@/app/features/catalog/data-access/category.models';
import { CategoryService } from '@/app/features/catalog/data-access/category.service';

import { errorMessage } from '@/app/core/http/api-error';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, EmptyStateComponent } from '@/app/shared/ui/state/state.components';
@Component({
    selector: 'app-category-return-policy',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, SearchControlComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule, DialogModule, PaginatorModule, TableModule, PageHeaderComponent, ErrorStateComponent, EmptyStateComponent],
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
    readonly categoryFilter = new FormControl<string | null>(null);
    readonly categoryId = new FormControl<string | null>(null, Validators.required);
    readonly returns = signal<CategoryReturnPolicy>({ returnsAllowed: true, returnWindowDays: 14, notes: '' });
    readonly fields = new FormGroup({
        returnWindowDays: new FormControl(14, { nonNullable: true }),
        notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
    });
    readonly items = signal<CategoryReturnPolicyRow[]>([]);
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
        this.categoryId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
            if (this.dialogOpen() && id) {
                this.loadPolicy(id);
            }
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
        this.dialogOpen.set(true);
    }

    openEdit(row: CategoryReturnPolicyRow): void {
        this.error.set(null);
        this.apply(row);
        this.categoryId.setValue(row.categoryId, { emitEvent: false });
        this.dialogOpen.set(true);
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
        this.categories
            .saveReturnPolicy(id, {
                returnsAllowed: current.returnsAllowed,
                returnWindowDays: current.returnsAllowed ? Number(fields.returnWindowDays) || 0 : 0,
                notes: fields.notes.trim() || null
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.dialogOpen.set(false);
                    this.load();
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(errorMessage(error, 'Could not save the return policy.'));
                }
            });
    }

    private load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.categories.returnPolicies(this.query(), this.categoryFilter.value, pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.items.set([]);
                this.totalRecords.set(0);
                this.error.set(errorMessage(error, 'Could not load return policies.'));
            }
        });
    }

    private loadPolicy(id: string): void {
        this.categories.get(id).subscribe({
            next: (detail) => this.apply(detail.returnPolicy),
            error: (error) => this.error.set(errorMessage(error, 'Could not load the return policy.'))
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
