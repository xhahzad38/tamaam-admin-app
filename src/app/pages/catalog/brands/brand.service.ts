import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse } from '@/app/shared/models/api.types';
import { catalogErrors } from '../catalog.util';
import { Brand, BrandChangeRequest, BrandWrite, EnforcementOption } from './brand.models';

@Injectable({ providedIn: 'root' })
export class BrandService {
    private readonly baseUrl = `${environment.apiUrl}/api/Brand`;

    constructor(private readonly http: HttpClient) {}

    list(): Observable<Brand[]> {
        return this.http.get<ApiResponse<Brand[]>>(this.baseUrl, { context: catalogErrors }).pipe(map((response) => response.data ?? []));
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

    changeRequests(): Observable<BrandChangeRequest[]> {
        return this.http
            .get<ApiResponse<BrandChangeRequest[]>>(`${this.baseUrl}/change-requests`, { context: catalogErrors })
            .pipe(map((response) => response.data ?? []));
    }

    review(id: string, approve: boolean): Observable<BrandChangeRequest> {
        return this.http
            .post<ApiResponse<BrandChangeRequest>>(`${this.baseUrl}/change-requests/${id}`, { approve }, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }
}
