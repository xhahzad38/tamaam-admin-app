import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem, TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TreeTableModule } from 'primeng/treetable';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { catalogErrorMessage, catalogMediaUrl } from '../catalog.util';
import { CategoryNode } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-tree',
    standalone: true,
    imports: [RouterLink, BreadCrumbComponent, ButtonModule, TagModule, TreeTableModule],
    templateUrl: './category-tree.html'
})
export class CategoryTreePage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly router = inject(Router);

    readonly tree = signal<CategoryNode[]>([]);
    readonly nodes = computed<TreeNode[]>(() => this.toNodes(this.tree()));
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly crumbs: MenuItem[] = [{ label: 'Categories' }];
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

    openForm(parentCategoryId: string | null = null): void {
        void this.router.navigate(['/catalog/categories/new'], {
            queryParams: parentCategoryId ? { parent: parentCategoryId } : {}
        });
    }

    openEdit(id: string): void {
        void this.router.navigate(['/catalog/categories', id, 'edit']);
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

    private toNodes(nodes: CategoryNode[]): TreeNode[] {
        return nodes.map((node) => ({
            key: node.id,
            data: node,
            expanded: true,
            children: this.toNodes(node.children ?? [])
        }));
    }
}
