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
import { CatalogAttribute } from '../attributes/attribute.models';
import { AttributeService } from '../attributes/attribute.service';
import { CategoryAttributeRow, CategoryOption, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-attributes',
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        BreadCrumbComponent,
        SearchControlComponent,
        InputControlComponent,
        SelectControlComponent,
        ButtonModule,
        CheckboxModule,
        DialogModule,
        PaginatorModule,
        TableModule
    ],
    templateUrl: './category-attributes.html'
})
export class CategoryAttributesPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly attributes = inject(AttributeService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Category attributes' }
    ];
    readonly categoryOptions = signal<CategoryOption[]>([]);
    readonly attributeOptions = signal<{ id: string; label: string }[]>([]);
    readonly categoryFilter = new FormControl<string | null>(null);
    readonly categoryId = new FormControl<string | null>(null, Validators.required);
    readonly attributeId = new FormControl<string | null>(null, Validators.required);
    readonly fields = new FormGroup({
        displayOrder: new FormControl(0, { nonNullable: true })
    });
    readonly isRequired = signal(true);
    readonly isVariationOption = signal(false);
    readonly items = signal<CategoryAttributeRow[]>([]);
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
        this.attributes.list('', 1, 200).subscribe({
            next: (page) => this.attributeOptions.set((page.items ?? []).map((item) => this.toOption(item))),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load attributes.'))
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
        this.attributeId.markAsUntouched();
        this.dialogOpen.set(true);
    }

    openEdit(row: CategoryAttributeRow): void {
        this.error.set(null);
        this.apply(row);
        this.ensureAttributeOption(row);
        this.dialogOpen.set(true);
    }

    save(): void {
        const categoryId = this.categoryId.value;
        const attributeId = this.attributeId.value;
        if (!categoryId || !attributeId) {
            this.categoryId.markAsTouched();
            this.attributeId.markAsTouched();
            this.error.set(!categoryId ? 'Choose a category.' : 'Choose an attribute.');
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.categories
            .saveAttribute({
                categoryId,
                attributeId,
                isRequired: this.isRequired(),
                isVariationOption: this.isVariationOption(),
                displayOrder: Number(this.fields.controls.displayOrder.value) || 0
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.dialogOpen.set(false);
                    this.load();
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the category attribute.'));
                }
            });
    }

    private load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.categories.attributes(this.query(), this.categoryFilter.value, pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.items.set([]);
                this.totalRecords.set(0);
                this.error.set(catalogErrorMessage(error, 'Could not load category attributes.'));
            }
        });
    }

    private apply(row: CategoryAttributeRow | null): void {
        this.categoryId.setValue(row?.categoryId ?? null, { emitEvent: false });
        this.attributeId.setValue(row?.attributeId ?? null, { emitEvent: false });
        this.isRequired.set(row?.isRequired ?? true);
        this.isVariationOption.set(row?.isVariationOption ?? false);
        this.fields.patchValue({ displayOrder: row?.displayOrder ?? 0 }, { emitEvent: false });
    }

    private ensureAttributeOption(row: CategoryAttributeRow): void {
        if (this.attributeOptions().some((option) => option.id === row.attributeId)) {
            return;
        }
        this.attributeOptions.update((options) => [{ id: row.attributeId, label: row.attributeName }, ...options]);
    }

    private toOption(item: CatalogAttribute): { id: string; label: string } {
        return { id: item.id, label: item.displayName || item.name };
    }
}
