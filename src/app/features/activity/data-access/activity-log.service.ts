import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { PageResult } from '@/app/core/api/api.types';
import { inlineErrors } from '@/app/core/http/api-error';

export interface ActivityLog {
    id: string;
    when: string;
    createdAt: string;
    actorUserId: string | null;
    userName: string;
    email: string | null;
    action: string;
    description: string | null;
    entityType: string | null;
    entityId: string | null;
    ipAddress: string;
    userAgent: string | null;
}

export interface ActivityLogFilter {
    search: string;
    /** Action prefix, e.g. "Account." */
    action: string | null;
    entityType: string | null;
    from: Date | null;
    to: Date | null;
}

/** `GET api/ActivityLog` (SuperAdmin, AdminReviewer). */
@Injectable({ providedIn: 'root' })
export class ActivityLogService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/api/ActivityLog`;

    list(filter: ActivityLogFilter, pageNo: number, pageSize: number): Observable<PageResult<ActivityLog>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (filter.search.trim()) params = params.set('searchText', filter.search.trim());
        if (filter.action) params = params.set('action', filter.action);
        if (filter.entityType) params = params.set('entityType', filter.entityType);
        if (filter.from) params = params.set('from', startOfDay(filter.from).toISOString());
        if (filter.to) params = params.set('to', startOfDay(filter.to, 1).toISOString());
        return this.http.get<PageResult<ActivityLog>>(this.url, { params, context: inlineErrors });
    }
}

function startOfDay(date: Date, addDays = 0): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    copy.setDate(copy.getDate() + addDays);
    return copy;
}
