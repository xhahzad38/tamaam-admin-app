import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { APP_SHELL_CONFIG } from '@/app/core/config/app-shell.config';
import { LayoutService } from '@/app/layout/services/layout.service';
import { ThemeToggleComponent } from '@/app/shared/ui/theme-toggle/theme-toggle.component';
import { LogoComponent } from '@/app/shared/ui/logo/logo.component';
import { NotificationBellComponent } from './notification-bell';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, MenuModule, ThemeToggleComponent, LogoComponent, NotificationBellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="layout-topbar">
            <div class="layout-topbar-logo-container">
                <button class="layout-menu-button layout-topbar-action" aria-label="Toggle menu" (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>
                <a class="layout-topbar-logo" routerLink="/">
                    <app-logo />
                    <span>{{ productName }}</span>
                </a>
            </div>

            <div class="layout-topbar-actions">
                <app-theme-toggle />
                <app-notification-bell />
                <button type="button" class="topbar-user" aria-haspopup="menu" (click)="userMenu.toggle($event)">
                    <span class="topbar-user__avatar">{{ initials() }}</span>
                    <span class="topbar-user__name">{{ displayName() }}</span>
                    <i class="pi pi-chevron-down text-xs"></i>
                </button>
                <p-menu #userMenu [model]="menuItems()" [popup]="true" appendTo="body" />
            </div>
        </div>
    `,
    styles: `
        .topbar-user {
            display: inline-flex;
            align-items: center;
            gap: var(--tm-space-2);
            padding: var(--tm-space-1) var(--tm-space-2);
            border: 0;
            border-radius: var(--tm-radius-md);
            background: transparent;
            color: var(--tm-text);
            font: inherit;
            cursor: pointer;
        }
        .topbar-user:hover {
            background: var(--p-content-hover-background);
        }
        .topbar-user__avatar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2rem;
            height: 2rem;
            border-radius: 999px;
            background: var(--tm-primary-soft);
            color: var(--tm-primary);
            font-size: var(--tm-text-xs);
            font-weight: 700;
        }
        @media (max-width: 576px) {
            .topbar-user__name {
                display: none;
            }
        }
    `
})
export class AppTopbar {
    readonly layoutService = inject(LayoutService);
    private readonly auth = inject(AuthenticationService);
    readonly productName = inject(APP_SHELL_CONFIG).productName;

    readonly displayName = computed(() => {
        const user = this.auth.currentUser();
        return user?.fullName || user?.userName || user?.email || 'Account';
    });

    readonly initials = computed(() =>
        this.displayName()
            .split(/[\s@.]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]!.toUpperCase())
            .join('')
    );

    readonly menuItems = computed<MenuItem[]>(() => {
        const user = this.auth.currentUser();
        return [
            {
                label: user?.email ?? '',
                items: [
                    { label: 'Settings', icon: 'pi pi-cog', routerLink: ['/settings'] },
                    { label: 'Notifications', icon: 'pi pi-bell', routerLink: ['/notifications'] },
                    { separator: true },
                    { label: 'Sign out', icon: 'pi pi-sign-out', command: () => this.auth.logout() }
                ]
            }
        ];
    });
}
