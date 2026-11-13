import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { LogoComponent } from '@/app/shared/ui/logo/logo.component';
import { ThemeToggleComponent } from '@/app/shared/ui/theme-toggle/theme-toggle.component';

export interface AuthStep {
    label: string;
    state?: 'done' | 'current';
}

/**
 * Split-screen frame for sign-in and sign-up: brand panel on the left, the form on the right.
 * `steps` render as a checklist of highlights, or as a progress stepper once any step has a state.
 * Project the form as content; add `authFooter` to an element to place it in the bottom bar.
 *
 * Styles live in assets/theme/_auth.scss (global), so the projected form can use the `auth-*` classes
 * (auth-form, auth-heading, auth-field, auth-btn, auth-alert...); every rule is scoped under them.
 */
@Component({
    selector: 'app-auth-shell',
    standalone: true,
    imports: [LogoComponent, ThemeToggleComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <div class="auth-page">
            <aside class="auth-aside" aria-label="About tamaam">
                <div class="auth-brand auth-brand--light">
                    <app-logo [size]="36" />
                    <span class="auth-brand__name">tamaam</span>
                    <span class="auth-brand__tag">{{ tag() }}</span>
                </div>

                <div class="auth-aside__body">
                    <p class="auth-aside__kicker">{{ kicker() }}</p>
                    <h2 class="auth-aside__title">{{ title() }}</h2>
                    @if (lead()) {
                        <p class="auth-aside__lead">{{ lead() }}</p>
                    }

                    @if (steps().length) {
                        <ol class="auth-steps" [class.auth-steps--progress]="isProgress()">
                            @for (step of steps(); track step.label; let i = $index) {
                                <li [class.is-current]="step.state === 'current'" [class.is-done]="step.state === 'done'" [attr.aria-current]="step.state === 'current' ? 'step' : null">
                                    <span class="auth-steps__marker" aria-hidden="true">
                                        @if (!isProgress() || step.state === 'done') {
                                            <i class="pi pi-check"></i>
                                        } @else {
                                            {{ i + 1 }}
                                        }
                                    </span>
                                    <span class="auth-steps__label">{{ step.label }}</span>
                                </li>
                            }
                        </ol>
                    }
                </div>

                <p class="auth-aside__legal">&copy; {{ year }} Tamaam. All rights reserved.</p>
            </aside>

            <main class="auth-main">
                <header class="auth-main__header">
                    <div class="auth-brand auth-brand--compact">
                        <app-logo [size]="32" />
                        <span class="auth-brand__name">tamaam</span>
                        <span class="auth-brand__tag">{{ tag() }}</span>
                    </div>
                    <app-theme-toggle />
                </header>

                <div class="auth-main__body">
                    <div class="auth-panel">
                        <ng-content />
                    </div>
                </div>

                <footer class="auth-main__footer">
                    <span><i class="pi pi-globe" aria-hidden="true"></i> English</span>
                    <ng-content select="[authFooter]" />
                </footer>
            </main>
        </div>
    `
})
export class AuthShellComponent {
    readonly kicker = input.required<string>();
    readonly title = input.required<string>();
    readonly lead = input<string | null>(null);
    readonly tag = input.required<string>();
    readonly steps = input<AuthStep[]>([]);

    protected readonly isProgress = computed(() => this.steps().some((step) => !!step.state));
    protected readonly year = new Date().getFullYear();
}
