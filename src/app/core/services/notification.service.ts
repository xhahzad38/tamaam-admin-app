import { HttpClient, HttpParams } from '@angular/common/http';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, Subscription, map, tap, timer } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse, PageResult } from '@/app/core/api/api.types';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { inlineErrors } from '@/app/core/http/api-error';

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

const POLL_MS = 60_000;

/**
 * In-app notifications (`api/Notification`). Keeps the unread count fresh while a user is
 * signed in: polls every minute and whenever the tab becomes visible again.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthenticationService);
    private readonly url = `${environment.apiUrl}/api/Notification`;

    private readonly unread = signal(0);
    readonly unreadCount = this.unread.asReadonly();
    readonly hasUnread = computed(() => this.unread() > 0);

    private polling: Subscription | null = null;

    constructor() {
        effect(() => (this.auth.currentUser() ? this.startPolling() : this.stopPolling()));
        const onVisible = () => document.visibilityState === 'visible' && this.auth.currentUser() && this.refreshCount();
        document.addEventListener('visibilitychange', onVisible);
        inject(DestroyRef).onDestroy(() => {
            document.removeEventListener('visibilitychange', onVisible);
            this.stopPolling();
        });
    }

    list(pageNo: number, pageSize: number, unreadOnly = false): Observable<PageResult<AppNotification>> {
        const params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize).set('unreadOnly', unreadOnly);
        return this.http.get<PageResult<AppNotification>>(this.url, { params, context: inlineErrors });
    }

    markRead(id: string): Observable<number> {
        return this.http.post<ApiResponse<number>>(`${this.url}/${id}/read`, {}, { context: inlineErrors }).pipe(
            map((r) => r.data),
            tap((count) => this.unread.set(count))
        );
    }

    markAllRead(): Observable<number> {
        return this.http.post<ApiResponse<number>>(`${this.url}/read-all`, {}, { context: inlineErrors }).pipe(
            map((r) => r.data),
            tap((count) => this.unread.set(count))
        );
    }

    refreshCount(): void {
        this.http
            .get<ApiResponse<number>>(`${this.url}/unread-count`, { context: inlineErrors })
            .subscribe({ next: (r) => this.unread.set(r.data ?? 0), error: () => undefined });
    }

    private startPolling(): void {
        if (this.polling) return;
        this.polling = timer(0, POLL_MS).subscribe(() => document.visibilityState !== 'hidden' && this.refreshCount());
    }

    private stopPolling(): void {
        this.polling?.unsubscribe();
        this.polling = null;
        this.unread.set(0);
    }
}

/** "5 min ago", "Yesterday", "3 Mar" — short relative time for notification lists. */
export function relativeTime(iso: string, now = Date.now()): string {
    const then = new Date(iso).getTime();
    const minutes = Math.round((now - then) / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
