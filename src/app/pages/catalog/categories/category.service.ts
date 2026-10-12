import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse, PageResult } from '@/app/shared/models/api.types';
import { catalogErrors } from '../catalog.util';
import { CategoryAttributeLink, CategoryDetail, CategoryListItem, CategoryNode, CategoryReturnPolicy, CategoryWarrantyRule, CategoryWrite } from './category.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private readonly baseUrl = `${environment.apiUrl}/api/Category`;

    constructor(private readonly http: HttpClient) {}

    list(search: string, pageNo: number, pageSize: number): Observable<PageResult<CategoryListItem>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return this.http.get<PageResult<CategoryListItem>>(`${this.baseUrl}/list`, { params, context: catalogErrors });
    }

    tree(): Observable<CategoryNode[]> {
        return this.http
            .get<ApiResponse<CategoryNode[]>>(this.baseUrl, { context: catalogErrors })
            .pipe(map((response) => response.data ?? []));
    }

    get(id: string): Observable<CategoryDetail> {
        return this.http
            .get<ApiResponse<CategoryDetail>>(`${this.baseUrl}/${id}`, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    create(body: CategoryWrite): Observable<CategoryDetail> {
        return this.http
            .post<ApiResponse<CategoryDetail>>(this.baseUrl, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    update(id: string, body: CategoryWrite): Observable<CategoryDetail> {
        return this.http
            .put<ApiResponse<CategoryDetail>>(`${this.baseUrl}/${id}`, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    delete(id: string): Observable<boolean> {
        return this.http
            .delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    uploadImage(id: string, file: File): Observable<CategoryDetail> {
        const body = new FormData();
        body.append('file', file);
        return this.http
            .post<ApiResponse<CategoryDetail>>(`${this.baseUrl}/${id}/image`, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    saveAttributes(id: string, attributes: CategoryAttributeLink[]): Observable<CategoryDetail> {
        return this.http
            .put<ApiResponse<CategoryDetail>>(
                `${this.baseUrl}/${id}/attributes`,
                {
                    attributes: attributes.map((row) => ({
                        attributeId: row.attributeId,
                        isRequired: row.isRequired,
                        displayOrder: row.displayOrder
                    }))
                },
                { context: catalogErrors }
            )
            .pipe(map((response) => response.data));
    }

    saveReturnPolicy(id: string, policy: CategoryReturnPolicy): Observable<CategoryDetail> {
        return this.http
            .put<ApiResponse<CategoryDetail>>(`${this.baseUrl}/${id}/return-policy`, policy, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    saveWarranty(id: string, rule: CategoryWarrantyRule): Observable<CategoryDetail> {
        return this.http
            .put<ApiResponse<CategoryDetail>>(`${this.baseUrl}/${id}/warranty`, rule, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    saveCommission(body: {
        name: string;
        categoryId: string;
        fulfillmentType: number | null;
        commissionPercent: number;
        closingFee: number;
        effectiveFrom: string;
        effectiveTo: string | null;
    }): Observable<string> {
        return this.http
            .post<ApiResponse<string>>(`${this.baseUrl}/commission`, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }
}
