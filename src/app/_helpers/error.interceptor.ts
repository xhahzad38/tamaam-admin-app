import { inject, Injector } from '@angular/core';
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthenticationService } from './auth-services';
import { MessageService } from 'primeng/api';

/** Set on a request's HttpContext when the caller renders errors itself instead of a global toast. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** Error thrown by the interceptor; `messages` holds every message returned by the API (e.g. validation failures). */
export class ApiError extends Error {
  constructor(message: string, public readonly messages: string[] = [message], public readonly status = 0) {
    super(message);
  }
}

function collectMessages(err: any): string[] {
  const body = err?.error;
  const validation = body?.Errors ?? body?.errors;
  const list: string[] = [];

  if (Array.isArray(validation)) {
    list.push(...validation.filter((m: unknown) => typeof m === 'string' && m.length > 0));
  } else if (validation && typeof validation === 'object') {
    list.push(...(Object.values(validation).flat() as string[]));
  }

  if (list.length === 0) {
    const single = body?.Message || body?.message || body?.title || err?.statusText;
    if (single) {
      list.push(single);
    }
  }

  return list;
}

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  // Inject the parent DI container instead of the services directly
  const injector = inject(Injector);

  return next(request).pipe(
    catchError((err) => {
      // Lazily resolve services ONLY when an actual error occurs
      const authenticationService = injector.get(AuthenticationService);
      const messageService = injector.get(MessageService);
      const skipToast = request.context.get(SKIP_ERROR_TOAST);
      const messages = collectMessages(err);

      // Handle 401 & 403 Unauthorized/Forbidden
      if ([401, 403].includes(err.status) && authenticationService.userValue) {
        authenticationService.logout();
      }
      // Handle 400 Bad Request / Validation Errors
      else if (err.status === 400) {
        if (!skipToast) {
          messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: messages.join('\n') || 'Bad Request'
          });
        }
      }
      // Handle 500 Internal Server Error
      else if (err.status === 500) {
        if (!skipToast) {
          messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.Message || 'Internal Server Error'
          });
        }
      }
      // Handle 0 Network Failures / CORS Issues
      else if (err.status === 0) {
        if (!skipToast) {
          messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: JSON.stringify(err.message) || 'Failed'
          });
        }
      }

      // Safeguard against missing nested properties
      const fallback = err?.error?.Message || err?.error?.message || err?.statusText || 'Unknown Error';
      const thrown = err.status === 400 && messages.length > 0 ? messages : [fallback];
      return throwError(() => new ApiError(thrown.join('\n'), thrown, err.status));
    })
  );
};
