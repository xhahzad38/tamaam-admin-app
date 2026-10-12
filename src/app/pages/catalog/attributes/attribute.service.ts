import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse, PageResult } from '@/app/shared/models/api.types';
import { catalogErrors } from '../catalog.util';
import { AttributeValueWrite, AttributeWrite, CatalogAttribute, CatalogAttributeValue } from './attribute.models';

@Injectable({ providedIn: 'root' })
export class AttributeService {
    private readonly attributesUrl = `${environment.apiUrl}/api/Attribute`;
    private readonly valuesUrl = `${environment.apiUrl}/api/AttributeValue`;

    constructor(private readonly http: HttpClient) {}

    list(search: string, pageNo = 1, pageSize = 20): Observable<PageResult<CatalogAttribute>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return this.http.get<PageResult<CatalogAttribute>>(this.attributesUrl, { params, context: catalogErrors });
    }

    create(body: AttributeWrite): Observable<string> {
        return this.http
            .post<ApiResponse<string>>(this.attributesUrl, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    update(id: string, body: AttributeWrite): Observable<string> {
        return this.http
            .put<ApiResponse<string>>(`${this.attributesUrl}/${id}`, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    delete(id: string): Observable<boolean> {
        const params = new HttpParams().append('Ids', id);
        return this.http
            .delete<ApiResponse<boolean>>(this.attributesUrl, { params, context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    values(attributeId: string, search: string, pageNo: number, pageSize: number): Observable<PageResult<CatalogAttributeValue>> {
        let params = new HttpParams().set('attributeId', attributeId).set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return this.http.get<PageResult<CatalogAttributeValue>>(this.valuesUrl, { params, context: catalogErrors });
    }

    createValue(body: AttributeValueWrite): Observable<string> {
        return this.http
            .post<ApiResponse<string>>(this.valuesUrl, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    updateValue(id: string, body: AttributeValueWrite): Observable<string> {
        return this.http
            .put<ApiResponse<string>>(`${this.valuesUrl}/${id}`, body, { context: catalogErrors })
            .pipe(map((response) => response.data));
    }

    deleteValue(id: string): Observable<boolean> {
        const params = new HttpParams().append('Ids', id);
        return this.http
            .delete<ApiResponse<boolean>>(this.valuesUrl, { params, context: catalogErrors })
            .pipe(map((response) => response.data));
    }
}
