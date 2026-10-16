import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from '@/app/pages/seller-reviews/seller-review.models';
import { SellerDirectoryItem, SellerReviewService } from '@/app/pages/seller-reviews/seller-review.service';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage, catalogMediaUrl, readImageFile } from '../catalog.util';
import { BRAND_AUTHORIZATION_TYPES, BRAND_DOCUMENT_KINDS, Brand, BrandAuthorization, BrandDocument, BrandWrite, EnforcementOption } from './brand.models';
import { BrandService } from './brand.service';

interface BrandFormState {
    name: string;
    slug: string;
    description: string;
    sortOrder: number;
    enforcementId: string | null;
    ownerOrganizationId: string | null;
    ownerOrganizationName: string;
    isActive: boolean;
    logoUrl: string | null;
    approvalStatus: number | null;
}

function emptyBrand(): BrandFormState {
    return {
        name: '',
        slug: '',
        description: '',
        sortOrder: 0,
        enforcementId: null,
        ownerOrganizationId: null,
        ownerOrganizationName: '',
        isActive: true,
        logoUrl: null,
        approvalStatus: null
    };
}

@Component({
    selector: 'app-brand-form',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, BreadCrumbComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule],
    templateUrl: './brand-form.html'
})
export class BrandFormPage implements OnInit {
    private readonly brands = inject(BrandService);
    private readonly sellers = inject(SellerReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly documentKinds = BRAND_DOCUMENT_KINDS;
    readonly authorizationTypes = BRAND_AUTHORIZATION_TYPES;
    readonly approvalOptions = [
        { label: 'Draft', value: ApprovalStatus.Draft },
        { label: 'Approved', value: ApprovalStatus.Approved },
        { label: 'Rejected', value: ApprovalStatus.Rejected }
    ];
    readonly crumbs = signal<MenuItem[]>([
        { label: 'Brands', routerLink: '/catalog/brands' },
        { label: 'Add brand' }
    ]);
    readonly mediaUrl = catalogMediaUrl;
    readonly statusLabel = (status: number) => APPROVAL_STATUS_LABEL[status] ?? 'Draft';

    readonly brandId = signal<string | null>(null);
    readonly form = signal<BrandFormState>(emptyBrand());
    readonly details = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        slug: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        enforcementId: new FormControl<string | null>(null, Validators.required),
        sortOrder: new FormControl(0, { nonNullable: true }),
        description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
        ownerSearch: new FormControl('', { nonNullable: true })
    });
    readonly documentForm = new FormGroup({
        kind: new FormControl('TrademarkCertificate', { nonNullable: true }),
        expiresOn: new FormControl('', { nonNullable: true })
    });
    readonly authForm = new FormGroup({
        type: new FormControl('AuthorizedReseller', { nonNullable: true }),
        documentId: new FormControl<string | null>(null),
        status: new FormControl(ApprovalStatus.Approved, { nonNullable: true }),
        validFrom: new FormControl('', { nonNullable: true }),
        validTo: new FormControl('', { nonNullable: true }),
        note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
    });
    readonly enforcements = signal<EnforcementOption[]>([]);
    readonly documents = signal<BrandDocument[]>([]);
    readonly documentQuery = signal('');
    readonly documentFirst = signal(0);
    readonly documentRows = signal(10);
    readonly documentTotal = signal(0);
    readonly authorizations = signal<BrandAuthorization[]>([]);
    readonly authorizationQuery = signal('');
    readonly authorizationFirst = signal(0);
    readonly authorizationRows = signal(10);
    readonly authorizationTotal = signal(0);
    readonly owners = signal<SellerDirectoryItem[]>([]);
    readonly ownerSearch = signal('');
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly imageError = signal<string | null>(null);
    readonly logoName = signal<string | null>(null);
    readonly documentKind = signal('TrademarkCertificate');
    readonly documentExpires = signal('');
    readonly documentError = signal<string | null>(null);
    readonly authStoreId = signal<string | null>(null);
    readonly authStoreName = signal('');
    readonly authType = signal('AuthorizedReseller');
    readonly authDocumentId = signal<string | null>(null);
    readonly authStatus = signal(ApprovalStatus.Approved);
    readonly authFrom = signal('');
    readonly authTo = signal('');
    readonly authNote = signal('');
    readonly authActive = signal(true);

    logoFile: File | null = null;
    documentFile: File | null = null;

    ngOnInit(): void {
        this.brands.enforcements().subscribe({
            next: (options) => {
                this.enforcements.set(options);
                if (!this.details.controls.enforcementId.value && options[0]) {
                    this.details.controls.enforcementId.setValue(options[0].id);
                }
            },
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load brand enforcement options.'))
        });

        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id && id !== 'new') {
                this.crumbs.set([
                    { label: 'Brands', routerLink: '/catalog/brands' },
                    { label: 'Edit brand' }
                ]);
                this.load(id);
            }
        });
    }

    patch(partial: Partial<BrandFormState>): void {
        this.form.update((current) => ({ ...current, ...partial }));
    }

    onLogo(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        const message = readImageFile(file);
        this.imageError.set(message);
        this.logoFile = message ? null : file;
        this.logoName.set(message ? null : file?.name ?? null);
    }

    close(): void {
        void this.router.navigate(['/catalog/brands']);
    }

    onDocument(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        if (!file) {
            this.documentFile = null;
            this.documentError.set(null);
            return;
        }
        const allowed = /\.(pdf|jpe?g|png)$/i.test(file.name);
        if (!allowed) {
            this.documentFile = null;
            this.documentError.set('Use a PDF, JPG, or PNG file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.documentFile = null;
            this.documentError.set('Document must be 5 MB or smaller.');
            return;
        }
        this.documentError.set(null);
        this.documentFile = file;
    }

    searchOwners(): void {
        this.sellers.directory(this.details.controls.ownerSearch.value, '', 1, 10).subscribe({
            next: (page) => this.owners.set(page.items ?? []),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not search sellers.'))
        });
    }

    chooseOwner(owner: SellerDirectoryItem): void {
        this.patch({ ownerOrganizationId: owner.organizationId, ownerOrganizationName: owner.displayName || owner.legalName });
        if (owner.storeId) {
            this.authStoreId.set(owner.storeId);
            this.authStoreName.set(owner.storeName || owner.displayName || owner.legalName);
        }
        this.owners.set([]);
    }

    clearOwner(): void {
        this.patch({ ownerOrganizationId: null, ownerOrganizationName: '' });
    }

    chooseStore(owner: SellerDirectoryItem): void {
        if (!owner.storeId) {
            this.error.set('That seller does not have a store yet.');
            return;
        }
        this.authStoreId.set(owner.storeId);
        this.authStoreName.set(owner.storeName || owner.displayName || owner.legalName);
        this.owners.set([]);
    }

    saveBrand(): void {
        const current = this.details.getRawValue();
        const flags = this.form();
        if (!current.name.trim() || !current.enforcementId || this.imageError()) {
            this.details.markAllAsTouched();
            this.error.set('Name and enforcement are required.');
            return;
        }
        const body: BrandWrite = {
            name: current.name.trim(),
            slug: current.slug.trim() || null,
            description: current.description.trim() || null,
            sortOrder: Number(current.sortOrder) || 0,
            enforcementId: current.enforcementId,
            ownerOrganizationId: flags.ownerOrganizationId,
            isActive: flags.isActive
        };
        this.saving.set(true);
        this.error.set(null);
        const id = this.brandId();
        const request = id ? this.brands.update(id, body) : this.brands.create(body);
        request.subscribe({
            next: (brand) => this.afterBrandSave(brand),
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not save the brand.'));
            }
        });
    }

    uploadDocument(): void {
        const id = this.brandId();
        if (!id || !this.documentFile || this.documentError()) {
            this.documentError.set(this.documentError() || 'Choose a document.');
            return;
        }
        this.saving.set(true);
        const documentFields = this.documentForm.getRawValue();
        this.brands.uploadDocument(id, this.documentFile, documentFields.kind, documentFields.expiresOn || null).subscribe({
            next: () => {
                this.documentFile = null;
                this.documentForm.controls.expiresOn.setValue('');
                this.saving.set(false);
                this.notice.set('Document saved.');
                this.loadDocuments(id);
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not upload the document.'));
            }
        });
    }

    removeDocument(document: BrandDocument): void {
        const id = this.brandId();
        if (!id || !window.confirm(`Delete ${document.fileName}?`)) {
            return;
        }
        this.brands.deleteDocument(id, document.id).subscribe({
            next: () => this.loadDocuments(id),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the document.'))
        });
    }

    saveAuthorization(): void {
        const id = this.brandId();
        const storeId = this.authStoreId();
        if (!id || !storeId) {
            this.error.set('Choose a seller store for the authorization.');
            return;
        }
        this.saving.set(true);
        this.brands
            .saveAuthorization(id, {
                storeId,
                authorizationType: this.authForm.controls.type.value,
                documentId: this.authForm.controls.documentId.value,
                approvalStatus: Number(this.authForm.controls.status.value),
                validFrom: this.authForm.controls.validFrom.value || null,
                validTo: this.authForm.controls.validTo.value || null,
                reviewNote: this.authForm.controls.note.value.trim() || null,
                isActive: this.authActive()
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.notice.set('Authorization saved.');
                    this.loadAuthorizations(id);
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the authorization.'));
                }
            });
    }

    removeAuthorization(row: BrandAuthorization): void {
        const id = this.brandId();
        if (!id || !window.confirm(`Remove authorization for ${row.storeName}?`)) {
            return;
        }
        this.brands.deleteAuthorization(id, row.id).subscribe({
            next: () => this.loadAuthorizations(id),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the authorization.'))
        });
    }

    private load(id: string): void {
        this.loading.set(true);
        this.brands.get(id).subscribe({
            next: (brand) => {
                this.applyBrand(brand);
                this.loading.set(false);
                this.loadDocuments(id);
                this.loadAuthorizations(id);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load the brand.'));
            }
        });
    }

    private afterBrandSave(brand: Brand): void {
        const finish = () => {
            this.saving.set(false);
            this.logoFile = null;
            this.notice.set('Brand saved. Add documents and store authorizations below.');
            if (!this.brandId()) {
                void this.router.navigate(['/catalog/brands', brand.id], { replaceUrl: true });
            }
            this.applyBrand(brand);
            this.loadDocuments(brand.id);
            this.loadAuthorizations(brand.id);
        };
        if (!this.logoFile) {
            finish();
            return;
        }
        this.brands.uploadLogo(brand.id, this.logoFile).subscribe({
            next: (updated) => {
                brand = updated;
                finish();
            },
            error: (error) => {
                this.saving.set(false);
                this.applyBrand(brand);
                this.error.set(catalogErrorMessage(error, 'The brand was saved, but the logo was not uploaded.'));
                if (this.route.snapshot.paramMap.get('id') !== brand.id) {
                    void this.router.navigate(['/catalog/brands', brand.id], { replaceUrl: true });
                }
            }
        });
    }

    private applyBrand(brand: Brand): void {
        this.brandId.set(brand.id);
        this.details.patchValue(
            {
                name: brand.name,
                slug: brand.slug,
                description: brand.description ?? '',
                sortOrder: brand.sortOrder,
                enforcementId: brand.enforcementId
            },
            { emitEvent: false }
        );
        this.form.set({
            name: brand.name,
            slug: brand.slug,
            description: brand.description ?? '',
            sortOrder: brand.sortOrder,
            enforcementId: brand.enforcementId,
            ownerOrganizationId: brand.ownerOrganizationId,
            ownerOrganizationName: brand.ownerOrganizationName ?? '',
            isActive: brand.isActive,
            logoUrl: brand.logoUrl,
            approvalStatus: brand.approvalStatus
        });
    }

    onDocumentSearch(value: string): void {
        this.documentQuery.set(value);
        this.documentFirst.set(0);
        const id = this.brandId();
        if (id) {
            this.loadDocuments(id);
        }
    }

    onDocumentPage(event: PaginatorState): void {
        this.documentFirst.set(event.first ?? 0);
        this.documentRows.set(event.rows ?? 10);
        const id = this.brandId();
        if (id) {
            this.loadDocuments(id);
        }
    }

    onAuthorizationSearch(value: string): void {
        this.authorizationQuery.set(value);
        this.authorizationFirst.set(0);
        const id = this.brandId();
        if (id) {
            this.loadAuthorizations(id);
        }
    }

    onAuthorizationPage(event: PaginatorState): void {
        this.authorizationFirst.set(event.first ?? 0);
        this.authorizationRows.set(event.rows ?? 10);
        const id = this.brandId();
        if (id) {
            this.loadAuthorizations(id);
        }
    }

    private loadDocuments(id: string): void {
        const pageNo = Math.floor(this.documentFirst() / this.documentRows()) + 1;
        this.brands.documents(id, this.documentQuery(), pageNo, this.documentRows()).subscribe({
            next: (page) => {
                this.documents.set(page.items ?? []);
                this.documentTotal.set(page.totalCount ?? 0);
            },
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load documents.'))
        });
    }

    private loadAuthorizations(id: string): void {
        const pageNo = Math.floor(this.authorizationFirst() / this.authorizationRows()) + 1;
        this.brands.authorizations(id, this.authorizationQuery(), pageNo, this.authorizationRows()).subscribe({
            next: (page) => {
                this.authorizations.set(page.items ?? []);
                this.authorizationTotal.set(page.totalCount ?? 0);
            },
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load authorizations.'))
        });
    }
}
