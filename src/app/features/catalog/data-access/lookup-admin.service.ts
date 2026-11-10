import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';

import { ApiResponse, PageResult } from '@/app/core/api/api.types';
import { LookupTypeValue } from '@/app/core/services/lookup.service';


import { ApiError, inlineErrors } from '@/app/core/http/api-error';
export interface LookupTypeRow {
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    /** Referenced by name in code: can't be renamed or deleted. */
    isBuiltIn?: boolean;
}

export interface LookupTypeWrite {
    name: string;
    description: string | null;
    sortOrder: number;
}

export interface LookupValueWrite {
    name: string;
    description: string | null;
    sortOrder: number;
    lookupTypeId: string;
}

export const MARKETPLACE_LOOKUP_TYPES = [
    { name: 'ReturnReason', label: 'Return reasons' },
    { name: 'FeeType', label: 'Fee types' },
    { name: 'CampaignType', label: 'Campaign types' },
    { name: 'InventoryTransactionType', label: 'Inventory transaction types' },
    { name: 'Courier', label: 'Courier names' }
];

@Injectable({ providedIn: 'root' })
export class LookupAdminService {
    private readonly typesUrl = `${environment.apiUrl}/api/LookupType`;
    private readonly valuesUrl = `${environment.apiUrl}/api/LookupTypeValue`;

    constructor(private readonly http: HttpClient) {}

    findTypeId(name: string): Observable<string> {
        const params = new HttpParams().set('searchText', name).set('pageNo', 1).set('pageSize', 50);
        return this.http.get<PageResult<LookupTypeRow>>(this.typesUrl, { params, context: inlineErrors }).pipe(
            map((page) => {
                const match = (page.items ?? []).find((item) => item.name === name);
                if (!match) {
                    throw new ApiError(`Lookup type ${name} was not found.`);
                }
                return match.id;
            })
        );
    }

    values(typeName: string, search: string, pageNo: number, pageSize: number): Observable<PageResult<LookupTypeValue>> {
        let params = new HttpParams().set('lookupTypeName', typeName).set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return this.http.get<PageResult<LookupTypeValue>>(this.valuesUrl, { params, context: inlineErrors });
    }

    create(body: LookupValueWrite): Observable<string> {
        return this.http.post<ApiResponse<string>>(this.valuesUrl, body, { context: inlineErrors }).pipe(map((response) => response.data));
    }

    update(id: string, body: LookupValueWrite): Observable<string> {
        return this.http.put<ApiResponse<string>>(`${this.valuesUrl}/${id}`, body, { context: inlineErrors }).pipe(map((response) => response.data));
    }

    delete(id: string): Observable<boolean> {
        const params = new HttpParams().append('Ids', id);
        return this.http.delete<ApiResponse<boolean>>(this.valuesUrl, { params, context: inlineErrors }).pipe(map((response) => response.data));
    }

    // ---- lookup types (api/LookupType) ----

    types(search: string, pageNo: number, pageSize: number): Observable<PageResult<LookupTypeRow>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        return this.http.get<PageResult<LookupTypeRow>>(this.typesUrl, { params, context: inlineErrors });
    }

    createType(body: LookupTypeWrite): Observable<string> {
        return this.http.post<ApiResponse<string>>(this.typesUrl, body, { context: inlineErrors }).pipe(map((response) => response.data));
    }

    updateType(id: string, body: LookupTypeWrite): Observable<string> {
        return this.http.put<ApiResponse<string>>(`${this.typesUrl}/${id}`, { id, ...body }, { context: inlineErrors }).pipe(map((response) => response.data));
    }

    deleteType(id: string): Observable<boolean> {
        const params = new HttpParams().append('Ids', id);
        return this.http.delete<ApiResponse<boolean>>(this.typesUrl, { params, context: inlineErrors }).pipe(map((response) => response.data));
    }
}
