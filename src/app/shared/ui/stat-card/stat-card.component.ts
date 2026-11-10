import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type StatTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/** A single KPI tile for dashboards. Pass `link` to make the whole tile clickable. */
@Component({
    selector: 'app-stat-card',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (link(); as target) {
            <a class="stat card" [routerLink]="target" [queryParams]="queryParams()">
                <span class="stat__icon" [attr.data-tone]="tone()"><i [class]="icon()"></i></span>
                <span class="stat__label">{{ label() }}</span>
                <span class="stat__value">{{ value() ?? '—' }}</span>
                @if (hint()) {
                    <span class="stat__hint">{{ hint() }}</span>
                }
            </a>
        } @else {
            <div class="stat card">
                <span class="stat__icon" [attr.data-tone]="tone()"><i [class]="icon()"></i></span>
                <span class="stat__label">{{ label() }}</span>
                <span class="stat__value">{{ value() ?? '—' }}</span>
                @if (hint()) {
                    <span class="stat__hint">{{ hint() }}</span>
                }
            </div>
        }
    `,
    styles: `
        :host {
            display: block;
        }
        .stat {
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-areas: 'label icon' 'value icon' 'hint hint';
            gap: var(--tm-space-1) var(--tm-space-3);
            height: 100%;
            margin: 0;
            color: inherit;
            text-decoration: none;
        }
        a.stat {
            transition: border-color 0.15s;
            border: 1px solid transparent;
        }
        a.stat:hover {
            border-color: var(--tm-primary);
        }
        .stat__label {
            grid-area: label;
            font-size: var(--tm-text-sm);
            color: var(--tm-text-muted);
        }
        .stat__value {
            grid-area: value;
            font-size: var(--tm-text-2xl);
            font-weight: 600;
            color: var(--tm-text);
        }
        .stat__hint {
            grid-area: hint;
            font-size: var(--tm-text-xs);
            color: var(--tm-text-muted);
        }
        .stat__icon {
            grid-area: icon;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: var(--tm-radius-md);
            background: var(--tm-surface-muted);
            color: var(--tm-text-muted);
        }
        .stat__icon[data-tone='primary'] {
            background: var(--tm-primary-soft);
            color: var(--tm-primary);
        }
        .stat__icon[data-tone='success'] {
            background: var(--tm-success-soft);
            color: var(--tm-success);
        }
        .stat__icon[data-tone='warning'] {
            background: var(--tm-warning-soft);
            color: var(--tm-warning);
        }
        .stat__icon[data-tone='danger'] {
            background: var(--tm-danger-soft);
            color: var(--tm-danger);
        }
        .stat__icon[data-tone='info'] {
            background: var(--tm-info-soft);
            color: var(--tm-info);
        }
    `
})
export class StatCardComponent {
    readonly label = input.required<string>();
    readonly value = input<string | number | null>(null);
    readonly icon = input('pi pi-chart-bar');
    readonly tone = input<StatTone>('neutral');
    readonly hint = input<string | null>(null);
    readonly link = input<unknown[] | string | null>(null);
    readonly queryParams = input<Record<string, unknown> | null>(null);
}
