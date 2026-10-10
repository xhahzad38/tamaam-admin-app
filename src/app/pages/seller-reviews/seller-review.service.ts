import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { SKIP_ERROR_TOAST } from '@/app/_helpers/error.interceptor';
import { ApiResponse } from '@/app/shared/models/api.types';
import { ReviewListItem, SectionDecision, SellerReview } from './seller-review.models';

@Injectable({ providedIn: 'root' })
export class SellerReviewService {
    private readonly baseUrl = `${environment.apiUrl}/api/SellerOnboardingReview`;
    private readonly inlineErrors = new HttpContext().set(SKIP_ERROR_TOAST, true);

    constructor(private readonly http: HttpClient) {}

    list(queue: string, search: string): Observable<ReviewListItem[]> {
        let params = new HttpParams().set('queue', queue);
        if (search.trim()) {
            params = params.set('search', search.trim());
        }
        return this.http
            .get<ApiResponse<ReviewListItem[]>>(this.baseUrl, { params, context: this.inlineErrors })
            .pipe(map((response) => response.data ?? []));
    }

    get(organizationId: string): Observable<SellerReview> {
        return this.http
            .get<ApiResponse<SellerReview>>(`${this.baseUrl}/${organizationId}`, { context: this.inlineErrors })
            .pipe(map((response) => response.data));
    }

    review(organizationId: string, section: number, decision: SectionDecision, note: string | null): Observable<SellerReview> {
        return this.http
            .post<ApiResponse<SellerReview>>(`${this.baseUrl}/${organizationId}/sections/${section}`, { decision, note }, { context: this.inlineErrors })
            .pipe(map((response) => response.data));
    }

    downloadDocument(organizationId: string, documentId: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/${organizationId}/documents/${documentId}/file`, {
            responseType: 'blob',
            context: this.inlineErrors
        });
    }
}
