import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SearchControlComponent } from '@/app/shared-components/search-control/search-control.component';
import { SelectControlComponent } from '@/app/shared-components/select-control/select-control.component';
import { catalogErrorMessage } from '../catalog.util';
import { CategoryCommission, CategoryOption, flattenCategories, fulfillmentLabel } from './category.models';
import { CategoryService } from './category.service';

@Component({
    selector: 'app-category-commission',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, BreadCrumbComponent, SearchControlComponent, SelectControlComponent, ButtonModule, PaginatorModule, TableModule],
    templateUrl: './category-commission.html'
})
export class CategoryCommissionPage implements OnInit {
    private readonly categories = inject(CategoryService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly crumbs: MenuItem[] = [
        { label: 'Categories', routerLink: '/catalog/categories' },
        { label: 'Commission' }
    ];
    readonly fulfillmentLabel = fulfillmentLabel;
    readonly categoryOptions = signal<CategoryOption[]>([]);
    readonly categoryId = new FormControl<string | null>(null);
    readonly rates = signal<CategoryCommission[]>([]);
    readonly query = signal('');
    readonly first = signal(0);
    readonly rows = signal(10);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        const preset = this.route.snapshot.queryParamMap.get('category');
        if (preset) {
            this.categoryId.setValue(preset, { emitEvent: false });
        }
        this.load();
        this.categories.tree().subscribe({
            next: (tree) => this.categoryOptions.set(flattenCategories(tree)),
            error: (error) => this.error.set(catalogErrorMessage(error, 'Could not load categories.'))
        });
        this.categoryId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.first.set(0);
            this.load();
        });
    }

    onSearch(value: string): void {
        this.query.set(value);
        this.first.set(0);
        this.load();
    }

    pageChange(event: PaginatorState): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.load();
    }

    openForm(rate?: CategoryCommission): void {
        void this.router.navigate(['/catalog/categories/commission/new'], {
            queryParams: {
                category: rate?.categoryId ?? this.categoryId.value,
                name: rate?.name ?? null,
                fulfillment: rate ? (rate.fulfillmentType === null || rate.fulfillmentType === undefined ? '' : String(rate.fulfillmentType)) : null,
                percent: rate?.commissionPercent ?? null,
                fee: rate?.closingFee ?? null
            }
        });
    }

    private loadFromCategories(): void {
        this.categories.tree().subscribe({
            next: (tree) => {
                const options = flattenCategories(tree);
                this.categoryOptions.set(options);
                if (!options.length) {
                    this.rates.set([]);
                    this.totalRecords.set(0);
                    this.loading.set(false);
                    return;
                }
                forkJoin(
                    options.map((option) =>
                        this.categories.get(option.id).pipe(
                            map((detail) =>
                                (detail.commissionRates ?? []).map((rate) => ({
                                    ...rate,
                                    categoryId: detail.id,
                                    categoryName: detail.name
                                }))
                            ),
                            catchError(() => of([] as CategoryCommission[]))
                        )
                    )
                ).subscribe((groups) => {
                    const search = this.query().trim().toLowerCase();
                    const categoryId = this.categoryId.value;
                    const all = groups.flat().filter((rate) => {
                        if (categoryId && rate.categoryId !== categoryId) {
                            return false;
                        }
                        if (!search) {
                            return true;
                        }
                        return [rate.name, rate.categoryName, rate.commissionPercent, rate.closingFee].some((value) =>
                            String(value ?? '').toLowerCase().includes(search)
                        );
                    });
                    this.totalRecords.set(all.length);
                    this.rates.set(all.slice(this.first(), this.first() + this.rows()));
                    this.loading.set(false);
                    this.error.set(null);
                });
            },
            error: (error) => {
                this.loading.set(false);
                this.rates.set([]);
                this.totalRecords.set(0);
                this.error.set(catalogErrorMessage(error, 'Could not load commission rates.'));
            }
        });
    }

    private load(): void {
        const pageNo = Math.floor(this.first() / this.rows()) + 1;
        this.loading.set(true);
        this.error.set(null);
        this.categories.commissions(this.query(), this.categoryId.value, pageNo, this.rows()).subscribe({
            next: (page) => {
                this.rates.set(page.items ?? []);
                this.totalRecords.set(page.totalCount ?? 0);
                this.loading.set(false);
            },
            error: (error) => {
                if ((error as { status?: number })?.status === 404) {
                    this.loadFromCategories();
                    return;
                }
                this.loading.set(false);
                this.rates.set([]);
                this.totalRecords.set(0);
                this.error.set(catalogErrorMessage(error, 'Could not load commission rates.'));
            }
        });
    }
}
