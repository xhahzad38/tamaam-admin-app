import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from '@/app/pages/seller-reviews/seller-review.models';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, catalogMediaUrl, includesQuery, readImageFile } from '../catalog.util';
import { CatalogAttribute } from '../attributes/attribute.models';
import { AttributeService } from '../attributes/attribute.service';
import { CategoryAttributeLink, CategoryDetail, CategoryNode, CategoryWrite, collectCategoryIds, findCategory, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

interface CategoryFormState {
    name: string;
    slug: string;
    description: string;
    parentCategoryId: string | null;
    sortOrder: number;
    badge: boolean;
    badgeText: string;
    requiresExtraApproval: boolean;
    isActive: boolean;
    imageUrl: string | null;
    level: number | null;
    approvalStatus: number | null;
}

function emptyCategory(parentCategoryId: string | null = null): CategoryFormState {
    return {
        name: '',
        slug: '',
        description: '',
        parentCategoryId,
        sortOrder: 0,
        badge: false,
        badgeText: '',
        requiresExtraApproval: false,
        isActive: true,
        imageUrl: null,
        level: null,
        approvalStatus: null
    };
}

@Component({
    selector: 'app-category-form',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, RouterLink, BreadCrumbComponent, SearchControlComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule, TableModule],
    templateUrl: './category-form.html'
})
export class CategoryFormPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly attributes = inject(AttributeService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs = signal<MenuItem[]>([
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Add category' }
    ]);
    readonly mediaUrl = catalogMediaUrl;
    readonly statusLabel = (status: number | null) => (status === null ? '' : APPROVAL_STATUS_LABEL[status as ApprovalStatus] ?? 'Draft');

    readonly tree = signal<CategoryNode[]>([]);
    readonly categoryId = signal<string | null>(null);
    readonly form = signal<CategoryFormState>(emptyCategory());
    readonly details = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        slug: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        parentCategoryId: new FormControl<string | null>(null),
        sortOrder: new FormControl(0, { nonNullable: true }),
        description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
        badgeText: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] })
    });
    private readonly orderControls = new Map<string, FormControl<number>>();
    readonly parentOptions = computed(() => {
        const exclude = new Set<string>();
        const id = this.categoryId();
        if (id) {
            const self = findCategory(this.tree(), id);
            if (self) {
                collectCategoryIds(self, exclude);
            }
        }
        return flattenCategories(this.tree()).filter((option) => !exclude.has(option.id));
    });
    readonly links = signal<CategoryAttributeLink[]>([]);
    readonly linkQuery = signal('');
    readonly visibleLinks = computed(() => this.links().filter((row) => includesQuery(this.linkQuery(), row.attributeName)));
    readonly search = signal('');
    readonly searchResults = signal<CatalogAttribute[]>([]);
    readonly loading = signal(false);
    readonly saving = signal<string | null>(null);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly imageError = signal<string | null>(null);

    imageFile: File | null = null;

    ngOnInit(): void {
        this.categories.tree().subscribe({
            next: (tree) => this.tree.set(tree),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load parent categories.'))
        });
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.loadCategory(id);
                return;
            }
            const parent = this.route.snapshot.queryParamMap.get('parent');
            this.form.set(emptyCategory(parent));
            this.details.reset({ name: '', slug: '', parentCategoryId: parent, sortOrder: 0, description: '', badgeText: '' });
            this.categoryId.set(null);
        });
    }

    private loadCategory(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.categories.get(id).subscribe({
            next: (detail) => {
                this.applyCategory(detail);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load this category.'));
            }
        });
    }

    patch(partial: Partial<CategoryFormState>): void {
        this.form.update((current) => ({ ...current, ...partial }));
    }

    onImage(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        const message = readImageFile(file);
        this.imageError.set(message);
        this.imageFile = message ? null : file;
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

    saveCategory(): void {
        const current = this.details.getRawValue();
        const flags = this.form();
        if (this.details.controls.name.invalid || this.imageError()) {
            this.details.controls.name.markAsTouched();
            this.error.set(this.imageError() || 'Name is required.');
            return;
        }
        const body: CategoryWrite = {
            name: current.name.trim(),
            slug: current.slug.trim() || null,
            description: current.description.trim() || null,
            parentCategoryId: current.parentCategoryId,
            sortOrder: Number(current.sortOrder) || 0,
            badge: flags.badge,
            badgeText: current.badgeText.trim() || null,
            requiresExtraApproval: flags.requiresExtraApproval,
            isActive: flags.isActive
        };
        this.saving.set('category');
        this.error.set(null);
        const id = this.categoryId();
        const request = id ? this.categories.update(id, body) : this.categories.create(body);
        request.subscribe({
            next: (detail) => this.afterCategorySave(detail),
            error: (error) => {
                this.saving.set(null);
                this.error.set(catalogErrorMessage(error, 'Could not save the category.'));
            }
        });
    }

    onAttributeSearch(value: string): void {
        this.search.set(value);
        this.searchAttributes();
    }

    searchAttributes(): void {
        this.attributes.list(this.search(), 1, 20).subscribe({
            next: (page) => this.searchResults.set(page.items ?? []),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not search attributes.'))
        });
    }

    addAttribute(attribute: CatalogAttribute): void {
        this.links.update((rows) => {
            if (rows.some((row) => row.attributeId === attribute.id)) {
                return rows;
            }
            const displayOrder = rows.reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1;
            return [...rows, { attributeId: attribute.id, attributeName: attribute.displayName || attribute.name, isRequired: true, displayOrder }];
        });
    }

    patchLink(attributeId: string, partial: Partial<CategoryAttributeLink>): void {
        this.links.update((rows) => rows.map((row) => (row.attributeId === attributeId ? { ...row, ...partial } : row)));
    }

    removeLink(attributeId: string): void {
        this.links.update((rows) => rows.filter((row) => row.attributeId !== attributeId));
    }

    saveAttributes(): void {
        const id = this.categoryId();
        if (!id) {
            return;
        }
        this.saving.set('attributes');
        this.categories.saveAttributes(id, this.links()).subscribe({
            next: (detail) => {
                this.applyRelated(detail);
                this.notice.set('Category attributes saved.');
                this.saving.set(null);
            },
            error: (error) => {
                this.saving.set(null);
                this.error.set(catalogErrorMessage(error, 'Could not save attributes.'));
            }
        });
    }

    private afterCategorySave(detail: CategoryDetail): void {
        const finish = () => {
            this.saving.set(null);
            this.imageFile = null;
            this.applyCategory(detail);
            this.notice.set('Category saved.');
            this.refreshTree();
        };
        if (!this.imageFile) {
            finish();
            return;
        }
        this.categories.uploadImage(detail.id, this.imageFile).subscribe({
            next: (updated) => {
                detail = updated;
                finish();
            },
            error: (error) => {
                this.applyCategory(detail);
                this.saving.set(null);
                this.error.set(catalogErrorMessage(error, 'The category was saved, but the image was not uploaded.'));
            }
        });
    }

    private applyCategory(detail: CategoryDetail): void {
        this.categoryId.set(detail.id);
        this.crumbs.set([
            { label: 'Categories', routerLink: '/catalog/categories' },
            { label: detail.name || 'Edit category' }
        ]);
        this.details.patchValue(
            {
                name: detail.name,
                slug: detail.slug,
                description: detail.description ?? '',
                parentCategoryId: detail.parentCategoryId,
                sortOrder: detail.sortOrder,
                badgeText: detail.badgeText ?? ''
            },
            { emitEvent: false }
        );
        this.form.set({
            name: detail.name,
            slug: detail.slug,
            description: detail.description ?? '',
            parentCategoryId: detail.parentCategoryId,
            sortOrder: detail.sortOrder,
            badge: detail.badge,
            badgeText: detail.badgeText ?? '',
            requiresExtraApproval: detail.requiresExtraApproval,
            isActive: detail.isActive,
            imageUrl: detail.imageUrl,
            level: detail.level,
            approvalStatus: detail.approvalStatus
        });
        this.applyRelated(detail);
    }

    private applyRelated(detail: CategoryDetail): void {
        this.orderControls.clear();
        this.links.set([...(detail.attributes ?? [])].sort((a, b) => a.displayOrder - b.displayOrder));
    }

    private refreshTree(): void {
        this.categories.tree().subscribe({
            next: (tree) => this.tree.set(tree)
        });
    }
}
