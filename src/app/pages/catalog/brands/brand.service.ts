import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse, PageResult } from '@/app/shared/models/api.types';
import { catalogErrors } from '../catalog.util';
import { Brand, BrandAuthorization, BrandAuthorizationWrite, BrandChangeRequest, BrandDocument, BrandWrite, EnforcementOption } from './brand.models';

@Injectable({ providedIn: 'root' })
export class BrandService {
    private readonly baseUrl = `${environment.apiUrl}/api/Brand`;

    constructor(private readonly http: HttpClient) {}

    list(search: string, pageNo: number, pageSize: number): Observable<PageResult<Brand>> {
        return this.http.get<PageResult<Brand>>(this.baseUrl, { params: this.pageParams(search, pageNo, pageSize), context: catalogErrors });
    }

    get(id: string): Observable<Brand> {
        return this.http.get<ApiResponse<Brand>>(`${this.baseUrl}/${id}`, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    documents(brandId: string, search: string, pageNo: number, pageSize: number): Observable<PageResult<BrandDocument>> {
        return this.http.get<PageResult<BrandDocument>>(`${this.baseUrl}/${brandId}/documents`, {
            params: this.pageParams(search, pageNo, pageSize),
            context: catalogErrors
        });
    }

    uploadDocument(brandId: string, file: File, documentKind: string, expiresOn: string | null): Observable<BrandDocument> {
        const body = new FormData();
        body.append('file', file);
        body.append('documentKind', documentKind);
        if (expiresOn) {
            body.append('expiresOn', expiresOn);
        }
        return this.http
            .post<ApiResponse<BrandDocument>>(`${this.baseUrl}/${brandId}/documents`, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    deleteDocument(brandId: string, documentId: string): Observable<boolean> {
        return this.http
            .delete<ApiResponse<boolean>>(`${this.baseUrl}/${brandId}/documents/${documentId}`, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    authorizations(brandId: string, search: string, pageNo: number, pageSize: number): Observable<PageResult<BrandAuthorization>> {
        return this.http.get<PageResult<BrandAuthorization>>(`${this.baseUrl}/${brandId}/authorizations`, {
            params: this.pageParams(search, pageNo, pageSize),
            context: catalogErrors
        });
    }

    saveAuthorization(brandId: string, body: BrandAuthorizationWrite): Observable<BrandAuthorization> {
        return this.http
            .post<ApiResponse<BrandAuthorization>>(`${this.baseUrl}/${brandId}/authorizations`, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    deleteAuthorization(brandId: string, authorizationId: string): Observable<boolean> {
        return this.http
            .delete<ApiResponse<boolean>>(`${this.baseUrl}/${brandId}/authorizations/${authorizationId}`, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    create(body: BrandWrite): Observable<Brand> {
        return this.http.post<ApiResponse<Brand>>(this.baseUrl, body, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    update(id: string, body: BrandWrite): Observable<Brand> {
        return this.http.put<ApiResponse<Brand>>(`${this.baseUrl}/${id}`, body, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    delete(id: string): Observable<boolean> {
        return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    uploadLogo(id: string, file: File): Observable<Brand> {
        const body = new FormData();
        body.append('file', file);
        return this.http.post<ApiResponse<Brand>>(`${this.baseUrl}/${id}/logo`, body, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    enforcements(): Observable<EnforcementOption[]> {
        return this.http
            .get<ApiResponse<EnforcementOption[]>>(`${environment.apiUrl}/api/LookupTypeValue/by-type/BrandEnforcement`, { context: catalogErrors })
            .pipe(map((response) => response.data ?? []));
    }

    changeRequests(search: string, pageNo: number, pageSize: number): Observable<PageResult<BrandChangeRequest>> {
        return this.http.get<PageResult<BrandChangeRequest>>(`${this.baseUrl}/change-requests`, {
            params: this.pageParams(search, pageNo, pageSize),
            context: catalogErrors
        });
    }

    review(id: string, approve: boolean): Observable<BrandChangeRequest> {
        return this.http
            .post<ApiResponse<BrandChangeRequest>>(`${this.baseUrl}/change-requests/${id}`, { approve }, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    private pageParams(search: string, pageNo: number, pageSize: number): HttpParams {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return params;
    }
}
