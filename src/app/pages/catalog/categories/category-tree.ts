import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TreeTableModule } from 'primeng/treetable';
import { catalogErrorMessage, catalogMediaUrl, readImageFile } from '../catalog.util';
import { CategoryNode, CategoryWrite, collectCategoryIds, findCategory, flattenCategories } from './category.models';
import { CategoryService } from './category.service';

interface CategoryForm {
    id: string | null;
    name: string;
    slug: string;
    description: string;
    parentCategoryId: string | null;
    sortOrder: number;
    badge: boolean;
    badgeText: string;
    requiresExtraApproval: boolean;
    isActive: boolean;
    imageUrl: string | null;
}

function emptyForm(parentCategoryId: string | null = null): CategoryForm {
    return {
        id: null,
        name: '',
        slug: '',
        description: '',
        parentCategoryId,
        sortOrder: 0,
        badge: false,
        badgeText: '',
        requiresExtraApproval: false,
        isActive: true,
        imageUrl: null
    };
}

@Component({
    selector: 'app-category-tree',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, CheckboxModule, DialogModule, InputTextModule, SelectModule, TagModule, TextareaModule, TreeTableModule],
    templateUrl: './category-tree.html'
})
export class CategoryTreePage implements OnInit {
    private readonly categories = inject(CategoryService);

    readonly tree = signal<CategoryNode[]>([]);
    readonly nodes = computed<TreeNode[]>(() => this.toNodes(this.tree()));
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly dialogOpen = signal(false);
    readonly imageError = signal<string | null>(null);
    readonly form = signal<CategoryForm>(emptyForm());
    readonly parentOptions = computed(() => {
        const exclude = new Set<string>();
        const editingId = this.form().id;
        if (editingId) {
            const node = findCategory(this.tree(), editingId);
            if (node) {
                collectCategoryIds(node, exclude);
            }
        }
        return flattenCategories(this.tree()).filter((option) => !exclude.has(option.id));
    });

    imageFile: File | null = null;
    readonly mediaUrl = catalogMediaUrl;

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.categories.tree().subscribe({
            next: (tree) => {
                this.tree.set(tree);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load categories.'));
            }
        });
    }

    openCreate(parentCategoryId: string | null = null): void {
        this.imageFile = null;
        this.imageError.set(null);
        this.form.set(emptyForm(parentCategoryId));
        this.dialogOpen.set(true);
    }

    openEdit(node: CategoryNode): void {
        this.imageFile = null;
        this.imageError.set(null);
        this.form.set({
            id: node.id,
            name: node.name,
            slug: node.slug,
            description: node.description ?? '',
            parentCategoryId: node.parentCategoryId,
            sortOrder: node.sortOrder,
            badge: node.badge,
            badgeText: node.badgeText ?? '',
            requiresExtraApproval: node.requiresExtraApproval,
            isActive: node.isActive,
            imageUrl: node.imageUrl
        });
        this.dialogOpen.set(true);
    }

    patch(partial: Partial<CategoryForm>): void {
        this.form.update((current) => ({ ...current, ...partial }));
    }

    onImage(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0] ?? null;
        const message = readImageFile(file);
        this.imageError.set(message);
        this.imageFile = message ? null : file;
    }

    save(): void {
        const current = this.form();
        if (this.saving() || this.imageError()) {
            return;
        }
        if (!current.name.trim()) {
            this.error.set('Name is required.');
            return;
        }

        const body: CategoryWrite = {
            name: current.name.trim(),
            slug: current.slug.trim() || null,
            description: current.description.trim() || null,
            parentCategoryId: current.parentCategoryId,
            sortOrder: Number(current.sortOrder) || 0,
            badge: current.badge,
            badgeText: current.badgeText.trim() || null,
            requiresExtraApproval: current.requiresExtraApproval,
            isActive: current.isActive
        };

        this.saving.set(true);
        this.error.set(null);
        const request = current.id ? this.categories.update(current.id, body) : this.categories.create(body);
        request.subscribe({
            next: (detail) => this.afterSave(detail.id),
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not save the category.'));
            }
        });
    }

    remove(node: CategoryNode): void {
        if (!window.confirm(`Delete ${node.name}? Categories with children or products cannot be deleted.`)) {
            return;
        }
        this.error.set(null);
        this.categories.delete(node.id).subscribe({
            next: () => this.load(),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not delete the category.'))
        });
    }

    private afterSave(id: string): void {
        if (!this.imageFile) {
            this.saving.set(false);
            this.dialogOpen.set(false);
            this.load();
            return;
        }
        this.categories.uploadImage(id, this.imageFile).subscribe({
            next: () => {
                this.imageFile = null;
                this.saving.set(false);
                this.dialogOpen.set(false);
                this.load();
            },
            error: (error) => {
                this.saving.set(false);
                this.form.update((form) => ({ ...form, id }));
                this.error.set(catalogErrorMessage(error, 'The category was saved, but the image was not uploaded.'));
                this.load();
            }
        });
    }

    private toNodes(nodes: CategoryNode[]): TreeNode[] {
        return nodes.map((node) => ({
            key: node.id,
            data: node,
            expanded: true,
            children: this.toNodes(node.children ?? [])
        }));
    }
}
