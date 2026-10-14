import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, includesQuery } from '../catalog.util';
import { CatalogAttribute } from '../attributes/attribute.models';
import { AttributeService } from '../attributes/attribute.service';
import { CategoryAttributeLink, CategoryDetail } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-detail',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, RouterLink, BreadCrumbComponent, SearchControlComponent, InputControlComponent, ButtonModule, CheckboxModule, TableModule],
    templateUrl: './category-detail.html'
})
export class CategoryDetailPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly attributes = inject(AttributeService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs = signal<MenuItem[]>([
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Category' }
    ]);

    readonly detail = signal<CategoryDetail | null>(null);
    readonly links = signal<CategoryAttributeLink[]>([]);
    readonly linkQuery = signal('');
    readonly visibleLinks = computed(() => this.links().filter((row) => includesQuery(this.linkQuery(), row.attributeName)));
    private readonly orderControls = new Map<string, FormControl<number>>();
    readonly search = signal('');
    readonly searchResults = signal<CatalogAttribute[]>([]);
    readonly loading = signal(false);
    readonly searching = signal(false);
    readonly saving = signal<string | null>(null);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.load(id);
            }
        });
    }

    load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.categories.get(id).subscribe({
            next: (detail) => {
                this.apply(detail);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load this category.'));
            }
        });
    }

    onAttributeSearch(value: string): void {
        this.search.set(value);
        this.searchAttributes();
    }

    searchAttributes(): void {
        this.searching.set(true);
        this.attributes.list(this.search(), 1, 20).subscribe({
            next: (page) => {
                this.searchResults.set(page.items ?? []);
                this.searching.set(false);
            },
            error: (error) => {
                this.searching.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not search attributes.'));
            }
        });
    }

    addAttribute(attribute: CatalogAttribute): void {
        this.links.update((rows) => {
            if (rows.some((row) => row.attributeId === attribute.id)) {
                return rows;
            }
            const displayOrder = rows.reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1;
            return [
                ...rows,
                {
                    attributeId: attribute.id,
                    attributeName: attribute.displayName || attribute.name,
                    isRequired: true,
                    displayOrder
                }
            ];
        });
    }

    patchLink(attributeId: string, partial: Partial<CategoryAttributeLink>): void {
        this.links.update((rows) => rows.map((row) => (row.attributeId === attributeId ? { ...row, ...partial } : row)));
    }

    removeLink(attributeId: string): void {
        this.links.update((rows) => rows.filter((row) => row.attributeId !== attributeId));
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

    saveAttributes(): void {
        const id = this.detail()?.id;
        if (!id) {
            return;
        }
        this.persist('attributes', this.categories.saveAttributes(id, this.links()), 'Category attributes saved.');
    }

    private persist(key: string, request: Observable<CategoryDetail>, notice: string): void {
        this.saving.set(key);
        this.error.set(null);
        this.notice.set(null);
        request.subscribe({
            next: (detail) => {
                this.apply(detail);
                this.notice.set(notice);
                this.saving.set(null);
            },
            error: (error) => {
                this.saving.set(null);
                this.error.set(catalogErrorMessage(error, 'Could not save.'));
            }
        });
    }

    private apply(detail: CategoryDetail): void {
        this.detail.set(detail);
        this.crumbs.set([
            { label: 'Categories', routerLink: '/catalog/categories' },
            { label: detail.name }
        ]);
        this.orderControls.clear();
        this.links.set([...(detail.attributes ?? [])].sort((a, b) => a.displayOrder - b.displayOrder));
    }
}
