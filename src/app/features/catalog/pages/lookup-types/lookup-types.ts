import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { errorMessage } from '@/app/core/http/api-error';
import { LookupAdminService, LookupTypeRow } from '@/app/features/catalog/data-access/lookup-admin.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';

/** Manage lookup types (the lists behind dropdowns). Built-in types can be described and re-ordered but not renamed or deleted. */
@Component({
    selector: 'app-lookup-types',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        DialogModule,
        InputNumberModule,
        TableModule,
        TagModule,
        TextareaModule,
        InputControlComponent,
        PageHeaderComponent,
        SearchControlComponent,
        TablePaginatorComponent,
        EmptyStateComponent,
        ErrorStateComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './lookup-types.html'
})
export class LookupTypesPage {
    private readonly lookups = inject(LookupAdminService);
    private readonly confirm = inject(ConfirmService);
    private readonly messages = inject(MessageService);

    readonly crumbs: MenuItem[] = [{ label: 'Catalog' }, { label: 'Lookup types' }];
    readonly list = createPagedList((req) => this.lookups.types(req.search, req.pageNo, req.pageSize), { pageSize: 20, errorMessage: 'Could not load lookup types.' });

    readonly editing = signal<LookupTypeRow | 'new' | null>(null);
    readonly saving = signal(false);
    readonly formError = signal<string | null>(null);

    readonly form = inject(FormBuilder).nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[A-Za-z][A-Za-z0-9]*$/)]],
        description: [''],
        sortOrder: [0, [Validators.min(0)]]
    });

    open(row?: LookupTypeRow): void {
        this.formError.set(null);
        this.form.reset({ name: row?.name ?? '', description: row?.description ?? '', sortOrder: row?.sortOrder ?? 0 });
        if (row?.isBuiltIn) this.form.controls.name.disable();
        else this.form.controls.name.enable();
        this.editing.set(row ?? 'new');
    }

    close(): void {
        this.editing.set(null);
    }

    save(): void {
        this.form.markAllAsTouched();
        const target = this.editing();
        if (this.form.invalid || !target || this.saving()) return;
        const raw = this.form.getRawValue();
        const body = { name: raw.name.trim(), description: raw.description.trim() || null, sortOrder: raw.sortOrder ?? 0 };
        this.saving.set(true);
        this.formError.set(null);
        const request = target === 'new' ? this.lookups.createType(body) : this.lookups.updateType(target.id, body);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.close();
                this.messages.add({ severity: 'success', summary: 'Saved', detail: `Lookup type ${body.name} saved.`, life: 3000 });
                this.list.reload();
            },
            error: (err) => {
                this.saving.set(false);
                this.formError.set(errorMessage(err, 'Could not save the lookup type.'));
            }
        });
    }

    async remove(row: LookupTypeRow): Promise<void> {
        const ok = await this.confirm.ask({ message: `Delete the lookup type "${row.name}" and hide its values everywhere?`, danger: true });
        if (!ok) return;
        this.lookups.deleteType(row.id).subscribe({
            next: () => this.list.reload(),
            error: (err) => this.messages.add({ severity: 'error', summary: 'Not deleted', detail: errorMessage(err, 'Could not delete the lookup type.') })
        });
    }
}
