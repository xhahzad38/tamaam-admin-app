import { HttpContext } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { SKIP_ERROR_TOAST } from '@/app/_helpers/error.interceptor';

export const catalogErrors = new HttpContext().set(SKIP_ERROR_TOAST, true);

export function catalogErrorMessage(error: unknown, fallback: string): string {
    const messages = (error as { messages?: string[] } | null)?.messages;
    const message = (error as { message?: string } | null)?.message;
    return messages?.[0] || message || fallback;
}

export function catalogMediaUrl(path: string | null | undefined): string | null {
    if (!path) {
        return null;
    }
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function readImageFile(file: File | null): string | null {
    if (!file) {
        return null;
    }
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {
        return 'Use a JPG or PNG image.';
    }
    if (file.size > 2 * 1024 * 1024) {
        return 'Image must be 2 MB or smaller.';
    }
    return null;
}

export function includesQuery(query: string, ...values: Array<string | number | null | undefined>): boolean {
    const text = query.trim().toLowerCase();
    if (!text) {
        return true;
    }
    return values.some((value) => String(value ?? '').toLowerCase().includes(text));
}

export function toSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function localDateTimeValue(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toApiDateTime(value: string): string | null {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString();
}
