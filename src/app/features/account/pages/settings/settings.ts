import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SETTINGS_COPY, SETTINGS_TABS, SettingsTab } from '@/app/features/account/settings-tabs';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { LoadingStateComponent } from '@/app/shared/ui/state/state.components';

const BUILT_IN: Record<'profile' | 'security' | 'notifications', SettingsTab> = {
    profile: {
        key: 'profile',
        label: 'My profile',
        icon: 'pi pi-user',
        component: () => import('@/app/features/account/components/profile-settings/profile-settings').then((m) => m.ProfileSettingsComponent)
    },
    security: {
        key: 'security',
        label: 'Security',
        icon: 'pi pi-shield',
        component: () => import('@/app/features/account/components/security-settings/security-settings').then((m) => m.SecuritySettingsComponent)
    },
    notifications: {
        key: 'notifications',
        label: 'Notifications',
        icon: 'pi pi-bell',
        component: () => import('@/app/features/account/components/notification-settings/notification-settings').then((m) => m.NotificationSettingsComponent)
    }
};

/**
 * /settings/:tab — tabbed settings shared by both apps. Apps add tabs through SETTINGS_TABS
 * (the seller adds Store profile and Business & bank after My profile).
 */
@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [NgComponentOutlet, RouterLink, PageHeaderComponent, LoadingStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page">
            <app-page-header [title]="copy.title" [subtitle]="copy.subtitle" [crumbs]="[{ label: 'Settings' }]" />

            <nav class="settings-tabs" aria-label="Settings sections">
                @for (t of tabs; track t.key) {
                    <a [routerLink]="['/settings', t.key]" class="settings-tabs__tab" [class.is-active]="t.key === active().key" [attr.aria-current]="t.key === active().key ? 'page' : null">
                        <i [class]="t.icon"></i>
                        <span>{{ t.label }}</span>
                    </a>
                }
            </nav>

            @if (body(); as component) {
                <ng-container *ngComponentOutlet="component" />
            } @else {
                <div class="card"><app-loading-state [rows]="5" /></div>
            }
        </div>
    `,
    styles: `
        .settings-tabs {
            display: flex;
            gap: var(--tm-space-1);
            overflow-x: auto;
            border-bottom: 1px solid var(--tm-border);
            scrollbar-width: thin;
        }
        .settings-tabs__tab {
            display: inline-flex;
            align-items: center;
            gap: var(--tm-space-2);
            margin-bottom: -1px;
            padding: var(--tm-space-3) var(--tm-space-4);
            border: 1px solid transparent;
            border-radius: var(--tm-radius-md) var(--tm-radius-md) 0 0;
            color: var(--tm-text-muted);
            font-weight: 500;
            white-space: nowrap;
            text-decoration: none;
        }
        .settings-tabs__tab:hover {
            color: var(--tm-primary);
        }
        .settings-tabs__tab.is-active {
            border-color: var(--tm-border);
            border-bottom-color: var(--tm-surface);
            background: var(--tm-surface);
            color: var(--tm-text);
        }
        .settings-tabs__tab.is-active i {
            color: var(--tm-primary);
        }
    `
})
export class SettingsPage {
    /** Route param `/settings/:tab`. */
    readonly tab = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('tab') ?? undefined)));

    readonly copy = inject(SETTINGS_COPY);
    readonly tabs: SettingsTab[] = [BUILT_IN.profile, ...inject(SETTINGS_TABS), BUILT_IN.security, BUILT_IN.notifications];
    readonly active = computed(() => this.tabs.find((t) => t.key === this.tab()) ?? this.tabs[0]);
    readonly body = signal<Type<unknown> | null>(null);

    constructor() {
        effect(() => {
            const tab = this.active();
            this.body.set(null);
            void tab.component().then((component) => {
                if (this.active() === tab) this.body.set(component);
            });
        });
    }
}
