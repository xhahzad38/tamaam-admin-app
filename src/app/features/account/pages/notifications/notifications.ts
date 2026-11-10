import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { AppNotification, NotificationService, relativeTime } from '@/app/core/services/notification.service';
import { createPagedList } from '@/app/shared/data/paged-list';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingStateComponent } from '@/app/shared/ui/state/state.components';
import { TablePaginatorComponent } from '@/app/shared/ui/table-paginator/table-paginator.component';

/** All notifications for the signed-in user, with an unread filter. */
@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [DatePipe, FormsModule, RouterLink, ButtonModule, SelectButtonModule, PageHeaderComponent, TablePaginatorComponent, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page">
            <app-page-header title="Notifications" subtitle="Updates about your account, catalog and shipments." [crumbs]="crumbs">
                <p-button label="Settings" icon="pi pi-cog" severity="secondary" [outlined]="true" routerLink="/settings/notifications" />
                <p-button label="Mark all as read" icon="pi pi-check" [disabled]="!notifications.hasUnread()" (onClick)="markAll()" />
            </app-page-header>

            <div class="card">
                <div class="table-toolbar">
                    <p-selectbutton [options]="filters" [ngModel]="unreadOnly()" (ngModelChange)="setFilter($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" />
                </div>

                @if (list.error(); as message) {
                    <app-error-state [message]="message" (retry)="list.reload()" />
                } @else if (!list.loaded()) {
                    <app-loading-state [rows]="6" height="3.5rem" />
                } @else if (list.isEmpty()) {
                    <app-empty-state icon="pi pi-bell-slash" [title]="unreadOnly() ? 'No unread notifications' : 'No notifications yet'" message="We'll let you know here when something needs your attention." />
                } @else {
                    <ul class="note-list">
                        @for (item of list.items(); track item.id) {
                            <li class="note" [class.note--unread]="!item.isRead">
                                <span class="note__dot" aria-hidden="true"></span>
                                <div class="note__text">
                                    <p class="note__title">{{ item.title }}</p>
                                    <p class="note__body">{{ item.body }}</p>
                                    <time class="note__time" [attr.datetime]="item.createdAt" [title]="item.createdAt | date: 'medium'">{{ ago(item.createdAt) }}</time>
                                </div>
                                <div class="note__actions">
                                    @if (item.link) {
                                        <p-button label="Open" size="small" [text]="true" (onClick)="open(item)" />
                                    }
                                    @if (!item.isRead) {
                                        <p-button label="Mark read" size="small" [text]="true" severity="secondary" (onClick)="markRead(item)" />
                                    }
                                </div>
                            </li>
                        }
                    </ul>
                    <app-table-paginator [first]="list.first()" [rows]="list.rows()" [total]="list.total()" (pageChange)="list.page($event)" />
                }
            </div>
        </div>
    `,
    styles: `
        .note-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .note {
            display: flex;
            gap: var(--tm-space-3);
            align-items: flex-start;
            padding: var(--tm-space-4) 0;
            border-bottom: 1px solid var(--tm-border);
        }
        .note__dot {
            flex: none;
            width: 0.55rem;
            height: 0.55rem;
            margin-top: 0.45rem;
            border-radius: 999px;
        }
        .note--unread .note__dot {
            background: var(--tm-primary);
        }
        .note__text {
            flex: 1;
            min-width: 0;
        }
        .note__title {
            margin: 0;
            color: var(--tm-text);
        }
        .note--unread .note__title {
            font-weight: 600;
        }
        .note__body {
            margin: var(--tm-space-1) 0;
            font-size: var(--tm-text-sm);
            color: var(--tm-text-muted);
        }
        .note__time {
            font-size: var(--tm-text-xs);
            color: var(--tm-text-muted);
        }
        .note__actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--tm-space-1);
        }
    `
})
export class NotificationsPage {
    protected readonly notifications = inject(NotificationService);
    private readonly router = inject(Router);

    readonly crumbs: MenuItem[] = [{ label: 'Notifications' }];
    readonly filters = [
        { label: 'All', value: false },
        { label: 'Unread', value: true }
    ];
    readonly unreadOnly = signal(false);
    readonly ago = relativeTime;

    readonly list = createPagedList<AppNotification>((req) => this.notifications.list(req.pageNo, req.pageSize, this.unreadOnly()), {
        pageSize: 20,
        errorMessage: 'Could not load notifications.'
    });

    setFilter(unreadOnly: boolean): void {
        this.unreadOnly.set(unreadOnly);
        this.list.reset();
    }

    open(item: AppNotification): void {
        this.markRead(item);
        if (item.link) void this.router.navigateByUrl(item.link);
    }

    markRead(item: AppNotification): void {
        if (item.isRead) return;
        this.list.patch((n) => n.id === item.id, (n) => ({ ...n, isRead: true }));
        this.notifications.markRead(item.id).subscribe({ error: () => undefined });
    }

    markAll(): void {
        this.notifications.markAllRead().subscribe({
            next: () => (this.unreadOnly() ? this.list.reload() : this.list.patch(() => true, (n) => ({ ...n, isRead: true }))),
            error: () => undefined
        });
    }
}
