import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { decodeJwt } from '@/app/core/auth/jwt.util';

/** Endpoints that must never carry a bearer token (or trigger a refresh). */
const PUBLIC_PATHS = [
    '/api/account/authenticate',
    '/api/account/refresh-token',
    '/api/account/revoke-token',
    '/api/account/two-factor/verify',
    '/api/account/two-factor/resend',
    '/api/account/send-seller-otp',
    '/api/account/register-seller',
    '/api/account/verify-email-otp'
];

/** Refresh this many seconds before the token actually expires, to absorb clock skew and slow requests. */
const EXPIRY_MARGIN_SECONDS = 30;

const withToken = (request: HttpRequest<unknown>, token: string) => request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

function expiresSoon(token: string): boolean {
    const exp = decodeJwt(token)?.['exp'];
    return typeof exp !== 'number' || exp - EXPIRY_MARGIN_SECONDS < Date.now() / 1000;
}

/**
 * Adds the bearer token to API calls and keeps the session alive:
 *  - an expired (or nearly expired) token is refreshed before the request is sent;
 *  - a 401 response triggers one refresh + retry (the token may have been revoked or the clock skewed).
 * When refreshing fails the error interceptor sees the 401 and signs the user out.
 */
export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
    const url = request.url.toLowerCase();
    if (!request.url.startsWith(environment.apiUrl) || PUBLIC_PATHS.some((path) => url.includes(path))) {
        return next(request);
    }

    const auth = inject(Injector).get(AuthenticationService);
    const token = auth.userValue?.jwToken;
    if (!token) {
        return next(request);
    }

    const sendWithRefresh = () =>
        auth.refresh().pipe(
            switchMap((user) => next(withToken(request, user.jwToken))),
            catchError((error) => {
                if (!(error instanceof HttpErrorResponse)) {
                    // Refresh failed: send the original request so the 401 reaches the error interceptor (sign-out).
                    return next(withToken(request, token));
                }
                return throwError(() => error);
            })
        );

    if (expiresSoon(token)) {
        return auth.userValue?.refreshToken ? sendWithRefresh() : next(withToken(request, token));
    }

    return next(withToken(request, token)).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401 && auth.userValue?.refreshToken) {
                return sendWithRefresh();
            }
            return throwError(() => error);
        })
    );
};
