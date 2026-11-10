import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FullPageMessageComponent } from '@/app/features/system/components/full-page-message.component';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [FullPageMessageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-full-page-message
        code="404"
        icon="pi pi-compass"
        title="Page not found"
        message="The page you're looking for doesn't exist or has moved."
    />`
})
export class NotFoundPage {}
