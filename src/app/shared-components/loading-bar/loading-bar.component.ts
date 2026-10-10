import { Component, inject } from '@angular/core';
import { LoadingBarService } from '@/app/shared/services/loading-bar.service';

@Component({
    selector: 'app-loading-bar',
    standalone: true,
    templateUrl: './loading-bar.component.html',
    styleUrls: ['./loading-bar.component.scss']
})
export class LoadingBarComponent {
    readonly loadingBar = inject(LoadingBarService);
}
