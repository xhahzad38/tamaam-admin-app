import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CommerceService } from '../../pages/service/commerce.service';
import { GalleryService } from '../../pages/service/gallery.service';
import { WishlistService } from '../../pages/service/wishlist.service';

export interface ProductCardItem {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    salePrice: number;
    discount?: number;
    quantity?: number;
    brandName?: string;
    sellerName?: string;
    fulfillmentLabel?: string;
    currencyCode?: string;
    currencySymbol?: string;
    compareAtPrice?: number | null;
    dealPrice?: number | null;
    defaultVariantId?: string | null;
    hasVariants?: boolean;
    primaryImageUrl?: string | null;
}

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule],
    templateUrl: './product-card.component.html',
    styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
    @Input({ required: true }) product!: ProductCardItem;
    @Input() layout: 'list' | 'grid' = 'grid';
    @Input() showDivider = false;

    readonly adding = signal(false);
    readonly wishing = signal(false);

    private readonly gallery = inject(GalleryService);
    private readonly commerce = inject(CommerceService);
    private readonly wishlist = inject(WishlistService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService, { optional: true });

    imageUrl(): string {
        const url = this.product.primaryImageUrl;
        return url ? this.gallery.resolveImageUrl(url) : '';
    }

    categoryLabel(): string {
        return this.product.brandName || this.product.fulfillmentLabel || this.product.sellerName || '';
    }

    displayPrice(): number {
        return this.product.dealPrice ?? this.product.salePrice;
    }

    currency(): string {
        return this.product.currencySymbol || this.product.currencyCode || 'Rs';
    }

    inventoryStatus(): 'INSTOCK' | 'LOWSTOCK' | 'OUTOFSTOCK' {
        const qty = this.product.quantity;
        if (qty == null) {
            return 'INSTOCK';
        }
        if (qty <= 0) {
            return 'OUTOFSTOCK';
        }
        if (qty <= 5) {
            return 'LOWSTOCK';
        }
        return 'INSTOCK';
    }

    inventorySeverity(): 'success' | 'warn' | 'danger' {
        switch (this.inventoryStatus()) {
            case 'INSTOCK':
                return 'success';
            case 'LOWSTOCK':
                return 'warn';
            default:
                return 'danger';
        }
    }

    get outOfStock(): boolean {
        return this.inventoryStatus() === 'OUTOFSTOCK';
    }

    onBuyNow(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.product.id || this.outOfStock || this.adding()) {
            return;
        }
        if (this.product.hasVariants && this.product.slug) {
            this.router.navigate(['/store', this.product.slug]);
            return;
        }
        this.adding.set(true);
        this.commerce.addItem(this.product.id, 1, this.product.defaultVariantId).subscribe({
            next: (res) => {
                this.adding.set(false);
                if (res.succeeded) {
                    this.messages?.add({ severity: 'success', summary: 'Cart', detail: 'Added to cart' });
                }
            },
            error: () => this.adding.set(false)
        });
    }

    isWished(): boolean {
        return this.wishlist.has(this.product.id);
    }

    onWish(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.product.id || this.wishing()) {
            return;
        }
        this.wishing.set(true);
        this.wishlist.toggle(this.product.id, this.product.defaultVariantId).subscribe({
            next: (result) => {
                this.wishing.set(false);
                this.messages?.add({
                    severity: 'success',
                    summary: 'Wishlist',
                    detail: result.wished ? 'Added to wishlist' : 'Removed from wishlist'
                });
            },
            error: () => this.wishing.set(false)
        });
    }
}
