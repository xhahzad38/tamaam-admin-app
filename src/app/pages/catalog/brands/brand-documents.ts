import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage, catalogMediaUrl, includesQuery } from '../catalog.util';
import { BRAND_DOCUMENT_KINDS, BrandDocument } from './brand.models';
import { BrandService } from './brand.service';

interface DocumentRow extends BrandDocument {
    brandName: string;
}

interface BrandOption {
    id: string;
    name: string;
}

@Component({
    selector: 'app-brand-documents',
    standalone: true,
    imports: [ReactiveFormsModule, BreadCrumbComponent, SearchControlComponent, InputControlComponent, SelectControlComponent, ButtonModule, DialogModule, PaginatorModule, TableModule],
    templateUrl: './brand-documents.html'
})
export class BrandDocumentsPage implements OnInit {
    private readonly brands = inject(BrandService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [
        { label: 'Brands', routerLink: '/catalog/brands' },
        { label: 'Documents' }
    ];
    readonly documentKinds = BRAND_DOCUMENT_KINDS;
    readonly mediaUrl = catalogMediaUrl;
    readonly brandOptions = signal<BrandOption[]>([]);
    readonly brandFilter = new FormControl<string | null>(null);
    readonly brandFilterId = signal<string | null>(null);
    readonly brandId = new FormControl<string | null>(null);
    readonly fields = new FormGroup({
        kind: new FormControl('TrademarkCertificate', { nonNullable: true }),
        expiresOn: new FormControl('', { nonNullable: true })
    });
    readonly all = signal<DocumentRow[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly filtered = computed(() => {
        const brandId = this.brandFilterId();
        return this.all().filter((row) => {
            if (brandId && row.brandId !== brandId) {
                return false;
            }
            return includesQuery(this.query(), row.brandName, row.fileName, row.documentKind);
        });
    });
    readonly pageRows = computed(() => this.filtered().slice(this.first(), this.first() + this.rows()));
    readonly totalRecords = computed(() => this.filtered().length);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogOpen = signal(false);
    readonly error = signal<string | null>(null);
    readonly fileName = signal<string | null>(null);
    readonly fileError = signal<string | null>(null);
    private file: File | null = null;

    rowActions(row: DocumentRow): MenuItem[] {
        return [{ label: 'Delete', icon: 'pi pi-trash', command: () => this.remove(row) }];
    }

    ngOnInit(): void {
        const preset = this.route.snapshot.queryParamMap.get('brand');
        if (preset) {
            this.brandFilter.setValue(preset, { emitEvent: false });
            this.brandFilterId.set(preset);
        }
        this.load();
        this.brandFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
            this.brandFilterId.set(id);
            this.first.set(0);
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
        this.fileError.set(null);
        this.fileName.set(null);
        this.file = null;
        this.fields.reset({ kind: 'TrademarkCertificate', expiresOn: '' });
        this.brandId.setValue(this.brandFilterId());
        this.dialogOpen.set(true);
    }

    onFile(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        if (!file) {
            this.file = null;
            this.fileName.set(null);
            this.fileError.set(null);
            return;
        }
        if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
            this.file = null;
            this.fileName.set(null);
            this.fileError.set('Use a PDF, JPG, or PNG file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.file = null;
            this.fileName.set(null);
            this.fileError.set('Document must be 5 MB or smaller.');
            return;
        }
        this.fileError.set(null);
        this.file = file;
        this.fileName.set(file.name);
    }

    save(): void {
        const id = this.brandId.value;
        if (!id || !this.file) {
            this.brandId.markAsTouched();
            this.error.set(id ? 'Choose a document file.' : 'Choose a brand.');
            return;
        }
        const fields = this.fields.getRawValue();
        this.saving.set(true);
        this.error.set(null);
        this.brands.uploadDocument(id, this.file, fields.kind, fields.expiresOn || null).subscribe({
            next: () => {
                this.saving.set(false);
                this.dialogOpen.set(false);
                this.load();
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not upload the document.'));
            }
        });
    }

    remove(row: DocumentRow): void {
        if (!window.confirm(`Delete ${row.fileName}?`)) {
            return;
        }
        this.brands.deleteDocument(row.brandId, row.id).subscribe({
            next: () => this.load(),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the document.'))
        });
    }

    private load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.brands.list('', 1, 100).subscribe({
            next: (page) => {
                const brands = page.items ?? [];
                this.brandOptions.set(brands.map((brand) => ({ id: brand.id, name: brand.name })));
                if (!brands.length) {
                    this.all.set([]);
                    this.loading.set(false);
                    return;
                }
                forkJoin(
                    brands.map((brand) =>
                        this.brands.documents(brand.id, '', 1, 100).pipe(
                            map((result) => (result.items ?? []).map((document) => ({ ...document, brandName: brand.name }))),
                            catchError(() => of([] as DocumentRow[]))
                        )
                    )
                ).subscribe((groups) => {
                    this.all.set(groups.flat());
                    this.loading.set(false);
                });
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load brand documents.'));
            }
        });
    }
}
