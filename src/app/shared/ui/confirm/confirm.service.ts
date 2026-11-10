import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
    title?: string;
    message: string;
    acceptLabel?: string;
    rejectLabel?: string;
    /** Red accept button, for deletes and other destructive actions. */
    danger?: boolean;
}

/**
 * Styled replacement for `window.confirm`. Rendered by the single
 * `<p-confirmdialog>` in AppComponent.
 *
 *   if (!(await this.confirm.ask({ message: `Delete ${brand.name}?`, danger: true }))) return;
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
    private readonly confirmation = inject(ConfirmationService);

    ask(options: ConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            this.confirmation.confirm({
                header: options.title ?? (options.danger ? 'Please confirm' : 'Confirm'),
                message: options.message,
                icon: options.danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
                acceptLabel: options.acceptLabel ?? (options.danger ? 'Delete' : 'Confirm'),
                rejectLabel: options.rejectLabel ?? 'Cancel',
                acceptButtonProps: { severity: options.danger ? 'danger' : 'primary' },
                rejectButtonProps: { severity: 'secondary', outlined: true },
                accept: () => resolve(true),
                reject: () => resolve(false),
                closeOnEscape: true
            });
        });
    }
}
