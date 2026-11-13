import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface StatusTab {
    id: string;
    label: string;
    /** Badge number; hidden while null (e.g. counts still loading). */
    count?: number | null;
    /** Badge colour when the count is above zero. */
    tone?: 'neutral' | 'info' | 'warn' | 'danger';
}

/**
 * Underlined status tabs with counts, placed above a list's toolbar (same look as the seller "My catalog" tabs).
 *
 * <app-status-tabs [tabs]="tabs()" [active]="queue()" (activeChange)="selectQueue($event)" />
 */
@Component({
    selector: 'app-status-tabs',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="status-tabs" role="tablist" [attr.aria-label]="ariaLabel()">
            @for (tab of tabs(); track tab.id) {
                <button
                    type="button"
                    role="tab"
                    class="status-tabs__tab"
                    [class.is-active]="tab.id === active()"
                    [attr.aria-selected]="tab.id === active()"
                    (click)="tab.id !== active() && activeChange.emit(tab.id)"
                >
                    {{ tab.label }}
                    @if (tab.count !== null && tab.count !== undefined) {
                        <span class="status-tabs__count" [attr.data-tone]="tab.count > 0 ? (tab.tone ?? 'neutral') : 'neutral'">{{ tab.count }}</span>
                    }
                </button>
            }
        </div>
    `,
    styles: `
        :host {
            display: block;
        }
        .status-tabs {
            display: flex;
            gap: var(--tm-space-1);
            overflow-x: auto;
            margin-bottom: var(--tm-space-4);
            border-bottom: 1px solid var(--tm-border);
            scrollbar-width: none;
        }
        .status-tabs__tab {
            display: inline-flex;
            align-items: center;
            gap: var(--tm-space-2);
            margin-bottom: -1px;
            padding: var(--tm-space-3) var(--tm-space-4);
            border: 0;
            border-bottom: 2px solid transparent;
            background: transparent;
            font: inherit;
            font-weight: 500;
            white-space: nowrap;
            color: var(--tm-text-muted);
            cursor: pointer;
            transition:
                color 0.15s,
                border-color 0.15s;
        }
        .status-tabs__tab:hover {
            color: var(--tm-text);
        }
        .status-tabs__tab:focus-visible {
            outline: 2px solid var(--tm-primary);
            outline-offset: -2px;
            border-radius: var(--tm-radius-sm);
        }
        .status-tabs__tab.is-active {
            color: var(--tm-primary);
            border-bottom-color: var(--tm-primary);
            font-weight: 600;
        }
        .status-tabs__count {
            min-width: 1.5rem;
            padding: 0.05rem 0.45rem;
            border-radius: 999px;
            font-size: var(--tm-text-xs);
            font-weight: 600;
            text-align: center;
            font-variant-numeric: tabular-nums;
            color: var(--tm-text-muted);
            background: var(--tm-surface-sunken);
        }
        .is-active .status-tabs__count[data-tone='neutral'] {
            color: var(--tm-primary);
            background: var(--tm-primary-soft);
        }
        .status-tabs__count[data-tone='info'] {
            color: var(--tm-info);
            background: var(--tm-info-soft);
        }
        .status-tabs__count[data-tone='warn'] {
            color: var(--tm-warning);
            background: var(--tm-warning-soft);
        }
        .status-tabs__count[data-tone='danger'] {
            color: var(--tm-danger);
            background: var(--tm-danger-soft);
        }
    `
})
export class StatusTabsComponent {
    readonly tabs = input.required<readonly StatusTab[]>();
    readonly active = input.required<string>();
    readonly ariaLabel = input('Status');
    readonly activeChange = output<string>();
}
