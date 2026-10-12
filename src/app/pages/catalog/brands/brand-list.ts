import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { SellerDirectoryItem, SellerReviewService } from '@/app/pages/seller-reviews/seller-review.service';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { catalogErrorMessage, catalogMediaUrl, readImageFile } from '../catalog.util';
import { Brand, BrandWrite, EnforcementOption } from './brand.models';
import { BrandService } from './brand.service';

interface BrandForm {
    id: string | null;
    name: string;
    slug: string;
    description: string;
    sortOrder: number;
    enforcementId: string | null;
    ownerOrganizationId: string | null;
    ownerOrganizationName: string;
    isActive: boolean;
    logoUrl: string | null;
}

function emptyForm(): BrandForm {
    return {
        id: null,
        name: '',
        slug: '',
        description: '',
        sortOrder: 0,
        enforcementId: null,
        ownerOrganizationId: null,
        ownerOrganizationName: '',
        isActive: true,
        logoUrl: null
    };
}

@Component({
    selector: 'app-brand-list',
    standalone: true,
    imports: [FormsModule, BreadCrumbComponent, SearchControlComponent, ButtonModule, CheckboxModule, DialogModule, InputTextModule, PaginatorModule, SelectModule, TableModule, TagModule, TextareaModule],
    templateUrl: './brand-list.html'
})
export class BrandListPage implements OnInit {
    private readonly brands = inject(BrandService);
    private readonly sellers = inject(SellerReviewService);
    private readonly router = inject(Router);

    readonly items = signal<Brand[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly enforcements = signal<EnforcementOption[]>([]);
    readonly owners = signal<SellerDirectoryItem[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly searchingOwners = signal(false);
    readonly dialogOpen = signal(false);
    readonly error = signal<string | null>(null);
    readonly imageError = signal<string | null>(null);
    readonly ownerSearch = signal('');
    readonly form = signal<BrandForm>(emptyForm());
    readonly crumbs: MenuItem[] = [{ label: 'Brands' }];
    readonly mediaUrl = catalogMediaUrl;

    logoFile: File | null = null;

    ngOnInit(): void {
        this.load();
        this.brands.enforcements().subscribe({
            next: (options) => this.enforcements.set(options),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load brand enforcement options.'))
        });
    }

    openRequests(): void {
        void this.router.navigate(['/catalog/brands/requests']);
    }

    openForm(id?: string): void {
        void this.router.navigate(id ? ['/catalog/brands', id] : ['/catalog/brands/new']);
    }

    load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.brands.list(this.query(), pageNo, this.rows()).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load brands.'));
            }
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
        this.logoFile = null;
        this.imageError.set(null);
        this.owners.set([]);
        this.ownerSearch.set('');
        const first = this.enforcements()[0]?.id ?? null;
        this.form.set({ ...emptyForm(), enforcementId: first });
        this.dialogOpen.set(true);
    }

    openEdit(brand: Brand): void {
        this.logoFile = null;
        this.imageError.set(null);
        this.owners.set([]);
        this.ownerSearch.set('');
        this.form.set({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            description: brand.description ?? '',
            sortOrder: brand.sortOrder,
            enforcementId: brand.enforcementId,
            ownerOrganizationId: brand.ownerOrganizationId,
            ownerOrganizationName: brand.ownerOrganizationName ?? '',
            isActive: brand.isActive,
            logoUrl: brand.logoUrl
        });
        this.dialogOpen.set(true);
    }

    patch(partial: Partial<BrandForm>): void {
        this.form.update((current) => ({ ...current, ...partial }));
    }

    onLogo(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        const message = readImageFile(file);
        this.imageError.set(message);
        this.logoFile = message ? null : file;
    }

    searchOwners(): void {
        this.searchingOwners.set(true);
        this.sellers.directory(this.ownerSearch(), '', 1, 10).subscribe({
            next: (page) => {
                this.owners.set(page.items ?? []);
                this.searchingOwners.set(false);
            },
            error: (error) => {
                this.searchingOwners.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not search seller organizations.'));
            }
        });
    }

    chooseOwner(owner: SellerDirectoryItem): void {
        this.patch({
            ownerOrganizationId: owner.organizationId,
            ownerOrganizationName: owner.displayName || owner.legalName
        });
        this.owners.set([]);
    }

    clearOwner(): void {
        this.patch({ ownerOrganizationId: null, ownerOrganizationName: '' });
    }

    save(): void {
        const current = this.form();
        if (!current.name.trim() || !current.enforcementId || this.saving() || this.imageError()) {
            this.error.set('Name and enforcement are required.');
            return;
        }
        const body: BrandWrite = {
            name: current.name.trim(),
            slug: current.slug.trim() || null,
            description: current.description.trim() || null,
            sortOrder: Number(current.sortOrder) || 0,
            enforcementId: current.enforcementId,
            ownerOrganizationId: current.ownerOrganizationId,
            isActive: current.isActive
        };
        this.saving.set(true);
        this.error.set(null);
        const request = current.id ? this.brands.update(current.id, body) : this.brands.create(body);
        request.subscribe({
            next: (brand) => this.afterSave(brand.id),
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not save the brand.'));
            }
        });
    }

    remove(brand: Brand): void {
        if (!window.confirm(`Delete ${brand.name}?`)) {
            return;
        }
        this.brands.delete(brand.id).subscribe({
            next: () => this.load(),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the brand.'))
        });
    }

    private afterSave(id: string): void {
        if (!this.logoFile) {
            this.saving.set(false);
            this.dialogOpen.set(false);
            this.load();
            return;
        }
        this.brands.uploadLogo(id, this.logoFile).subscribe({
            next: () => {
                this.logoFile = null;
                this.saving.set(false);
                this.dialogOpen.set(false);
                this.load();
            },
            error: (error) => {
                this.saving.set(false);
                this.form.update((form) => ({ ...form, id }));
                this.error.set(catalogErrorMessage(error, 'The brand was saved, but the logo was not uploaded.'));
                this.load();
            }
        });
    }
}
