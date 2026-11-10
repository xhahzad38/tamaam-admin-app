import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { errorMessage } from '@/app/core/http/api-error';
import { Brand } from '@/app/features/catalog/data-access/brand.models';
import { BrandService } from '@/app/features/catalog/data-access/brand.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';
import { toMediaUrl } from '@/app/shared/utils/media.util';

/** Reference list page: createPagedList + page header + shared states + paginator. */
@Component({
    selector: 'app-brand-list',
    standalone: true,
    imports: [ButtonModule, TableModule, TagModule, PageHeaderComponent, SearchControlComponent, TablePaginatorComponent, ErrorStateComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './brand-list.html'
})
export class BrandListPage {
    private readonly brands = inject(BrandService);
    private readonly router = inject(Router);
    private readonly confirm = inject(ConfirmService);
    private readonly messages = inject(MessageService);

    readonly crumbs: MenuItem[] = [{ label: 'Brands' }];
    readonly mediaUrl = toMediaUrl;
    readonly list = createPagedList<Brand>((req) => this.brands.list(req.search, req.pageNo, req.pageSize), { errorMessage: 'Could not load brands.' });

    openForm(id?: string): void {
        void this.router.navigate(id ? ['/catalog/brands', id] : ['/catalog/brands/new']);
    }

    openDocuments(id: string): void {
        void this.router.navigate(['/catalog/brands/documents'], { queryParams: { brand: id } });
    }

    openAuthorizations(id: string): void {
        void this.router.navigate(['/catalog/brands/authorizations'], { queryParams: { brand: id } });
    }

    async remove(brand: Brand): Promise<void> {
        if (!(await this.confirm.ask({ message: `Delete ${brand.name}?`, danger: true }))) {
            return;
        }
        this.brands.delete(brand.id).subscribe({
            next: () => {
                this.messages.add({ severity: 'success', summary: 'Deleted', detail: `${brand.name} was deleted.`, life: 3000 });
                this.list.reload();
            },
            error: (error) => this.messages.add({ severity: 'error', summary: 'Not deleted', detail: errorMessage(error, 'Could not delete the brand.') })
        });
    }
}
