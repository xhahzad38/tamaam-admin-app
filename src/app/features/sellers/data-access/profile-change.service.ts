import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse, PageResult } from '@/app/core/api/api.types';
import { inlineErrors } from '@/app/core/http/api-error';

/** API enum Domain.Enums.ProfileChangeStatus */
export enum ProfileChangeStatus {
    AwaitingVerification = 0,
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Cancelled = 4
}

export interface ProfileChange {
    id: string;
    organizationId: string;
    sellerName: string | null;
    storeName: string | null;
    field: number;
    fieldLabel: string;
    isBank: boolean;
    currentValue: string | null;
    requestedValue: string;
    reason: string | null;
    status: ProfileChangeStatus;
    statusName: string;
    reviewNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
}

/** Seller KYC change requests (`api/SellerOnboardingReview/profile-changes`, reviewers). */
@Injectable({ providedIn: 'root' })
export class ProfileChangeService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/api/SellerOnboardingReview/profile-changes`;

    list(status: ProfileChangeStatus | null, search: string, pageNo: number, pageSize: number): Observable<PageResult<ProfileChange>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        // Omitting `status` means "in review" (API default); an empty value binds to null = every status.
        params = params.set('status', status === null ? '' : status);
        if (search.trim()) params = params.set('searchText', search.trim());
        return this.http.get<PageResult<ProfileChange>>(this.url, { params, context: inlineErrors });
    }

    /** Requests per tab (`pending`, `approved`, `rejected`, `all`), after the same search as the list. */
    counts(search: string): Observable<Record<string, number>> {
        const params = search.trim() ? new HttpParams().set('searchText', search.trim()) : new HttpParams();
        return this.http.get<ApiResponse<Record<string, number>>>(`${this.url}/counts`, { params, context: inlineErrors }).pipe(map((response) => response.data ?? {}));
    }

    review(id: string, approve: boolean, note: string | null): Observable<ApiResponse<ProfileChange>> {
        return this.http.post<ApiResponse<ProfileChange>>(`${this.url}/${id}/review`, { approve, note }, { context: inlineErrors });
    }
}
