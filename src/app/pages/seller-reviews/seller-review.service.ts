import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { SKIP_ERROR_TOAST } from '@/app/_helpers/error.interceptor';
import { ApiResponse, PageResult } from '@/app/shared/models/api.types';
import { ReviewListItem, SectionDecision, SellerReview } from './seller-review.models';

export interface SellerDirectoryItem {
    organizationId: string;
    legalName: string;
    displayName: string;
    email: string;
    status: number;
    statusName: string;
    storeId: string | null;
    storeName: string | null;
    slug: string | null;
    isPublished: boolean;
    submittedAt: string | null;
    suspendedAt: string | null;
}

export interface SellerCenterStats {
    pendingReview: number;
    actionRequired: number;
    approved: number;
    suspended: number;
}

@Injectable({ providedIn: 'root' })
export class SellerReviewService {
    private readonly baseUrl = `${environment.apiUrl}/api/SellerOnboardingReview`;
    private readonly inlineErrors = new HttpContext().set(SKIP_ERROR_TOAST, true);

    constructor(private readonly http: HttpClient) {}

    list(queue: string, search: string, pageNo: number, pageSize: number): Observable<PageResult<ReviewListItem>> {
        let params = new HttpParams().set('queue', queue).set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return this.http.get<PageResult<ReviewListItem>>(this.baseUrl, { params, context: this.inlineErrors });
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

    stats(): Observable<SellerCenterStats> {
        return this.http
            .get<ApiResponse<SellerCenterStats>>(`${this.baseUrl}/stats`, { context: this.inlineErrors })
            .pipe(map((response) => response.data));
    }

    directory(search: string, status: string, pageNo: number, pageSize: number): Observable<PageResult<SellerDirectoryItem>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        if (status) {
            params = params.set('status', status);
        }
        return this.http.get<PageResult<SellerDirectoryItem>>(`${this.baseUrl}/directory`, { params, context: this.inlineErrors });
    }

    suspend(organizationId: string, note: string): Observable<SellerReview> {
        return this.http
            .post<ApiResponse<SellerReview>>(`${this.baseUrl}/${organizationId}/suspend`, { note }, { context: this.inlineErrors })
            .pipe(map((response) => response.data));
    }

    reinstate(organizationId: string): Observable<SellerReview> {
        return this.http
            .post<ApiResponse<SellerReview>>(`${this.baseUrl}/${organizationId}/reinstate`, {}, { context: this.inlineErrors })
            .pipe(map((response) => response.data));
    }
}
