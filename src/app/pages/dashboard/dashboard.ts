import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SellerCenterStats, SellerReviewService } from '@/app/pages/seller-reviews/seller-review.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
    private readonly reviews = inject(SellerReviewService);

    readonly stats = signal<SellerCenterStats | null>(null);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.reviews.stats().subscribe({
            next: (stats) => this.stats.set(stats),
            error: () => this.error.set('Could not load seller counts.')
        });
    }
}
