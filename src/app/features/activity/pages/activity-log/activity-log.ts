import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ActivityLog, ActivityLogFilter, ActivityLogService } from '@/app/features/activity/data-access/activity-log.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/** Prefixes used by IActivityLogger.LogAsync across the API. */
const AREAS = [
    { label: 'Sign-in & accounts', value: 'Account.' },
    { label: 'Users', value: 'User.' },
    { label: 'Seller onboarding', value: 'Seller' },
    { label: 'Brands', value: 'Brand' },
    { label: 'Categories', value: 'Category' },
    { label: 'Products', value: 'Product' },
    { label: 'Offers', value: 'Offer' },
    { label: 'Inbound', value: 'Inbound' }
];

/** Audit trail of who did what, newest first. */
@Component({
    selector: 'app-activity-log',
    standalone: true,
    imports: [
        DatePipe,
        FormsModule,
        ButtonModule,
        DatePickerModule,
        SelectModule,
        TableModule,
        TagModule,
        TooltipModule,
        PageHeaderComponent,
        SearchControlComponent,
        TablePaginatorComponent,
        EmptyStateComponent,
        ErrorStateComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './activity-log.html'
})
export class ActivityLogPage {
    private readonly logs = inject(ActivityLogService);

    readonly crumbs: MenuItem[] = [{ label: 'System' }, { label: 'Activity log' }];
    readonly areas = AREAS;
    readonly today = new Date();

    readonly area = signal<string | null>(null);
    readonly range = signal<Date[] | null>(null);
    readonly expanded = signal<string | null>(null);

    readonly list = createPagedList<ActivityLog>((req) => this.logs.list(this.filter(req.search), req.pageNo, req.pageSize), {
        pageSize: 20,
        errorMessage: 'Could not load the activity log.'
    });

    setArea(value: string | null): void {
        this.area.set(value);
        this.list.reset();
    }

    setRange(value: Date[] | null): void {
        this.range.set(value);
        // Wait for both ends of the range (or a clear) before reloading.
        if (!value || value.every(Boolean)) {
            this.list.reset();
        }
    }

    clearFilters(): void {
        this.area.set(null);
        this.range.set(null);
        this.list.search('');
    }

    toggle(row: ActivityLog): void {
        this.expanded.update((id) => (id === row.id ? null : row.id));
    }

    severity(action: string): Severity {
        if (/delete|remove|reject|suspend|cancel/i.test(action)) return 'danger';
        if (/approve|reinstate|confirm|create|add/i.test(action)) return 'success';
        if (/login|signin/i.test(action)) return 'info';
        return 'secondary';
    }

    private filter(search: string): ActivityLogFilter {
        const [from, to] = this.range() ?? [];
        return { search, action: this.area(), entityType: null, from: from ?? null, to: to ?? from ?? null };
    }
}
