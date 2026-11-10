import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Set on a request when the screen renders errors itself, so the interceptor skips its toast. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** Pass as `{ context: inlineErrors }` for requests whose errors are shown inline on the page. */
export const inlineErrors = new HttpContext().set(SKIP_ERROR_TOAST, true);

/** Machine-readable error codes the API sets on `ApiResponse.code` (see Application/Exceptions/ErrorCodes.cs). */
export const ApiErrorCode = {
    /** A price change is large enough that the seller must confirm it; resend with confirmLargePriceChange = true. */
    LargePriceChange: 'LARGE_PRICE_CHANGE',
    InvalidCredentials: 'INVALID_CREDENTIALS',
    InvalidRefreshToken: 'INVALID_REFRESH_TOKEN'
} as const;

/** Error thrown by the interceptor; `messages` holds every message returned by the API (e.g. validation failures). */
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly messages: string[] = [message],
        public readonly status = 0,
        /** Machine-readable code from the API, when it sent one. */
        public readonly code: string | null = null
    ) {
        super(message);
    }
}

/** True when the error carries the given API error code. */
export function hasErrorCode(error: unknown, code: string): boolean {
    return error instanceof ApiError && error.code === code;
}

/** Best user-facing message for any error, falling back when the API gave nothing useful. */
export function errorMessage(error: unknown, fallback: string): string {
    const messages = (error as { messages?: string[] } | null)?.messages;
    const message = (error as { message?: string } | null)?.message;
    const text = messages?.[0] || message;
    return !text || text === 'OK' || text === 'Unknown Error' ? fallback : text;
}
