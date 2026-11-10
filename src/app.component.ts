import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { LoadingBarComponent } from '@/app/shared/ui/loading-bar/loading-bar.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, ToastModule, ConfirmDialogModule, LoadingBarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-loading-bar />
        <p-toast position="top-right" />
        <p-confirmdialog [style]="{ width: 'min(28rem, 92vw)' }" />
        <router-outlet />
    `
})
export class AppComponent {}
