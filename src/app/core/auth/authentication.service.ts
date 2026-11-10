import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse } from '@/app/core/api/api.types';
import { APP_SHELL_CONFIG } from '@/app/core/config/app-shell.config';
import { inlineErrors } from '@/app/core/http/api-error';
import { AuthUser, LoginResult, TwoFactorChallenge } from './auth.models';

/** Extra fields on the authenticate response when a second step is needed. */
interface TwoFactorFields {
    requiresTwoFactor?: boolean;
    twoFactorChallengeId?: string | null;
    twoFactorMethod?: string | null;
    twoFactorDestination?: string | null;
}
import { RoleGroups, Role } from './roles';

const STORAGE_KEY = 'user';

/**
 * Holds the signed-in user. "Remember me" keeps the session in localStorage,
 * otherwise it lives in sessionStorage and ends with the tab.
 */
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly config = inject(APP_SHELL_CONFIG);

    private readonly state = signal<AuthUser | null>(readStoredUser());

    /** Current user as a signal; null when signed out. */
    readonly currentUser = this.state.asReadonly();
    readonly roles = computed(() => this.state()?.roles ?? []);
    /** Current user as an observable, for code that still subscribes. */
    readonly user: Observable<AuthUser | null> = toObservable(this.state);

    get userValue(): AuthUser | null {
        return this.state();
    }

    /** Signs in, or returns a challenge when the account uses two-factor sign-in. */
    login(email: string, password: string, rememberMe = false): Observable<LoginResult> {
        return this.http
            .post<ApiResponse<AuthUser & TwoFactorFields>>(`${environment.apiUrl}/api/Account/authenticate`, { email, password }, { context: inlineErrors })
            .pipe(map((response) => this.toLoginResult(response.data, rememberMe)));
    }

    /** Second sign-in step with the 6-digit code. */
    verifyTwoFactor(challenge: TwoFactorChallenge, code: string): Observable<AuthUser> {
        return this.http
            .post<ApiResponse<AuthUser>>(`${environment.apiUrl}/api/Account/two-factor/verify`, { challengeId: challenge.challengeId, code }, { context: inlineErrors })
            .pipe(map((response) => this.storeSession(normalize(response.data), challenge.rememberMe)));
    }

    resendTwoFactor(challenge: TwoFactorChallenge): Observable<unknown> {
        return this.http.post(`${environment.apiUrl}/api/Account/two-factor/resend`, { challengeId: challenge.challengeId }, { context: inlineErrors });
    }

    private toLoginResult(data: AuthUser & TwoFactorFields, rememberMe: boolean): LoginResult {
        if (data.requiresTwoFactor && data.twoFactorChallengeId) {
            return {
                kind: 'twoFactor',
                challenge: { challengeId: data.twoFactorChallengeId, method: data.twoFactorMethod === 'sms' ? 'sms' : 'authenticator', destination: data.twoFactorDestination ?? null, rememberMe }
            };
        }
        return { kind: 'session', user: this.storeSession(normalize(data), rememberMe) };
    }

    private refreshInFlight: Observable<AuthUser> | null = null;

    /**
     * Swaps the refresh token for a new session. Concurrent callers share one request.
     * Errors (no refresh token, revoked, expired) end the session.
     */
    refresh(): Observable<AuthUser> {
        const refreshToken = this.state()?.refreshToken;
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token'));
        }
        if (!this.refreshInFlight) {
            const persistent = !!localStorage.getItem(STORAGE_KEY);
            this.refreshInFlight = this.http
                .post<ApiResponse<AuthUser>>(`${environment.apiUrl}/api/Account/refresh-token`, { refreshToken }, { context: inlineErrors })
                .pipe(
                    // Keep app-specific fields patched onto the session (store name etc.).
                    map((response) => this.storeSession({ ...this.state(), ...normalize(response.data) }, persistent)),
                    finalize(() => (this.refreshInFlight = null)),
                    shareReplay({ bufferSize: 1, refCount: false })
                );
        }
        return this.refreshInFlight;
    }

    /** Adopts a session obtained elsewhere (e.g. right after seller registration). */
    acceptSession(session: Record<string, unknown>): void {
        const user = normalize(session as Partial<AuthUser>);
        writeStoredUser(user, !!localStorage.getItem(STORAGE_KEY) || !sessionStorage.getItem(STORAGE_KEY));
        this.state.set(user);
    }

    patchUser(partial: Partial<AuthUser>): void {
        const current = this.state();
        if (!current) {
            return;
        }
        const next = { ...current, ...partial };
        writeStoredUser(next, !!localStorage.getItem(STORAGE_KEY));
        this.state.set(next);
    }

    hasAnyRole(required: readonly string[], user: AuthUser | null = this.state()): boolean {
        const roles = user?.roles ?? [];
        return required.some((role) => roles.includes(role));
    }

    /** True when the user holds one of the roles this app accepts. */
    canUseApp(user: AuthUser | null = this.state()): boolean {
        return this.hasAnyRole(this.config.allowedRoles, user);
    }

    isPlatformAdmin(user: AuthUser | null = this.state()): boolean {
        return this.hasAnyRole(RoleGroups.platformAdmins, user);
    }

    isSeller(user: AuthUser | null = this.state()): boolean {
        return this.hasAnyRole([Role.Seller], user);
    }

    homeUrl(user: AuthUser | null = this.state()): string {
        return this.config.homeUrl(user?.roles ?? []);
    }

    /** Clears the session without navigating (use when the caller decides where to go next). */
    endSession(): void {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        this.state.set(null);
    }

    logout(returnUrl?: string): void {
        const refreshToken = this.state()?.refreshToken;
        if (refreshToken) {
            // Best effort: revoke server-side so the refresh token can't be reused.
            this.http.post(`${environment.apiUrl}/api/Account/revoke-token`, { refreshToken }, { context: inlineErrors }).subscribe({ error: () => undefined });
        }
        this.endSession();
        void this.router.navigate(['/auth/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
    }

    private storeSession(user: AuthUser, rememberMe: boolean): AuthUser {
        writeStoredUser(user, rememberMe);
        this.state.set(user);
        return user;
    }
}

/** The API serialises `JWToken` as `jwToken`; older payloads used `jWToken`. */
function normalize(raw: Partial<AuthUser> & { jWToken?: string }): AuthUser {
    return { ...raw, roles: raw.roles ?? [], jwToken: raw.jwToken || raw.jWToken || '' } as AuthUser;
}

function readStoredUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
        return raw ? normalize(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

function writeStoredUser(user: AuthUser, persistent: boolean): void {
    const json = JSON.stringify(user);
    if (persistent) {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, json);
    } else {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.setItem(STORAGE_KEY, json);
    }
}
