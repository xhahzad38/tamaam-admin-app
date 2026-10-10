import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { GalleryImage, GalleryModuleType, GalleryService } from '@/app/pages/service/gallery.service';
import { GalleryPickerComponent } from '@/app/shared-components/gallery-picker/gallery-picker.component';

@Component({
    selector: 'app-entity-image-field',
    standalone: true,
    imports: [CommonModule, ButtonModule, GalleryPickerComponent],
    templateUrl: './entity-image-field.component.html',
    styleUrls: ['./entity-image-field.component.scss']
})
export class EntityImageFieldComponent {
    @Input() label = 'Image';
    @Input() hint = '';
    @Input() multiple = false;
    @Input() moduleType: GalleryModuleType = 'Product';
    @Input() images: GalleryImage[] = [];
    @Output() imagesChange = new EventEmitter<GalleryImage[]>();

    pickerVisible = signal(false);

    constructor(private readonly galleryService: GalleryService) {}

    get selectedIds(): string[] {
        return this.images.map((image) => image.id);
    }

    imageUrl(image: GalleryImage): string {
        return this.galleryService.resolveImageUrl(image.baseUrl);
    }

    openPicker(event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();
        setTimeout(() => this.pickerVisible.set(true));
    }

    onConfirmed(selected: GalleryImage[]): void {
        this.imagesChange.emit(selected);
    }

    remove(image: GalleryImage): void {
        this.imagesChange.emit(this.images.filter((item) => item.id !== image.id));
    }

    move(image: GalleryImage, offset: number): void {
        const index = this.images.findIndex((item) => item.id === image.id);
        const next = index + offset;
        if (index < 0 || next < 0 || next >= this.images.length) {
            return;
        }

        const copy = [...this.images];
        const [moved] = copy.splice(index, 1);
        copy.splice(next, 0, moved);
        this.imagesChange.emit(copy);
    }
}
