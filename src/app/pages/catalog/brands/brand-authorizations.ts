import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { APPROVAL_STATUS_LABEL } from '@/app/pages/seller-reviews/seller-review.models';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage, includesQuery } from '../catalog.util';
import { BrandAuthorization } from './brand.models';
import { BrandService } from './brand.service';

interface AuthorizationRow extends BrandAuthorization {
    brandName: string;
}

interface BrandOption {
    id: string;
    name: string;
}

@Component({
    selector: 'app-brand-authorizations',
    standalone: true,
    imports: [ReactiveFormsModule, BreadCrumbComponent, SearchControlComponent, SelectControlComponent, ButtonModule, PaginatorModule, TableModule],
    templateUrl: './brand-authorizations.html'
})
export class BrandAuthorizationsPage implements OnInit {
    private readonly brands = inject(BrandService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [
        { label: 'Brands', routerLink: '/catalog/brands' },
        { label: 'Brand authorization List' }
    ];
    readonly statusLabel = (status: number) => APPROVAL_STATUS_LABEL[status] ?? 'Draft';
    readonly brandOptions = signal<BrandOption[]>([]);
    readonly brandFilter = new FormControl<string | null>(null);
    readonly brandFilterId = signal<string | null>(null);
    readonly all = signal<AuthorizationRow[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly filtered = computed(() => {
        const brandId = this.brandFilterId();
        return this.all().filter((row) => {
            if (brandId && row.brandId !== brandId) {
                return false;
            }
            return includesQuery(this.query(), row.brandName, row.storeName, row.authorizationType, this.statusLabel(row.approvalStatus));
        });
    });
    readonly pageRows = computed(() => this.filtered().slice(this.first(), this.first() + this.rows()));
    readonly totalRecords = computed(() => this.filtered().length);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    rowActions(row: AuthorizationRow): MenuItem[] {
        return [
            { label: 'Edit', icon: 'pi pi-pencil', command: () => this.openForm(row) },
            { label: 'Delete', icon: 'pi pi-trash', command: () => this.remove(row) }
        ];
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

    openForm(row?: AuthorizationRow): void {
        void this.router.navigate(['/catalog/brands/authorizations/new'], {
            queryParams: row
                ? {
                      id: row.id,
                      brand: row.brandId,
                      storeId: row.storeId,
                      storeName: row.storeName,
                      type: row.authorizationType,
                      documentId: row.documentId,
                      status: row.approvalStatus,
                      validFrom: row.validFrom,
                      validTo: row.validTo,
                      note: row.reviewNote,
                      active: row.isActive ? '1' : '0'
                  }
                : { brand: this.brandFilterId() }
        });
    }

    remove(row: AuthorizationRow): void {
        if (!window.confirm(`Remove authorization for ${row.storeName}?`)) {
            return;
        }
        this.brands.deleteAuthorization(row.brandId, row.id).subscribe({
            next: () => this.load(),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the authorization.'))
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
                        this.brands.authorizations(brand.id, '', 1, 100).pipe(
                            map((result) => (result.items ?? []).map((row) => ({ ...row, brandName: brand.name }))),
                            catchError(() => of([] as AuthorizationRow[]))
                        )
                    )
                ).subscribe((groups) => {
                    this.all.set(groups.flat());
                    this.loading.set(false);
                });
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load authorizations.'));
            }
        });
    }
}
