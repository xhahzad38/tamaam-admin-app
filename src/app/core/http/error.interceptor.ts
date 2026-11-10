import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { ApiError, SKIP_ERROR_TOAST } from './api-error';

/**
 * Collects messages from both API error shapes:
 * the error middleware (Newtonsoft, PascalCase `Message`/`Errors`) and
 * normal responses / ASP.NET validation problems (camelCase `message`/`errors`/`title`).
 */
function collectMessages(err: HttpErrorResponse): string[] {
    const body = err?.error;
    const validation = body?.Errors ?? body?.errors;
    const list: string[] = [];

    if (Array.isArray(validation)) {
        list.push(...validation.filter((m: unknown): m is string => typeof m === 'string' && m.length > 0));
    } else if (validation && typeof validation === 'object') {
        list.push(...(Object.values(validation).flat() as string[]));
    }
    if (list.length === 0) {
        const single = body?.Message || body?.message || body?.title;
        if (typeof single === 'string' && single) {
            list.push(single);
        }
    }
    return list;
}

function fallbackFor(status: number): string {
    switch (status) {
        case 0:
            return 'Cannot reach the server. Check your connection and try again.';
        case 401:
            return 'Your session has ended. Please sign in again.';
        case 403:
            return 'You do not have permission to do that.';
        case 404:
            return 'We could not find what you were looking for.';
        case 409:
            return 'This was changed by someone else. Reload and try again.';
        default:
            return status >= 500 ? 'Something went wrong on our side. Please try again.' : 'The request could not be completed.';
    }
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
    // Resolve lazily: AuthenticationService itself depends on HttpClient.
    const injector = inject(Injector);

    return next(request).pipe(
        catchError((err: HttpErrorResponse) => {
            const auth = injector.get(AuthenticationService);
            const status = err.status ?? 0;
            const apiMessages = collectMessages(err);
            // The API's error middleware returns user-facing messages (unhandled errors get a generic one).
            const messages = apiMessages.length > 0 ? apiMessages : [fallbackFor(status)];
            const code = typeof err?.error?.code === 'string' ? err.error.code : typeof err?.error?.Code === 'string' ? err.error.Code : null;
            const skipToast = request.context.get(SKIP_ERROR_TOAST);

            if (status === 401 && auth.userValue) {
                // Expired or revoked token: the only status that ends the session.
                auth.logout(injector.get(Router).url);
            } else if (!skipToast) {
                injector.get(MessageService).add({
                    severity: status >= 500 || status === 0 ? 'error' : 'warn',
                    summary: status === 403 ? 'Not allowed' : 'Error',
                    detail: messages.join('\n')
                });
            }

            return throwError(() => new ApiError(messages.join('\n'), messages, status, code));
        })
    );
};
