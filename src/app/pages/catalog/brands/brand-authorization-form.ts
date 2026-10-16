import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { APPROVAL_STATUS_LABEL, ApprovalStatus } from '@/app/pages/seller-reviews/seller-review.models';
import { SellerDirectoryItem, SellerReviewService } from '@/app/pages/seller-reviews/seller-review.service';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage } from '../catalog.util';
import { BRAND_AUTHORIZATION_TYPES, BrandDocument } from './brand.models';
import { BrandService } from './brand.service';

interface BrandOption {
    id: string;
    name: string;
}

@Component({
    selector: 'app-brand-authorization-form',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, BreadCrumbComponent, InputControlComponent, SelectControlComponent, ButtonModule, CheckboxModule],
    templateUrl: './brand-authorization-form.html'
})
export class BrandAuthorizationFormPage implements OnInit {
    private readonly brands = inject(BrandService);
    private readonly sellers = inject(SellerReviewService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private editingId: string | null = null;

    readonly crumbs: MenuItem[] = [
        { label: 'Brands', routerLink: '/catalog/brands' },
        { label: 'Brand authorization List', routerLink: '/catalog/brands/authorizations' },
        { label: 'Add authorization' }
    ];
    readonly authorizationTypes = BRAND_AUTHORIZATION_TYPES;
    readonly approvalOptions = [
        { label: 'Draft', value: ApprovalStatus.Draft },
        { label: 'Approved', value: ApprovalStatus.Approved },
        { label: 'Rejected', value: ApprovalStatus.Rejected }
    ];
    readonly brandOptions = signal<BrandOption[]>([]);
    readonly brandId = new FormControl<string | null>(null);
    readonly storeSearch = new FormControl('', { nonNullable: true });
    readonly fields = new FormGroup({
        type: new FormControl('AuthorizedReseller', { nonNullable: true }),
        documentId: new FormControl<string | null>(null),
        status: new FormControl(ApprovalStatus.Approved, { nonNullable: true }),
        validFrom: new FormControl('', { nonNullable: true }),
        validTo: new FormControl('', { nonNullable: true }),
        note: new FormControl('', { nonNullable: true })
    });
    readonly active = signal(true);
    readonly storeId = signal<string | null>(null);
    readonly storeName = signal('');
    readonly owners = signal<SellerDirectoryItem[]>([]);
    readonly documents = signal<BrandDocument[]>([]);
    readonly heading = signal('Add authorization');
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        this.editingId = params.get('id');
        if (this.editingId) {
            this.heading.set('Edit authorization');
            this.crumbs[2] = { label: 'Edit authorization' };
        }
        const brand = params.get('brand');
        if (params.has('storeId')) {
            this.storeId.set(params.get('storeId'));
            this.storeName.set(params.get('storeName') ?? '');
            this.active.set(params.get('active') !== '0');
            this.fields.setValue({
                type: params.get('type') || 'AuthorizedReseller',
                documentId: params.get('documentId'),
                status: Number(params.get('status') ?? ApprovalStatus.Approved),
                validFrom: params.get('validFrom') ?? '',
                validTo: params.get('validTo') ?? '',
                note: params.get('note') ?? ''
            });
        }
        this.brands.list('', 1, 100).subscribe({
            next: (page) => {
                this.brandOptions.set((page.items ?? []).map((item) => ({ id: item.id, name: item.name })));
                if (brand) {
                    this.brandId.setValue(brand);
                }
            },
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load brands.'))
        });
        this.brandId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
            if (id) {
                this.brands.documents(id, '', 1, 100).subscribe({
                    next: (page) => this.documents.set(page.items ?? []),
                    error: () => this.documents.set([])
                });
            } else {
                this.documents.set([]);
            }
        });
    }

    searchStores(): void {
        this.sellers.directory(this.storeSearch.value, '', 1, 10).subscribe({
            next: (page) => this.owners.set(page.items ?? []),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not search sellers.'))
        });
    }

    chooseStore(owner: SellerDirectoryItem): void {
        if (!owner.storeId) {
            this.error.set('That seller does not have a store yet.');
            return;
        }
        this.storeId.set(owner.storeId);
        this.storeName.set(owner.storeName || owner.displayName || owner.legalName);
        this.owners.set([]);
    }

    close(): void {
        void this.router.navigate(['/catalog/brands/authorizations'], {
            queryParams: { brand: this.brandId.value || null }
        });
    }

    save(): void {
        const id = this.brandId.value;
        const storeId = this.storeId();
        if (!id || !storeId) {
            this.brandId.markAsTouched();
            this.error.set(id ? 'Choose a seller store.' : 'Choose a brand.');
            return;
        }
        const fields = this.fields.getRawValue();
        this.saving.set(true);
        this.error.set(null);
        this.notice.set(null);
        this.brands
            .saveAuthorization(id, {
                id: this.editingId,
                storeId,
                authorizationType: fields.type,
                documentId: fields.documentId,
                approvalStatus: Number(fields.status),
                validFrom: fields.validFrom || null,
                validTo: fields.validTo || null,
                reviewNote: fields.note.trim() || null,
                isActive: this.active()
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.notice.set('Authorization saved.');
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(catalogErrorMessage(error, 'Could not save the authorization.'));
                }
            });
    }
}
