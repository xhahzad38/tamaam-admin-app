import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { errorMessage } from '@/app/core/http/api-error';
import { AccountService, NotificationMatrix } from '@/app/features/account/data-access/account.service';
import { ErrorStateComponent, LoadingStateComponent, NoticeComponent } from '@/app/shared/ui/state/state.components';

/** "Notifications" tab: which events reach you on which channel. Rows and channels come from the API. */
@Component({
    selector: 'app-notification-settings',
    standalone: true,
    imports: [FormsModule, ButtonModule, CheckboxModule, TagModule, TooltipModule, ErrorStateComponent, LoadingStateComponent, NoticeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card matrix-card">
            @if (loading()) {
                <div class="p-5"><app-loading-state [rows]="6" /></div>
            } @else if (loadError(); as message) {
                <div class="p-5"><app-error-state [message]="message" (retry)="load()" /></div>
            } @else if (matrix(); as m) {
                <div class="overflow-x-auto">
                    <table class="matrix">
                        <thead>
                            <tr>
                                <th class="matrix__event">Event</th>
                                @for (c of m.channels; track c.key) {
                                    <th class="matrix__channel">
                                        {{ c.label }}
                                        @if (!c.available) {
                                            <p-tag value="Coming soon" severity="secondary" class="ml-1" />
                                        }
                                    </th>
                                }
                            </tr>
                        </thead>
                        <tbody>
                            @for (e of m.events; track e.key) {
                                <tr>
                                    <td class="matrix__event">
                                        <span class="matrix__label">{{ e.label }}</span>
                                        @if (!e.live) {
                                            <p-tag value="Not live yet" severity="secondary" class="ml-2" pTooltip="You'll get these once this part of Tamaam launches." />
                                        }
                                        <span class="matrix__desc">{{ e.description }}</span>
                                    </td>
                                    @for (c of m.channels; track c.key) {
                                        @let cell = e.channels[c.key];
                                        <td class="matrix__cell">
                                            <p-checkbox
                                                [binary]="true"
                                                [ngModel]="cell.value"
                                                (ngModelChange)="set(e.key, c.key, $event)"
                                                [disabled]="cell.locked || !cell.available"
                                                [ariaLabel]="e.label + ' by ' + c.label"
                                                [pTooltip]="cell.locked ? 'Always sent' : !cell.available ? 'Not available yet' : ''"
                                            />
                                        </td>
                                    }
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <div class="matrix__foot">
                    <p-button label="Save preferences" icon="pi pi-check" [loading]="saving()" [disabled]="!dirty()" (onClick)="save()" />
                    <span class="text-sm text-muted-color">{{ footnote() }}</span>
                    @if (notice(); as message) {
                        <app-notice [message]="message" />
                    }
                    @if (error(); as message) {
                        <app-error-state [message]="message" [retryable]="false" />
                    }
                </div>
            }
        </div>
    `,
    styles: `
        .matrix-card {
            padding: 0;
            overflow: hidden;
        }
        .matrix {
            width: 100%;
            border-collapse: collapse;
        }
        .matrix th {
            padding: var(--tm-space-3) var(--tm-space-4);
            background: var(--tm-table-header-bg);
            color: var(--tm-table-header-text);
            border-bottom: 1px solid var(--tm-table-header-border);
            font-size: var(--tm-text-sm);
            font-weight: 600;
            white-space: nowrap;
        }
        .matrix td {
            padding: var(--tm-space-3) var(--tm-space-4);
            border-bottom: 1px solid var(--tm-border);
        }
        .matrix tbody tr:hover {
            background: var(--p-content-hover-background);
        }
        .matrix__event {
            text-align: left;
            min-width: 16rem;
        }
        .matrix__channel,
        .matrix__cell {
            width: 9rem;
            text-align: center;
        }
        .matrix__label {
            color: var(--tm-text);
        }
        .matrix__desc {
            display: block;
            font-size: var(--tm-text-xs);
            color: var(--tm-text-muted);
        }
        .matrix__foot {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--tm-space-3);
            padding: var(--tm-space-4) var(--tm-space-5);
        }
    `
})
export class NotificationSettingsComponent implements OnInit {
    private readonly account = inject(AccountService);

    readonly matrix = signal<NotificationMatrix | null>(null);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal(false);
    readonly dirty = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);

    readonly footnote = computed(() => {
        const locked = (this.matrix()?.events ?? []).filter((e) => Object.values(e.channels).some((c) => c.locked)).map((e) => e.label.toLowerCase());
        return locked.length ? `Always sent: ${locked.join(', ')}.` : 'Choose how you want to hear about each event.';
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.account.notificationMatrix().subscribe({
            next: (matrix) => {
                this.matrix.set(matrix);
                this.dirty.set(false);
                this.loading.set(false);
            },
            error: (err) => {
                this.loadError.set(errorMessage(err, 'Could not load your notification settings.'));
                this.loading.set(false);
            }
        });
    }

    set(eventKey: string, channel: string, value: boolean): void {
        this.matrix.update((m) =>
            m ? { ...m, events: m.events.map((e) => (e.key === eventKey ? { ...e, channels: { ...e.channels, [channel]: { ...e.channels[channel], value } } } : e)) } : m
        );
        this.dirty.set(true);
        this.notice.set(null);
    }

    save(): void {
        const m = this.matrix();
        if (!m || this.saving()) return;
        const events: Record<string, Record<string, boolean>> = {};
        for (const e of m.events) {
            events[e.key] = Object.fromEntries(Object.entries(e.channels).filter(([, c]) => !c.locked && c.available).map(([k, c]) => [k, c.value]));
        }
        this.saving.set(true);
        this.error.set(null);
        this.account.saveNotificationMatrix(events).subscribe({
            next: (saved) => {
                this.matrix.set(saved);
                this.dirty.set(false);
                this.saving.set(false);
                this.notice.set('Notification preferences saved.');
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(errorMessage(err, 'Could not save your notification preferences.'));
            }
        });
    }
}
