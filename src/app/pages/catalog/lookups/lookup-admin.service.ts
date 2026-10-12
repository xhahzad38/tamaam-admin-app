import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiError } from '@/app/_helpers/error.interceptor';
import { ApiResponse, PageResult } from '@/app/shared/models/api.types';
import { LookupTypeValue } from '@/app/shared/services/lookup.service';
import { catalogErrors } from '../catalog.util';

export interface LookupTypeRow {
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
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
        return this.http.get<PageResult<LookupTypeRow>>(this.typesUrl, { params, context: catalogErrors }).pipe(
            map((page) => {
                const match = (page.items ?? []).find((item) => item.name === name);
                if (!match) {
                    throw new ApiError(`Lookup type ${name} was not found.`);
                }
                return match.id;
            })
        );
    }

    values(typeName: string): Observable<LookupTypeValue[]> {
        const params = new HttpParams().set('lookupTypeName', typeName).set('pageNo', 1).set('pageSize', 200);
        return this.http.get<PageResult<LookupTypeValue>>(this.valuesUrl, { params, context: catalogErrors }).pipe(map((page) => page.items ?? []));
    }

    create(body: LookupValueWrite): Observable<string> {
        return this.http.post<ApiResponse<string>>(this.valuesUrl, body, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    update(id: string, body: LookupValueWrite): Observable<string> {
        return this.http.put<ApiResponse<string>>(`${this.valuesUrl}/${id}`, body, { context: catalogErrors }).pipe(map((response) => response.data));
    }

    delete(id: string): Observable<boolean> {
        const params = new HttpParams().append('Ids', id);
        return this.http.delete<ApiResponse<boolean>>(this.valuesUrl, { params, context: catalogErrors }).pipe(map((response) => response.data));
    }
}
