import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
import { catalogErrorMessage, includesQuery } from '../catalog.util';
import { CategoryOption, CategoryWarrantyRule, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

interface WarrantyRow extends CategoryWarrantyRule {
    categoryId: string;
    categoryName: string;
}

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
    private openedPreset = false;

    readonly crumbs: MenuItem[] = [
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Warranty rule' }
    ];
    readonly categoryOptions = signal<CategoryOption[]>([]);
    readonly categoryFilter = new FormControl<string | null>(null);
    readonly categoryFilterId = signal<string | null>(null);
    readonly categoryId = new FormControl<string | null>(null, Validators.required);
    readonly warranty = signal<CategoryWarrantyRule>({ warrantyRequired: false, minDurationMonths: 0, serialOrImeiRequired: false });
    readonly fields = new FormGroup({
        minDurationMonths: new FormControl(0, { nonNullable: true })
    });
    readonly all = signal<WarrantyRow[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly filtered = computed(() => {
        const categoryId = this.categoryFilterId();
        return this.all().filter((row) => {
            if (categoryId && row.categoryId !== categoryId) {
                return false;
            }
            return includesQuery(this.query(), row.categoryName, row.minDurationMonths, row.warrantyRequired ? 'Yes' : 'No', row.serialOrImeiRequired ? 'Yes' : 'No');
        });
    });
    readonly pageRows = computed(() => this.filtered().slice(this.first(), this.first() + this.rows()));
    readonly totalRecords = computed(() => this.filtered().length);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogOpen = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.load();
        this.categoryFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
            this.categoryFilterId.set(id);
            this.first.set(0);
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
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
    }

    openCreate(): void {
        this.error.set(null);
        this.apply(null);
        this.categoryId.setValue(null, { emitEvent: false });
        this.categoryId.markAsUntouched();
        this.dialogOpen.set(true);
    }

    openEdit(row: WarrantyRow): void {
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
        this.loading.set(true);
        this.error.set(null);
        this.categories.tree().subscribe({
            next: (tree) => {
                const options = flattenCategories(tree);
                this.categoryOptions.set(options);
                if (!options.length) {
                    this.all.set([]);
                    this.loading.set(false);
                    return;
                }
                forkJoin(
                    options.map((option) =>
                        this.categories.get(option.id).pipe(
                            map((detail): WarrantyRow | null =>
                                detail.warrantyRule
                                    ? {
                                          categoryId: detail.id,
                                          categoryName: detail.name,
                                          warrantyRequired: detail.warrantyRule.warrantyRequired,
                                          minDurationMonths: detail.warrantyRule.minDurationMonths,
                                          serialOrImeiRequired: detail.warrantyRule.serialOrImeiRequired
                                      }
                                    : null
                            ),
                            catchError(() => of(null))
                        )
                    )
                ).subscribe((rows) => {
                    const items = rows.filter((row): row is WarrantyRow => row !== null);
                    this.all.set(items);
                    this.loading.set(false);
                    const preset = this.route.snapshot.queryParamMap.get('category');
                    if (preset && !this.openedPreset) {
                        this.openedPreset = true;
                        const row = items.find((item) => item.categoryId === preset);
                        if (row) {
                            this.openEdit(row);
                        }
                    }
                });
            },
            error: (error) => {
                this.loading.set(false);
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
