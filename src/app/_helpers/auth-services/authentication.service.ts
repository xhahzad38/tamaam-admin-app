import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';


@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    private userSubject: BehaviorSubject<any | null>;
    public user: Observable<any | null>;

    constructor(
        private router: Router,
        private http: HttpClient
    ) {
        this.userSubject = new BehaviorSubject(this.readStoredUser());
        this.user = this.userSubject.asObservable();
    }

    public get userValue() {
        return this.userSubject.value;
    }

    patchUser(partial: Record<string, unknown>) {
        const current = this.userValue;
        if (!current) {
            return;
        }

        const next = { ...current, ...partial };
        this.writeStoredUser(next);
        this.userSubject.next(next);
    }

    login(email: string, password: string, rememberMe = false) {
        return this.http.post<any>(`${environment.apiUrl}/api/account/authenticate`, { email, password })
            .pipe(map(user => this.storeSession(user, rememberMe)));
    }

    sendLoginOtp(identifier: string, channel: number) {
        return this.http.post<any>(`${environment.apiUrl}/api/account/send-login-otp`, {
            identifier,
            channel,
            signup: false
        });
    }

    verifyLoginOtp(identifier: string, channel: number, code: string) {
        return this.http.post<any>(`${environment.apiUrl}/api/account/verify-login-otp`, { identifier, channel, code })
            .pipe(map(user => this.storeSession(user)));
    }

    forgotPassword(email: string) {
        return this.http.post<any>(`${environment.apiUrl}/api/account/forgot-password`, { email });
    }

    resetPassword(payload: { email: string; code: string; newPassword: string; confirmPassword: string }) {
        return this.http.post<any>(`${environment.apiUrl}/api/account/reset-password`, payload);
    }

    acceptSession(session: Record<string, unknown>) {
        const next = {
            ...session,
            jwToken: session['jwToken'] || session['jWToken']
        };
        this.writeStoredUser(next);
        this.userSubject.next(next);
    }

    homeUrl(): string {
        const roles: string[] = this.userValue?.roles ?? [];
        const reviewer = roles.includes('SuperAdmin') || roles.includes('AdminReviewer');
        if (!reviewer && roles.includes('CatalogAdmin')) {
            return '/catalog/categories';
        }
        return '/seller-reviews';
    }

    endSession() {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        this.userSubject.next(null);
    }

    logout() {
        this.endSession();
        this.router.navigate(['/auth/login']);
    }

    private storeSession(user: any, rememberMe = true) {
        const data = user.data;
        const json = JSON.stringify(data);
        if (rememberMe) {
            sessionStorage.removeItem('user');
            localStorage.setItem('user', json);
        } else {
            localStorage.removeItem('user');
            sessionStorage.setItem('user', json);
        }
        this.userSubject.next(data);
        return data;
    }

    private readStoredUser(): any | null {
        const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    private writeStoredUser(user: unknown): void {
        const json = JSON.stringify(user);
        if (sessionStorage.getItem('user') && !localStorage.getItem('user')) {
            sessionStorage.setItem('user', json);
            return;
        }
        localStorage.setItem('user', json);
    }
}