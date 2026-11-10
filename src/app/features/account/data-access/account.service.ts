import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse } from '@/app/core/api/api.types';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { inlineErrors } from '@/app/core/http/api-error';

export interface MyProfile {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string | null;
    roles: string[];
    createdAt: string;
    lastLoginAt: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

/** API enum Domain.Enums.TwoFactorMethod */
export enum TwoFactorMethod {
    Sms = 1,
    Authenticator = 2
}

export interface TwoFactorStatus {
    enabled: boolean;
    method: 'none' | 'sms' | 'authenticator';
    hasPhone: boolean;
    maskedPhone: string | null;
    /** Store owners are asked to turn it on. */
    recommended: boolean;
}

export interface TwoFactorSetup {
    method: 'sms' | 'authenticator';
    setupId: string | null;
    destination: string | null;
    sharedKey: string | null;
    otpauthUri: string | null;
}

export interface Session {
    id: string;
    browser: string;
    os: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    ipAddress: string;
    startedAt: string;
    lastActiveAt: string;
    isCurrent: boolean;
}

export interface NotificationCell {
    value: boolean;
    locked: boolean;
    available: boolean;
}

export interface NotificationMatrix {
    channels: { key: string; label: string; available: boolean }[];
    events: { key: string; label: string; description: string; live: boolean; channels: Record<string, NotificationCell> }[];
}

/** The signed-in user's own account: profile, password, two-factor, sessions, notifications. */
@Injectable({ providedIn: 'root' })
export class AccountService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthenticationService);
    private readonly url = `${environment.apiUrl}/api/Account`;
    private readonly options = { context: inlineErrors };

    me(): Observable<MyProfile> {
        return this.http.get<ApiResponse<MyProfile>>(`${this.url}/me`, this.options).pipe(map((r) => r.data));
    }

    updateMe(body: { fullName: string; phoneNumber: string | null }): Observable<MyProfile> {
        return this.http.put<ApiResponse<MyProfile>>(`${this.url}/me`, body, this.options).pipe(
            map((r) => r.data),
            // keep the name in the top bar in sync
            tap((profile) => this.auth.patchUser({ fullName: profile.fullName }))
        );
    }

    /** Other sessions are signed out by the API; this one keeps working. */
    changePassword(body: ChangePasswordRequest): Observable<string> {
        return this.http.post<ApiResponse<boolean>>(`${this.url}/change-password`, body, this.options).pipe(map((r) => r.message || 'Password changed.'));
    }

    // ---- two-factor ----

    twoFactor(): Observable<TwoFactorStatus> {
        return this.http.get<ApiResponse<TwoFactorStatus>>(`${this.url}/two-factor`, this.options).pipe(map((r) => r.data));
    }

    beginTwoFactor(method: TwoFactorMethod): Observable<TwoFactorSetup> {
        return this.http.post<ApiResponse<TwoFactorSetup>>(`${this.url}/two-factor/setup`, { method }, this.options).pipe(map((r) => r.data));
    }

    enableTwoFactor(method: TwoFactorMethod, code: string, setupId: string | null): Observable<TwoFactorStatus> {
        return this.http.post<ApiResponse<TwoFactorStatus>>(`${this.url}/two-factor/enable`, { method, code, setupId }, this.options).pipe(map((r) => r.data));
    }

    disableTwoFactor(password: string): Observable<TwoFactorStatus> {
        return this.http.post<ApiResponse<TwoFactorStatus>>(`${this.url}/two-factor/disable`, { password }, this.options).pipe(map((r) => r.data));
    }

    resendSetupCode(setupId: string): Observable<unknown> {
        return this.http.post(`${this.url}/two-factor/resend`, { challengeId: setupId }, this.options);
    }

    // ---- sessions ----

    sessions(): Observable<Session[]> {
        const current = this.auth.userValue?.sessionId;
        const params = current ? new HttpParams().set('current', current) : undefined;
        return this.http.get<ApiResponse<Session[]>>(`${this.url}/sessions`, { ...this.options, params }).pipe(map((r) => r.data ?? []));
    }

    revokeSession(id: string): Observable<string> {
        return this.http.delete<ApiResponse<number>>(`${this.url}/sessions/${id}`, this.options).pipe(map((r) => r.message ?? 'Signed out.'));
    }

    revokeOtherSessions(): Observable<string> {
        return this.http.post<ApiResponse<number>>(`${this.url}/sessions/revoke-others`, { keepSessionId: this.auth.userValue?.sessionId ?? null }, this.options).pipe(map((r) => r.message ?? 'Signed out.'));
    }

    // ---- notifications ----

    notificationMatrix(): Observable<NotificationMatrix> {
        return this.http.get<ApiResponse<NotificationMatrix>>(`${this.url}/notification-preferences`, this.options).pipe(map((r) => r.data));
    }

    saveNotificationMatrix(events: Record<string, Record<string, boolean>>): Observable<NotificationMatrix> {
        return this.http.put<ApiResponse<NotificationMatrix>>(`${this.url}/notification-preferences`, { events }, this.options).pipe(map((r) => r.data));
    }
}
