import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DataViewModule } from 'primeng/dataview';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { ProductCardComponent, ProductCardItem } from '../product-card/product-card.component';

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [CommonModule, FormsModule, DataViewModule, SelectButtonModule, ToastModule, ProductCardComponent],
    providers: [MessageService],
    templateUrl: './product-list.component.html',
    styleUrls: ['./product-list.component.scss'],
    host: {
        '[class.product-list--no-header]': '!showLayoutToggle'
    }
})
export class ProductListComponent implements OnChanges {
    @Input() products: ProductCardItem[] = [];
    @Input() layout: 'list' | 'grid' = 'grid';
    @Input() showLayoutToggle = true;
    @Input() columns: 3 | 4 = 3;

    viewLayout: 'list' | 'grid' = 'grid';
    readonly layoutOptions = ['list', 'grid'];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['layout'] && this.layout) {
            this.viewLayout = this.layout;
        }
    }

    gridItemClass(): string {
        return this.columns === 4
            ? 'col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 p-2'
            : 'col-span-12 sm:col-span-6 lg:col-span-4 p-2';
    }

    trackProduct(item: ProductCardItem, index: number): string {
        return item.id || item.slug || String(index);
    }
}

