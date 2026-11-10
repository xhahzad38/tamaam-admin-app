import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LayoutService } from '@/app/layout/services/layout.service';

/** Light/dark switch. `floating` pins it to the corner on full-screen pages (login, errors, onboarding). */
@Component({
    selector: 'app-theme-toggle',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button
            type="button"
            class="layout-topbar-action theme-toggle"
            [class.theme-toggle--floating]="floating()"
            [attr.aria-label]="layout.isDarkTheme() ? 'Switch to light theme' : 'Switch to dark theme'"
            (click)="layout.switchTheme()"
        >
            <i class="pi" [class.pi-moon]="layout.isDarkTheme()" [class.pi-sun]="!layout.isDarkTheme()"></i>
        </button>
    `,
    styles: `
        .theme-toggle--floating {
            position: fixed;
            top: var(--tm-space-6);
            right: var(--tm-space-6);
            z-index: 10;
            border: 1px solid var(--tm-border);
            background: var(--tm-surface);
        }
    `
})
export class ThemeToggleComponent {
    readonly floating = input(false);
    protected readonly layout = inject(LayoutService);
}
