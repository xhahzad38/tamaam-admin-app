import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * The three non-data states every screen needs, so they look the same everywhere.
 *
 *   @if (list.error(); as message) { <app-error-state [message]="message" (retry)="list.reload()" /> }
 *   <app-empty-state icon="pi pi-tags" title="No brands yet" message="Add your first brand." />
 *   <app-loading-state [rows]="5" />
 *
 * Inside a p-table `#emptymessage` template, wrap the empty state in `<td [attr.colspan]="n">`.
 */
@Component({
    selector: 'app-empty-state',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="state state--empty">
            <span class="state__icon"><i [class]="icon()"></i></span>
            <p class="state__title">{{ title() }}</p>
            @if (message()) {
                <p class="state__message">{{ message() }}</p>
            }
            <div class="state__actions"><ng-content /></div>
        </div>
    `,
    styleUrl: './state.scss'
})
export class EmptyStateComponent {
    readonly icon = input('pi pi-inbox');
    readonly title = input('Nothing here yet');
    readonly message = input<string | null>(null);
}

@Component({
    selector: 'app-error-state',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="state-banner" role="alert">
            <i class="pi pi-exclamation-circle state-banner__icon"></i>
            <span class="state-banner__text">{{ message() }}</span>
            @if (retryable()) {
                <p-button label="Try again" icon="pi pi-refresh" size="small" severity="danger" [text]="true" (onClick)="retry.emit()" />
            }
        </div>
    `,
    styleUrl: './state.scss'
})
export class ErrorStateComponent {
    readonly message = input.required<string>();
    /** Show the "Try again" button (listen to `(retry)`). */
    readonly retryable = input(true);
    readonly retry = output<void>();
}

/** Success / confirmation banner (e.g. "Saved."). */
@Component({
    selector: 'app-notice',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="state-banner state-banner--success" role="status">
            <i class="pi pi-check-circle state-banner__icon"></i>
            <span class="state-banner__text">{{ message() }}</span>
        </div>
    `,
    styleUrl: './state.scss'
})
export class NoticeComponent {
    readonly message = input.required<string>();
}

@Component({
    selector: 'app-loading-state',
    standalone: true,
    imports: [SkeletonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="state-skeleton" aria-busy="true" aria-live="polite">
            <span class="sr-only">Loading…</span>
            @for (row of rowList(); track $index) {
                <p-skeleton [height]="height()" />
            }
        </div>
    `,
    styleUrl: './state.scss'
})
export class LoadingStateComponent {
    readonly rows = input(3);
    readonly height = input('2.5rem');
    protected rowList(): number[] {
        return Array.from({ length: this.rows() }, (_, i) => i);
    }
}

export const STATE_COMPONENTS = [EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, NoticeComponent] as const;
