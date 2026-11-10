import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse } from '@/app/core/api/api.types';
import { inlineErrors } from '@/app/core/http/api-error';
import { FeeRateCard } from '@/app/shared/models/rate-card.models';

export interface PriceRange {
    globalMinPrice: number | null;
    globalMaxPrice: number | null;
}

/** `api/PricingAdmin` — fee rate card and per-SKU allowed price ranges (offer roles). */
@Injectable({ providedIn: 'root' })
export class PricingAdminService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/api/PricingAdmin`;

    rateCard(): Observable<FeeRateCard> {
        return this.http.get<ApiResponse<FeeRateCard>>(`${this.url}/rate-card`, { context: inlineErrors }).pipe(map((r) => r.data));
    }

    saveRateCard(card: FeeRateCard): Observable<FeeRateCard> {
        return this.http.put<ApiResponse<FeeRateCard>>(`${this.url}/rate-card`, card, { context: inlineErrors }).pipe(map((r) => r.data));
    }

    /**
     * Sets the allowed price range for a SKU. Active offers priced outside it are paused by the API.
     * Pass nulls to remove a limit.
     */
    setPriceRange(variantId: string, range: PriceRange): Observable<string> {
        return this.http
            .put<ApiResponse<string>>(`${this.url}/variants/${variantId}/price-range`, { variantId, ...range }, { context: inlineErrors })
            .pipe(map((r) => r.message || 'Price range saved'));
    }
}
