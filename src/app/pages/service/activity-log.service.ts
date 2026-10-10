import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PageResult } from '../../shared/models/api.types';

export interface ActivityLog {
    id: string;
    when: string;
    createdAt: string;
    userName: string;
    email?: string | null;
    action: string;
    description?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    ipAddress: string;
    userAgent?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
    private readonly apiUrl = `${environment.apiUrl}/api/ActivityLog`;

    constructor(private readonly http: HttpClient) {}

    getLogs(pageNumber: number, pageSize: number, searchText?: string) {
        const params = new URLSearchParams({
            pageNumber: String(pageNumber),
            pageSize: String(pageSize)
        });
        if (searchText?.trim()) {
            params.set('searchText', searchText.trim());
        }
        return this.http.get<PageResult<ActivityLog>>(`${this.apiUrl}?${params.toString()}`);
    }
}
