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
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage } from '../catalog.util';
import { CategoryOption, CategoryWarrantyRow, CategoryWarrantyRule, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-warranty',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, BreadCrumbComponent, SearchControlComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule, DialogModule, PaginatorModule, TableModule],
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
    readonly categoryFilter = new FormControl<string | null>(null);
    readonly categoryId = new FormControl<string | null>(null, Validators.required);
    readonly warranty = signal<CategoryWarrantyRule>({ warrantyRequired: false, minDurationMonths: 0, serialOrImeiRequired: false });
    readonly fields = new FormGroup({
        minDurationMonths: new FormControl(0, { nonNullable: true })
    });
    readonly items = signal<CategoryWarrantyRow[]>([]);
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
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load categories.'))
        });
        this.categoryFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.first.set(0);
            this.load();
        });
        this.categoryId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
            if (this.dialogOpen() && id) {
                this.loadRule(id);
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

    openEdit(row: CategoryWarrantyRow): void {
        this.error.set(null);
        this.apply(row);
        this.categoryId.setValue(row.categoryId, { emitEvent: false });
        this.dialogOpen.set(true);
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
        this.categories
            .saveWarranty(id, {
                warrantyRequired: current.warrantyRequired,
                minDurationMonths: Number(this.fields.controls.minDurationMonths.value) || 0,
                serialOrImeiRequired: current.serialOrImeiRequired
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.dialogOpen.set(false);
                    this.load();
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the warranty rule.'));
                }
            });
    }

    private load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.categories.warranties(this.query(), this.categoryFilter.value, pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.items.set([]);
                this.totalRecords.set(0);
                this.error.set(catalogErrorMessage(error, 'Could not load warranty rules.'));
            }
        });
    }

    private loadRule(id: string): void {
        this.categories.get(id).subscribe({
            next: (detail) => this.apply(detail.warrantyRule),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load the warranty rule.'))
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
