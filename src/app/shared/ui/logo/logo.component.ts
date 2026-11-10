import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Tamaam mark: a rounded tile in the brand colour. Swap the SVG for the final logo. */
@Component({
    selector: 'app-logo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--p-primary-color)" />
            <path d="M9 10h14v3.2h-5.4V23h-3.2v-9.8H9z" fill="var(--p-primary-contrast-color)" />
        </svg>
    `,
    styles: `
        :host {
            display: inline-flex;
        }
    `
})
export class LogoComponent {
    readonly size = input(32);
}
