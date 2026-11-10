import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { errorMessage } from '@/app/core/http/api-error';
import { ProfileChange, ProfileChangeService, ProfileChangeStatus } from '@/app/features/sellers/data-access/profile-change.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { SearchControlComponent } from '@/app/shared/ui/search-control/search-control.component';
import { EmptyStateComponent, ErrorStateComponent } from '@/app/shared/ui/state/state.components';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

/** Reviewers approve or reject sellers' requests to change verified KYC details. */
@Component({
    selector: 'app-profile-changes',
    standalone: true,
    imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink, ButtonModule, DialogModule, SelectButtonModule, TableModule, TagModule, TextareaModule, PageHeaderComponent, SearchControlComponent, TablePaginatorComponent, EmptyStateComponent, ErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './profile-changes.html'
})
export class ProfileChangesPage {
    private readonly changes = inject(ProfileChangeService);
    private readonly confirm = inject(ConfirmService);
    private readonly messages = inject(MessageService);

    readonly crumbs: MenuItem[] = [{ label: 'Sellers' }, { label: 'KYC change requests' }];
    readonly statuses = [
        { label: 'In review', value: ProfileChangeStatus.Pending },
        { label: 'Approved', value: ProfileChangeStatus.Approved },
        { label: 'Rejected', value: ProfileChangeStatus.Rejected },
        { label: 'All', value: null }
    ];
    readonly status = signal<ProfileChangeStatus | null>(ProfileChangeStatus.Pending);
    readonly list = createPagedList<ProfileChange>((req) => this.changes.list(this.status(), req.search, req.pageNo, req.pageSize), { pageSize: 20, errorMessage: 'Could not load change requests.' });

    readonly rejecting = signal<ProfileChange | null>(null);
    readonly note = new FormControl('', { nonNullable: true });
    readonly busy = signal<string | null>(null);
    readonly dialogError = signal<string | null>(null);

    setStatus(status: ProfileChangeStatus | null): void {
        this.status.set(status);
        this.list.reset();
    }

    severity(status: ProfileChangeStatus): Severity {
        return status === ProfileChangeStatus.Pending ? 'warn' : status === ProfileChangeStatus.Approved ? 'success' : status === ProfileChangeStatus.Rejected ? 'danger' : 'secondary';
    }

    isPending(row: ProfileChange): boolean {
        return row.status === ProfileChangeStatus.Pending;
    }

    async approve(row: ProfileChange): Promise<void> {
        const hold = row.isBank ? ' Payouts will be paused for 48 hours.' : '';
        if (!(await this.confirm.ask({ title: 'Approve change', message: `Change ${row.sellerName ?? 'this seller'}'s ${row.fieldLabel.toLowerCase()} to "${row.requestedValue}"?${hold}`, acceptLabel: 'Approve and apply' }))) return;
        this.decide(row, true, null);
    }

    openReject(row: ProfileChange): void {
        this.note.reset();
        this.dialogError.set(null);
        this.rejecting.set(row);
    }

    reject(): void {
        const row = this.rejecting();
        const note = this.note.value.trim();
        if (!row) return;
        if (!note) {
            this.dialogError.set('Tell the seller why, so they can fix it.');
            return;
        }
        this.decide(row, false, note);
    }

    private decide(row: ProfileChange, approve: boolean, note: string | null): void {
        this.busy.set(row.id);
        this.changes.review(row.id, approve, note).subscribe({
            next: (response) => {
                this.busy.set(null);
                this.rejecting.set(null);
                this.messages.add({ severity: 'success', summary: approve ? 'Approved' : 'Rejected', detail: response.message || 'Saved.', life: 3500 });
                this.list.reload();
            },
            error: (err) => {
                this.busy.set(null);
                const message = errorMessage(err, 'Could not save the decision.');
                if (this.rejecting()) this.dialogError.set(message);
                else this.messages.add({ severity: 'error', summary: 'Not saved', detail: message });
            }
        });
    }
}
