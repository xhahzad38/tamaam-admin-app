import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { catalogErrorMessage, catalogMediaUrl } from '../catalog.util';
import { CatalogChangeDetail } from './catalog-review.models';
import { CatalogReviewService } from './catalog-review.service';

@Component({
    selector: 'app-change-request-detail',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, BreadCrumbComponent, InputControlComponent, ButtonModule],
    templateUrl: './change-request-detail.html'
})
export class ChangeRequestDetailPage implements OnInit {
    private readonly reviews = inject(CatalogReviewService);
    private readonly route = inject(ActivatedRoute);

    readonly crumbs = signal<MenuItem[]>([{ label: 'Catalog changes', routerLink: '/catalog/change-requests' }, { label: 'Request' }]);
    readonly request = signal<CatalogChangeDetail | null>(null);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly note = new FormControl('', { nonNullable: true });
    readonly mediaUrl = catalogMediaUrl;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            return;
        }
        this.reviews.change(id).subscribe({
            next: (request) => {
                this.request.set(request);
                this.crumbs.set([{ label: 'Catalog changes', routerLink: '/catalog/change-requests' }, { label: request.current.name }]);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not load the change request.'));
            }
        });
    }

    decide(approve: boolean): void {
        const request = this.request();
        if (!request) {
            return;
        }
        if (!approve && !this.note.value.trim()) {
            this.error.set('Enter a note explaining the rejection.');
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.reviews.reviewChange(request.id, approve, this.note.value.trim()).subscribe({
            next: (fresh) => {
                this.request.set(fresh);
                this.saving.set(false);
                this.notice.set(approve ? 'Change applied.' : 'Change rejected.');
            },
            error: (error) => {
                this.saving.set(false);
                this.error.set(catalogErrorMessage(error, 'Could not review the change.'));
            }
        });
    }
}
