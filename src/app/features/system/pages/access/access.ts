import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FullPageMessageComponent } from '@/app/features/system/components/full-page-message.component';

@Component({
    selector: 'app-access',
    standalone: true,
    imports: [FullPageMessageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-full-page-message
        code="403"
        icon="pi pi-lock"
        tone="warning"
        title="You don't have access to this page"
        message="Your account doesn't have the role this page needs. Ask an administrator to grant it, or sign in with another account."
    />`
})
export class AccessPage {}
