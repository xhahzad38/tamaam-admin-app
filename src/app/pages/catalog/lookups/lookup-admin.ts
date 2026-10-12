import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { LookupTypeValue } from '@/app/shared/services/lookup.service';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage } from '../catalog.util';
import { LookupValueWrite, MARKETPLACE_LOOKUP_TYPES, LookupAdminService } from './lookup-admin.service';

@Component({
    selector: 'app-lookup-admin',
    standalone: true,
    imports: [ReactiveFormsModule, BreadCrumbComponent, SearchControlComponent, InputControlComponent, ButtonModule, DialogModule, PaginatorModule, TableModule],
    templateUrl: './lookup-admin.html'
})
export class LookupAdminPage implements OnInit {
    private readonly lookups = inject(LookupAdminService);

    readonly crumbs: MenuItem[] = [{ label: 'Lookups' }];
    readonly types = MARKETPLACE_LOOKUP_TYPES;
    readonly typeName = signal(MARKETPLACE_LOOKUP_TYPES[0].name);
    readonly typeId = signal<string | null>(null);
    readonly items = signal<LookupTypeValue[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogOpen = signal(false);
    readonly error = signal<string | null>(null);
    editingId: string | null = null;
    readonly fields = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
        sortOrder: new FormControl(0, { nonNullable: true })
    });

    ngOnInit(): void {
        this.selectType(this.typeName());
    }

    selectType(name: string): void {
        this.typeName.set(name);
        this.query.set('');
        this.first.set(0);
        this.typeId.set(null);
        this.items.set([]);
        this.loading.set(true);
        this.error.set(null);
        this.lookups.findTypeId(name).subscribe({
            next: (id) => {
                this.typeId.set(id);
                this.loadValues(name);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not find this lookup type.'));
            }
        });
    }

    openCreate(): void {
        this.editingId = null;
        this.fields.reset({ name: '', description: '', sortOrder: 0 });
        this.dialogOpen.set(true);
    }

    openEdit(value: LookupTypeValue): void {
        this.editingId = value.id;
        this.fields.setValue({
            name: value.name,
            description: value.description ?? '',
            sortOrder: value.sortOrder
        });
        this.dialogOpen.set(true);
    }

    save(): void {
        const lookupTypeId = this.typeId();
        const current = this.fields.getRawValue();
        if (!lookupTypeId || !current.name.trim()) {
            this.fields.markAllAsTouched();
            this.error.set('Name is required.');
            return;
        }
        const body: LookupValueWrite = {
            name: current.name.trim(),
            description: current.description.trim() || null,
            sortOrder: Number(current.sortOrder) || 0,
            lookupTypeId
        };
        this.saving.set(true);
        this.error.set(null);
        const request = this.editingId ? this.lookups.update(this.editingId, body) : this.lookups.create(body);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.dialogOpen.set(false);
                this.loadValues(this.typeName());
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not save the lookup value.'));
            }
        });
    }

    remove(value: LookupTypeValue): void {
        if (!window.confirm(`Delete ${value.name}?`)) {
            return;
        }
        this.lookups.delete(value.id).subscribe({
            next: () => this.loadValues(this.typeName()),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the lookup value.'))
        });
    }

    onSearch(value: string): void {
        this.query.set(value);
        this.first.set(0);
        this.loadValues(this.typeName());
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.loadValues(this.typeName());
    }

    private loadValues(name: string): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.lookups.values(name, this.query(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load lookup values.'));
            }
        });
    }
}
