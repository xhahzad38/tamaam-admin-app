import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { LookupType } from '../enums/lookup-type';
import { ApiResponse } from '../models/api.types';

export interface LookupTypeValue {
    id: string;
    name: string;
    code?: string | null;
    description?: string | null;
    sortOrder: number;
    lookupTypeId: string;
    isActive: boolean;
}

export type DropdownSource =
    | 'Attributes'
    | 'Brands'
    | 'Categories'
    | 'LookupTypes'
    | 'Products';

export interface DropdownOption {
    id: string;
    label: string;
    description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class LookupService {
    private readonly apiUrl = `${environment.apiUrl}/api/Lookup`;

    constructor(private readonly http: HttpClient) {}

    getDropdownOptions(source: DropdownSource, searchText?: string) {
        let params = new HttpParams();
        if (searchText?.trim()) {
            params = params.set('searchText', searchText.trim());
        }

        return this.http.get<ApiResponse<DropdownOption[]>>(`${this.apiUrl}/${source}`, { params });
    }

    getValuesByType(type: LookupType) {
        const name = LookupType[type];
        return this.http.get<ApiResponse<LookupTypeValue[]>>(
            `${environment.apiUrl}/api/LookupTypeValue/by-type/${encodeURIComponent(name)}`
        );
    }
}
