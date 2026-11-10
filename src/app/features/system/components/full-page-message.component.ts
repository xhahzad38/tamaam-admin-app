import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { LogoComponent } from '@/app/shared/ui/logo/logo.component';
import { ThemeToggleComponent } from '@/app/shared/ui/theme-toggle/theme-toggle.component';

export type MessageTone = 'warning' | 'danger' | 'info';

/** Centered full-screen message used by the access-denied, error and not-found pages. */
@Component({
    selector: 'app-full-page-message',
    standalone: true,
    imports: [RouterLink, ButtonModule, LogoComponent, ThemeToggleComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-theme-toggle [floating]="true" />
        <main class="message">
            <app-logo [size]="40" />
            <span class="message__icon" [attr.data-tone]="tone()"><i [class]="icon()"></i></span>
            @if (code()) {
                <p class="message__code">{{ code() }}</p>
            }
            <h1 class="message__title">{{ title() }}</h1>
            <p class="message__text">{{ message() }}</p>
            <div class="message__actions">
                <p-button label="Go to home" icon="pi pi-home" [routerLink]="home()" />
                @if (signedIn()) {
                    <p-button label="Sign in as someone else" severity="secondary" [outlined]="true" (onClick)="switchAccount()" />
                }
            </div>
        </main>
    `,
    styles: `
        .message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--tm-space-3);
            min-height: 100vh;
            min-height: 100dvh;
            padding: var(--tm-space-8) var(--tm-space-4);
            text-align: center;
            background: var(--tm-surface-muted);
        }
        .message__icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 4rem;
            height: 4rem;
            margin-top: var(--tm-space-6);
            border-radius: 999px;
            font-size: 1.75rem;
            background: var(--tm-info-soft);
            color: var(--tm-info);
        }
        .message__icon[data-tone='warning'] {
            background: var(--tm-warning-soft);
            color: var(--tm-warning);
        }
        .message__icon[data-tone='danger'] {
            background: var(--tm-danger-soft);
            color: var(--tm-danger);
        }
        .message__code {
            margin: 0;
            font-size: var(--tm-text-sm);
            font-weight: 700;
            letter-spacing: 0.08em;
            color: var(--tm-text-muted);
        }
        .message__title {
            margin: 0;
            font-size: var(--tm-text-2xl);
            font-weight: 700;
            color: var(--tm-text);
        }
        .message__text {
            margin: 0;
            max-width: 30rem;
            color: var(--tm-text-muted);
        }
        .message__actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: var(--tm-space-2);
            margin-top: var(--tm-space-4);
        }
    `
})
export class FullPageMessageComponent {
    private readonly auth = inject(AuthenticationService);

    readonly title = input.required<string>();
    readonly message = input.required<string>();
    readonly icon = input('pi pi-info-circle');
    readonly tone = input<MessageTone>('info');
    readonly code = input<string | null>(null);

    protected signedIn(): boolean {
        return !!this.auth.userValue;
    }

    protected home(): string {
        return this.auth.userValue ? this.auth.homeUrl() : '/auth/login';
    }

    protected switchAccount(): void {
        this.auth.logout();
    }
}
