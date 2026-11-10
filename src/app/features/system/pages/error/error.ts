import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FullPageMessageComponent } from '@/app/features/system/components/full-page-message.component';

@Component({
    selector: 'app-error-page',
    standalone: true,
    imports: [FullPageMessageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-full-page-message
        icon="pi pi-exclamation-triangle"
        tone="danger"
        title="Something went wrong"
        message="An unexpected error stopped this page from loading. Please try again in a moment."
    />`
})
export class ErrorPage {}
