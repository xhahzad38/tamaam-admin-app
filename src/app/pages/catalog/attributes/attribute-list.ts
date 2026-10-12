import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
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
    imports: [FormsModule, ButtonModule, DialogModule, IconFieldModule, InputIconModule, InputTextModule, SelectModule, TableModule],
    templateUrl: './attribute-list.html'
})
export class AttributeListPage implements OnInit {
    private readonly attributes = inject(AttributeService);

    readonly displayTypes = ATTRIBUTE_DISPLAY_TYPES;
    readonly displayTypeLabel = displayTypeLabel;

    readonly items = signal<CatalogAttribute[]>([]);
    readonly total = signal(0);
    readonly page = signal(1);
    readonly pageSize = 20;
    readonly search = signal('');
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly selected = signal<CatalogAttribute | null>(null);
    readonly values = signal<CatalogAttributeValue[]>([]);
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
        this.loading.set(true);
        this.error.set(null);
        this.attributes.list(this.search(), this.page(), this.pageSize).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.total.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load attributes.'));
            }
        });
    }

    searchNow(): void {
        this.page.set(1);
        this.load();
    }

    go(page: number): void {
        const pages = Math.max(1, Math.ceil(this.total() / this.pageSize));
        if (page < 1 || page > pages) {
            return;
        }
        this.page.set(page);
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
        this.valuesLoading.set(true);
        this.attributes.values(attribute.id).subscribe({
            next: (values) => {
                this.values.set(values);
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
