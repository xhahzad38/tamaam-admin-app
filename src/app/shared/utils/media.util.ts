import { environment } from '@/environments/environment';

/** Turns an API-relative file path (e.g. `/uploads/x.png`) into an absolute URL; absolute URLs pass through. */
export function toMediaUrl(path: string | null | undefined): string | null {
    if (!path) {
        return null;
    }
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Validates an image before upload. Returns an error message, or null when the file is acceptable (or absent). */
export function imageFileError(file: File | null, maxMb = 2): string | null {
    if (!file) {
        return null;
    }
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {
        return 'Use a JPG or PNG image.';
    }
    if (file.size > maxMb * 1024 * 1024) {
        return `Image must be ${maxMb} MB or smaller.`;
    }
    return null;
}

/** Saves a Blob (e.g. an export or document download) under the given file name. */
export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
