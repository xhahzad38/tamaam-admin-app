import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { catalogErrorMessage, catalogMediaUrl } from '../catalog.util';
import { CATALOG_STATUS_LABEL, CatalogProductDetail, STRUCTURE_LABEL } from './catalog-review.models';
import { CatalogReviewService } from './catalog-review.service';

@Component({
    selector: 'app-product-review-detail',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, BreadCrumbComponent, InputControlComponent, ButtonModule],
    templateUrl: './product-review-detail.html'
})
export class ProductReviewDetailPage implements OnInit {
    private readonly reviews = inject(CatalogReviewService);
    private readonly route = inject(ActivatedRoute);

    readonly crumbs = signal<MenuItem[]>([{ label: 'Product review', routerLink: '/catalog/product-reviews' }, { label: 'Product' }]);
    readonly product = signal<CatalogProductDetail | null>(null);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly note = new FormControl('', { nonNullable: true });
    readonly mediaUrl = catalogMediaUrl;
    readonly statusLabel = (value: number) => CATALOG_STATUS_LABEL[value] ?? 'Draft';
    readonly structureLabel = (value: number) => STRUCTURE_LABEL[value] ?? 'Simple';

    ngOnInit(): void {
        this.load();
    }

    approve(): void {
        const product = this.product();
        if (!product) {
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.reviews.approve(product.id).subscribe({
            next: (fresh) => {
                this.product.set(fresh);
                this.saving.set(false);
                this.notice.set('Product approved.');
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not approve the product.'));
            }
        });
    }

    reject(): void {
        const product = this.product();
        if (!product) {
            return;
        }
        if (!this.note.value.trim()) {
            this.error.set('Enter a note explaining the rejection.');
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.reviews.reject(product.id, this.note.value.trim()).subscribe({
            next: (fresh) => {
                this.product.set(fresh);
                this.saving.set(false);
                this.notice.set('Product rejected.');
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not reject the product.'));
            }
        });
    }

    private load(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            return;
        }
        this.reviews.product(id).subscribe({
            next: (product) => {
                this.product.set(product);
                this.crumbs.set([{ label: 'Product review', routerLink: '/catalog/product-reviews' }, { label: product.name }]);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load the product.'));
            }
        });
    }
}
