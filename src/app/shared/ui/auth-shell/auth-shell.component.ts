import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { LogoComponent } from '@/app/shared/ui/logo/logo.component';
import { ThemeToggleComponent } from '@/app/shared/ui/theme-toggle/theme-toggle.component';

export interface AuthStep {
    label: string;
    state?: 'done' | 'current';
}

/**
 * Split-screen frame for sign-in and sign-up: story panel with numbered steps on the left,
 * the form card on the right. Project the form as content; add `authFooter` to an element
 * to place it in the bottom bar.
 *
 * Styles live in assets/theme/_auth.scss (global), so the projected form can use the `partner-*` classes
 * (partner-form, partner-copy, partner-btn, partner-error...); every rule is scoped under them.
 */
@Component({
    selector: 'app-auth-shell',
    standalone: true,
    imports: [LogoComponent, ThemeToggleComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <app-theme-toggle [floating]="true" />
        <div class="partner-page partner-page--split">
            <aside class="partner-story">
                <p class="partner-story__kicker">{{ kicker() }}</p>
                <h2>{{ title() }}</h2>
                @if (lead()) {
                    <p class="partner-story__lead">{{ lead() }}</p>
                }
                <ol class="partner-steps">
                    @for (step of steps(); track step.label; let i = $index) {
                        <li [class.is-current]="step.state === 'current'" [class.is-done]="step.state === 'done'">
                            <span class="partner-steps__index">{{ i + 1 }}</span>
                            <span>{{ step.label }}</span>
                        </li>
                    }
                </ol>
            </aside>

            <div class="partner-card bg-surface-0 dark:bg-surface-900">
                <div class="partner-brand">
                    <app-logo [size]="40" class="partner-brand__mark" />
                    <div class="partner-brand__name">tamaam</div>
                    <div class="partner-brand__tag">{{ tag() }}</div>
                </div>
                <ng-content />
            </div>

            <div class="partner-page__footer">
                <span><i class="pi pi-globe"></i> English</span>
                <ng-content select="[authFooter]" />
            </div>
        </div>
    `
})
export class AuthShellComponent {
    readonly kicker = input.required<string>();
    readonly title = input.required<string>();
    readonly lead = input<string | null>(null);
    readonly tag = input.required<string>();
    readonly steps = input<AuthStep[]>([]);
}
