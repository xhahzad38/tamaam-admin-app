import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { AppNotification, NotificationService, relativeTime } from '@/app/core/services/notification.service';
import { errorMessage } from '@/app/core/http/api-error';

/** Top-bar bell: unread badge and the latest notifications in a popover. */
@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [RouterLink, ButtonModule, PopoverModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button type="button" class="layout-topbar-action bell" [attr.aria-label]="label()" (click)="toggle($event)">
            <i class="pi pi-bell"></i>
            @if (notifications.hasUnread()) {
                <span class="bell__badge">{{ notifications.unreadCount() > 99 ? '99+' : notifications.unreadCount() }}</span>
            }
        </button>

        <p-popover #panel [style]="{ width: 'min(24rem, 94vw)' }" appendTo="body">
            <div class="bell-panel">
                <div class="bell-panel__head">
                    <span class="font-semibold">Notifications</span>
                    @if (notifications.hasUnread()) {
                        <button type="button" class="link-button text-sm" (click)="markAll()">Mark all as read</button>
                    }
                </div>

                @if (loading()) {
                    <p class="bell-panel__empty">Loading…</p>
                } @else if (error(); as message) {
                    <p class="bell-panel__empty text-danger">{{ message }}</p>
                } @else if (items().length === 0) {
                    <div class="bell-panel__empty">
                        <i class="pi pi-bell-slash text-2xl"></i>
                        <span>You're all caught up.</span>
                    </div>
                } @else {
                    <ul class="bell-panel__list">
                        @for (item of items(); track item.id) {
                            <li>
                                <button type="button" class="bell-item" [class.bell-item--unread]="!item.isRead" (click)="open(item)">
                                    <span class="bell-item__dot" aria-hidden="true"></span>
                                    <span class="bell-item__text">
                                        <span class="bell-item__title">{{ item.title }}</span>
                                        <span class="bell-item__body">{{ item.body }}</span>
                                        <span class="bell-item__time">{{ ago(item.createdAt) }}</span>
                                    </span>
                                </button>
                            </li>
                        }
                    </ul>
                }

                <a routerLink="/notifications" class="bell-panel__all" (click)="panel.hide()">View all notifications</a>
            </div>
        </p-popover>
    `,
    styles: `
        .bell {
            position: relative;
        }
        .bell__badge {
            position: absolute;
            top: 2px;
            right: 0;
            min-width: 1.1rem;
            height: 1.1rem;
            padding: 0 0.3rem;
            border-radius: 999px;
            background: var(--tm-danger);
            color: #fff;
            font-size: 0.65rem;
            font-weight: 700;
            line-height: 1.1rem;
            text-align: center;
        }
        .bell-panel {
            display: flex;
            flex-direction: column;
            margin: calc(var(--tm-space-3) * -1);
        }
        .bell-panel__head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--tm-space-3) var(--tm-space-4);
            border-bottom: 1px solid var(--tm-border);
        }
        .bell-panel__list {
            max-height: 22rem;
            margin: 0;
            padding: 0;
            overflow-y: auto;
            list-style: none;
        }
        .bell-panel__empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--tm-space-2);
            margin: 0;
            padding: var(--tm-space-8) var(--tm-space-4);
            color: var(--tm-text-muted);
            text-align: center;
        }
        .bell-panel__all {
            padding: var(--tm-space-3);
            border-top: 1px solid var(--tm-border);
            font-size: var(--tm-text-sm);
            font-weight: 500;
            text-align: center;
        }
        .bell-item {
            display: flex;
            gap: var(--tm-space-3);
            width: 100%;
            padding: var(--tm-space-3) var(--tm-space-4);
            border: 0;
            border-bottom: 1px solid var(--tm-border);
            background: transparent;
            color: inherit;
            font: inherit;
            text-align: left;
            cursor: pointer;
        }
        .bell-item:hover {
            background: var(--p-content-hover-background);
        }
        .bell-item__dot {
            flex: none;
            width: 0.5rem;
            height: 0.5rem;
            margin-top: 0.45rem;
            border-radius: 999px;
        }
        .bell-item--unread .bell-item__dot {
            background: var(--tm-primary);
        }
        .bell-item__text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }
        .bell-item__title {
            font-size: var(--tm-text-sm);
            color: var(--tm-text);
        }
        .bell-item--unread .bell-item__title {
            font-weight: 600;
        }
        .bell-item__body {
            overflow: hidden;
            font-size: var(--tm-text-sm);
            color: var(--tm-text-muted);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        .bell-item__time {
            font-size: var(--tm-text-xs);
            color: var(--tm-text-muted);
        }
    `
})
export class NotificationBellComponent {
    protected readonly notifications = inject(NotificationService);
    private readonly router = inject(Router);
    private readonly panel = viewChild.required<Popover>('panel');

    readonly items = signal<AppNotification[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly ago = relativeTime;

    label(): string {
        const count = this.notifications.unreadCount();
        return count ? `Notifications, ${count} unread` : 'Notifications';
    }

    toggle(event: Event): void {
        this.panel().toggle(event);
        this.loading.set(true);
        this.error.set(null);
        this.notifications.list(1, 8).subscribe({
            next: (page) => {
                this.items.set(page.items ?? []);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(errorMessage(err, 'Could not load notifications.'));
                this.loading.set(false);
            }
        });
    }

    open(item: AppNotification): void {
        if (!item.isRead) {
            this.notifications.markRead(item.id).subscribe({ error: () => undefined });
            this.items.update((list) => list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
        }
        if (item.link) {
            this.panel().hide();
            void this.router.navigateByUrl(item.link);
        }
    }

    markAll(): void {
        this.notifications.markAllRead().subscribe({
            next: () => this.items.update((list) => list.map((n) => ({ ...n, isRead: true }))),
            error: () => undefined
        });
    }
}
