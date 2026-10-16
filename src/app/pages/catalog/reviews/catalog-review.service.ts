import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse, PageResult } from '@/app/shared/models/api.types';
import { catalogErrors } from '../catalog.util';
import { CatalogChangeDetail, CatalogChangeListItem, CatalogProductDetail, CatalogProductListItem } from './catalog-review.models';

@Injectable({ providedIn: 'root' })
export class CatalogReviewService {
    private readonly baseUrl = `${environment.apiUrl}/api/CatalogProduct`;

    constructor(private readonly http: HttpClient) {}

    products(queue: string, search: string, pageNo: number, pageSize: number): Observable<PageResult<CatalogProductListItem>> {
        return this.http.get<PageResult<CatalogProductListItem>>(this.baseUrl, {
            params: this.page(queue, search, pageNo, pageSize),
            context: catalogErrors
        });
    }

    product(id: string): Observable<CatalogProductDetail> {
        return this.http.get<ApiResponse<CatalogProductDetail>>(`${this.baseUrl}/${id}`, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    approve(id: string): Observable<CatalogProductDetail> {
        return this.http
            .post<ApiResponse<CatalogProductDetail>>(`${this.baseUrl}/${id}/approve`, {}, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    reject(id: string, note: string): Observable<CatalogProductDetail> {
        return this.http
            .post<ApiResponse<CatalogProductDetail>>(`${this.baseUrl}/${id}/reject`, { note }, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    changes(queue: string, search: string, pageNo: number, pageSize: number): Observable<PageResult<CatalogChangeListItem>> {
        return this.http.get<PageResult<CatalogChangeListItem>>(`${this.baseUrl}/change-requests`, {
            params: this.page(queue, search, pageNo, pageSize),
            context: catalogErrors
        });
    }

    change(id: string): Observable<CatalogChangeDetail> {
        return this.http
            .get<ApiResponse<CatalogChangeDetail>>(`${this.baseUrl}/change-requests/${id}`, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    reviewChange(id: string, approve: boolean, note: string): Observable<CatalogChangeDetail> {
        return this.http
            .post<ApiResponse<CatalogChangeDetail>>(`${this.baseUrl}/change-requests/${id}/review`, { approve, note }, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    private page(queue: string, search: string, pageNo: number, pageSize: number): HttpParams {
        let params = new HttpParams().set('queue', queue).set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return params;
    }
}
