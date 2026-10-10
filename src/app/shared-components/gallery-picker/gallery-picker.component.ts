import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { GalleryImage, GalleryModuleType, GalleryService } from '@/app/pages/service/gallery.service';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';

@Component({
    selector: 'app-gallery-picker',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, FileUploadModule, PaginatorModule, ToastModule, SearchControlComponent],
    templateUrl: './gallery-picker.component.html',
    styleUrls: ['./gallery-picker.component.scss'],
    providers: [MessageService]
})
export class GalleryPickerComponent implements OnInit, OnChanges, OnDestroy {
    @ViewChild('fileUpload') fileUpload?: FileUpload;

    @Input() visible = false;
    @Input() multiple = false;
    @Input() moduleType: GalleryModuleType = 'Product';
    @Input() selectedIds: string[] = [];
    @Input() selectedImages: GalleryImage[] = [];
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirmed = new EventEmitter<GalleryImage[]>();

    images = signal<GalleryImage[]>([]);
    totalCount = signal(0);
    first = signal(0);
    pageSize = signal(12);
    loading = signal(false);
    uploading = signal(false);
    showUpload = signal(false);

    pageNumber = 1;
    searchText = '';
    private searchTimeout?: ReturnType<typeof setTimeout>;
    private selected = new Map<string, GalleryImage>();

    constructor(
        private readonly galleryService: GalleryService,
        private readonly messageService: MessageService,
        private readonly host: ElementRef<HTMLElement>
    ) {}

    ngOnInit(): void {
        document.body.appendChild(this.host.nativeElement);
    }

    ngOnDestroy(): void {
        this.host.nativeElement.remove();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.selected.clear();
            for (const image of this.selectedImages) {
                this.selected.set(image.id, image);
            }
            this.showUpload.set(false);
            this.searchText = '';
            this.pageNumber = 1;
            this.first.set(0);
            this.loadImages();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.visible) {
            this.close();
        }
    }

    imageUrl(image: GalleryImage): string {
        return this.galleryService.resolveImageUrl(image.baseUrl);
    }

    isSelected(id: string): boolean {
        return this.selected.has(id);
    }

    toggle(image: GalleryImage): void {
        if (this.multiple) {
            if (this.selected.has(image.id)) {
                this.selected.delete(image.id);
            } else {
                this.selected.set(image.id, image);
            }
            return;
        }

        this.selected.clear();
        this.selected.set(image.id, image);
    }

    onSearchChange(keyword: string): void {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchText = keyword;
            this.pageNumber = 1;
            this.first.set(0);
            this.loadImages();
        }, 300);
    }

    onPageChange(event: PaginatorState): void {
        const first = event.first ?? 0;
        const rows = event.rows ?? this.pageSize();
        this.first.set(first);
        this.pageSize.set(rows);
        this.pageNumber = Math.floor(first / rows) + 1;
        this.loadImages();
    }

    onUpload(event: FileUploadHandlerEvent): void {
        if (!event.files?.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No files',
                detail: 'Choose at least one image to upload.'
            });
            return;
        }

        const formData = new FormData();
        for (const file of event.files) {
            formData.append('Files', file, file.name);
        }
        formData.append('ModuleType', this.moduleType);

        this.uploading.set(true);
        this.galleryService.uploadImages(formData).subscribe({
            next: (response) => {
                this.uploading.set(false);
                if (!response.succeeded) {
                    return;
                }

                this.fileUpload?.clear();
                this.showUpload.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Uploaded',
                    detail: 'Image added to the gallery. Select it below.'
                });
                this.pageNumber = 1;
                this.first.set(0);
                this.loadImages(response.data ?? []);
            },
            error: () => this.uploading.set(false)
        });
    }

    confirm(): void {
        const selected = this.orderedSelection();
        if (selected.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No image selected',
                detail: this.multiple ? 'Select at least one image, or upload a new one.' : 'Select an image, or upload a new one.'
            });
            return;
        }

        this.confirmed.emit(selected);
        this.close();
    }

    close(): void {
        this.visibleChange.emit(false);
    }

    get selectedCount(): number {
        return this.selected.size;
    }

    private loadImages(autoSelectIds: string[] = []): void {
        this.loading.set(true);
        this.galleryService.getImages(this.pageNumber, this.pageSize(), this.searchText).subscribe({
            next: (response) => {
                const items = response.items ?? [];
                this.images.set(items);
                this.totalCount.set(response.totalCount ?? 0);
                this.hydrateSelection(items, autoSelectIds);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    private hydrateSelection(items: GalleryImage[], autoSelectIds: string[]): void {
        const byId = new Map(items.map((image) => [image.id, image]));

        for (const id of this.selectedIds) {
            const match = byId.get(id);
            if (match && !this.selected.has(id)) {
                this.selected.set(id, match);
            }
        }

        for (const id of autoSelectIds) {
            const match = byId.get(id);
            if (!match) {
                continue;
            }
            if (!this.multiple) {
                this.selected.clear();
            }
            this.selected.set(id, match);
        }
    }

    private orderedSelection(): GalleryImage[] {
        const currentPage = this.images();
        const ordered: GalleryImage[] = [];

        for (const id of this.selectedIds) {
            const image = this.selected.get(id);
            if (image) {
                ordered.push(image);
            }
        }

        for (const image of currentPage) {
            if (this.selected.has(image.id) && !ordered.some((item) => item.id === image.id)) {
                ordered.push(image);
            }
        }

        for (const image of this.selected.values()) {
            if (!ordered.some((item) => item.id === image.id)) {
                ordered.push(image);
            }
        }

        return ordered;
    }
}
