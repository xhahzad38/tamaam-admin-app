import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, toSlug } from '../catalog.util';
import { ATTRIBUTE_DISPLAY_TYPES, AttributeValueWrite, AttributeWrite, CatalogAttribute, CatalogAttributeValue, displayTypeLabel } from './attribute.models';
import { AttributeService } from './attribute.service';

interface AttributeForm {
    id: string | null;
    name: string;
    displayName: string;
    slug: string;
    displayType: number;
    sortOrder: number;
}

interface ValueForm {
    id: string | null;
    name: string;
    displayName: string;
    slug: string;
    colorHex: string;
    sortOrder: number;
}

function emptyAttribute(): AttributeForm {
    return { id: null, name: '', displayName: '', slug: '', displayType: 0, sortOrder: 0 };
}

function emptyValue(): ValueForm {
    return { id: null, name: '', displayName: '', slug: '', colorHex: '', sortOrder: 0 };
}

@Component({
    selector: 'app-attribute-list',
    standalone: true,
    imports: [FormsModule, BreadCrumbComponent, SearchControlComponent, ButtonModule, DialogModule, InputTextModule, PaginatorModule, SelectModule, TableModule],
    templateUrl: './attribute-list.html'
})
export class AttributeListPage implements OnInit {
    private readonly attributes = inject(AttributeService);

    readonly crumbs: MenuItem[] = [{ label: 'Attributes' }];
    readonly displayTypes = ATTRIBUTE_DISPLAY_TYPES;
    readonly displayTypeLabel = displayTypeLabel;

    readonly items = signal<CatalogAttribute[]>([]);
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly search = signal('');
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly selected = signal<CatalogAttribute | null>(null);
    readonly values = signal<CatalogAttributeValue[]>([]);
    readonly valueQuery = signal('');
    readonly valueFirst = signal(0);
    readonly valueRows = signal(10);
    readonly valueTotal = signal(0);
    readonly valuesLoading = signal(false);

    readonly attributeDialog = signal(false);
    readonly valueDialog = signal(false);
    readonly saving = signal(false);
    readonly attributeForm = signal<AttributeForm>(emptyAttribute());
    readonly valueForm = signal<ValueForm>(emptyValue());

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.attributes.list(this.search(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load attributes.'));
            }
        });
    }

    onSearch(value: string): void {
        this.search.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.load();
    }

    openCreate(): void {
        this.attributeForm.set(emptyAttribute());
        this.attributeDialog.set(true);
    }

    openEdit(attribute: CatalogAttribute): void {
        this.attributeForm.set({
            id: attribute.id,
            name: attribute.name,
            displayName: attribute.displayName,
            slug: attribute.slug,
            displayType: attribute.displayType,
            sortOrder: attribute.sortOrder
        });
        this.attributeDialog.set(true);
    }

    patchAttribute(partial: Partial<AttributeForm>): void {
        this.attributeForm.update((current) => ({ ...current, ...partial }));
    }

    saveAttribute(): void {
        const current = this.attributeForm();
        const name = current.name.trim();
        const displayName = current.displayName.trim() || name;
        const slug = current.slug.trim() || toSlug(name);
        if (!name || !slug) {
            this.error.set('Name and slug are required.');
            return;
        }
        const body: AttributeWrite = {
            name,
            displayName,
            slug,
            displayType: Number(current.displayType) || 0,
            sortOrder: Number(current.sortOrder) || 0
        };
        this.saving.set(true);
        this.error.set(null);
        const request = current.id ? this.attributes.update(current.id, body) : this.attributes.create(body);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.attributeDialog.set(false);
                this.load();
                const selected = this.selected();
                if (selected && current.id === selected.id) {
                    this.select({ ...selected, ...body });
                }
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not save the attribute.'));
            }
        });
    }

    remove(attribute: CatalogAttribute): void {
        if (!window.confirm(`Delete ${attribute.displayName || attribute.name}?`)) {
            return;
        }
        this.attributes.delete(attribute.id).subscribe({
            next: () => {
                if (this.selected()?.id === attribute.id) {
                    this.selected.set(null);
                    this.values.set([]);
                }
                this.load();
            },
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the attribute.'))
        });
    }

    select(attribute: CatalogAttribute): void {
        this.selected.set(attribute);
        this.valueQuery.set('');
        this.valueFirst.set(0);
        this.loadValues(attribute);
    }

    onValueSearch(value: string): void {
        this.valueQuery.set(value);
        this.valueFirst.set(0);
        const attribute = this.selected();
        if (attribute) {
            this.loadValues(attribute);
        }
    }

    onValuePage(event: PaginatorState): void {
        this.valueFirst.set(event.first ?? 0);
        this.valueRows.set(event.rows ?? 10);
        const attribute = this.selected();
        if (attribute) {
            this.loadValues(attribute);
        }
    }

    private loadValues(attribute: CatalogAttribute): void {
        const pageNo = Math.floor(this.valueFirst() / this.valueRows()) + 1;
        this.valuesLoading.set(true);
        this.attributes.values(attribute.id, this.valueQuery(), pageNo, this.valueRows()).subscribe({
            next: (page) => {
                this.values.set(page.items ?? []);
                this.valueTotal.set(page.totalCount ?? 0);
                this.valuesLoading.set(false);
            },
            error: (error) => {
                this.valuesLoading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load attribute values.'));
            }
        });
    }

    openCreateValue(): void {
        this.valueForm.set(emptyValue());
        this.valueDialog.set(true);
    }

    openEditValue(value: CatalogAttributeValue): void {
        this.valueForm.set({
            id: value.id,
            name: value.name,
            displayName: value.displayName,
            slug: value.slug,
            colorHex: value.colorHex ?? '',
            sortOrder: value.sortOrder
        });
        this.valueDialog.set(true);
    }

    patchValue(partial: Partial<ValueForm>): void {
        this.valueForm.update((current) => ({ ...current, ...partial }));
    }

    saveValue(): void {
        const attribute = this.selected();
        const current = this.valueForm();
        const name = current.name.trim();
        const displayName = current.displayName.trim() || name;
        const slug = current.slug.trim() || toSlug(name);
        if (!attribute || !name || !slug) {
            this.error.set('Name and slug are required.');
            return;
        }
        const body: AttributeValueWrite = {
            name,
            displayName,
            slug,
            colorHex: current.colorHex.trim() || null,
            sortOrder: Number(current.sortOrder) || 0,
            attributeId: attribute.id
        };
        this.saving.set(true);
        this.error.set(null);
        const request = current.id ? this.attributes.updateValue(current.id, body) : this.attributes.createValue(body);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.valueDialog.set(false);
                this.select(attribute);
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not save the attribute value.'));
            }
        });
    }

    removeValue(value: CatalogAttributeValue): void {
        const attribute = this.selected();
        if (!attribute || !window.confirm(`Delete ${value.displayName || value.name}?`)) {
            return;
        }
        this.attributes.deleteValue(value.id).subscribe({
            next: () => this.select(attribute),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the attribute value.'))
        });
    }
}
