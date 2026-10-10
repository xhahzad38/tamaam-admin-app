import { AfterContentChecked, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { LoadingBarComponent } from './app/shared-components/loading-bar/loading-bar.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, ToastModule, LoadingBarComponent],
    template: `<app-loading-bar />
    <p-toast />
    <router-outlet></router-outlet>`
})
export class AppComponent  implements OnInit, OnDestroy, AfterContentChecked {

    constructor(
    private changeDetector: ChangeDetectorRef
  ) { }

    ngOnInit(): void {
        
    }
    ngOnDestroy(): void {
        
    }

    ngAfterContentChecked(): void {
        this.changeDetector.detectChanges();
    }
}