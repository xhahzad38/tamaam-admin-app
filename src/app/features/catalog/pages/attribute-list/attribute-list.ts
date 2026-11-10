import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared/ui/select-control/select-control.component';

import { ATTRIBUTE_DISPLAY_TYPES, AttributeValueWrite, AttributeWrite, CatalogAttribute, CatalogAttributeValue, displayTypeLabel } from '@/app/features/catalog/data-access/attribute.models';
import { AttributeService } from '@/app/features/catalog/data-access/attribute.service';

import { errorMessage } from '@/app/core/http/api-error';
import { toSlug } from '@/app/shared/utils/text.util';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, EmptyStateComponent } from '@/app/shared/ui/state/state.components';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
@Component({
    selector: 'app-attribute-list',
    standalone: true,
    imports: [ReactiveFormsModule, SearchControlComponent, InputControlComponent, SelectControlComponent, ButtonModule, DialogModule, PaginatorModule, TableModule, PageHeaderComponent, ErrorStateComponent, EmptyStateComponent],
    templateUrl: './attribute-list.html'
})
export class AttributeListPage implements OnInit {
    private readonly confirm = inject(ConfirmService);
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
    editingAttributeId: string | null = null;
    editingValueId: string | null = null;
    readonly attributeFields = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        slug: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        displayType: new FormControl(0, { nonNullable: true }),
        sortOrder: new FormControl(0, { nonNullable: true })
    });
    readonly valueFields = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        slug: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        colorHex: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(7)] }),
        sortOrder: new FormControl(0, { nonNullable: true })
    });

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
                this.error.set(errorMessage(error, 'Could not load attributes.'));
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
        this.editingAttributeId = null;
        this.attributeFields.reset({ name: '', displayName: '', slug: '', displayType: 0, sortOrder: 0 });
        this.attributeDialog.set(true);
    }

    openEdit(attribute: CatalogAttribute): void {
        this.editingAttributeId = attribute.id;
        this.attributeFields.setValue({
            name: attribute.name,
            displayName: attribute.displayName,
            slug: attribute.slug,
            displayType: attribute.displayType,
            sortOrder: attribute.sortOrder
        });
        this.attributeDialog.set(true);
    }

    saveAttribute(): void {
        const current = this.attributeFields.getRawValue();
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
        const request = this.editingAttributeId ? this.attributes.update(this.editingAttributeId, body) : this.attributes.create(body);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.attributeDialog.set(false);
                this.load();
                const selected = this.selected();
                if (selected && this.editingAttributeId === selected.id) {
                    this.select({ ...selected, ...body });
                }
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(errorMessage(error, 'Could not save the attribute.'));
            }
        });
    }

    async remove(attribute: CatalogAttribute): Promise<void> {
        if (!(await this.confirm.ask({ message: `Delete ${attribute.displayName || attribute.name}?`, danger: true, acceptLabel: 'Delete' }))) {
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
            error: (error) => this.error.set(errorMessage(error, 'Could not delete the attribute.'))
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
                this.error.set(errorMessage(error, 'Could not load attribute values.'));
            }
        });
    }

    openCreateValue(): void {
        this.editingValueId = null;
        this.valueFields.reset({ name: '', displayName: '', slug: '', colorHex: '', sortOrder: 0 });
        this.valueDialog.set(true);
    }

    openEditValue(value: CatalogAttributeValue): void {
        this.editingValueId = value.id;
        this.valueFields.setValue({
            name: value.name,
            displayName: value.displayName,
            slug: value.slug,
            colorHex: value.colorHex ?? '',
            sortOrder: value.sortOrder
        });
        this.valueDialog.set(true);
    }

    saveValue(): void {
        const attribute = this.selected();
        const current = this.valueFields.getRawValue();
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
        const request = this.editingValueId ? this.attributes.updateValue(this.editingValueId, body) : this.attributes.createValue(body);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.valueDialog.set(false);
                this.select(attribute);
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(errorMessage(error, 'Could not save the attribute value.'));
            }
        });
    }

    async removeValue(value: CatalogAttributeValue): Promise<void> {
        const attribute = this.selected();
        if (!attribute || !(await this.confirm.ask({ message: `Delete ${value.displayName || value.name}?`, danger: true, acceptLabel: 'Delete' }))) {
            return;
        }
        this.attributes.deleteValue(value.id).subscribe({
            next: () => this.select(attribute),
            error: (error) => this.error.set(errorMessage(error, 'Could not delete the attribute value.'))
        });
    }
}
