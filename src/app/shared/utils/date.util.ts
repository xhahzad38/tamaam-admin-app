/** Value for an `<input type="datetime-local">` in the user's local time. */
export function localDateTimeValue(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts a `datetime-local` value to an ISO string for the API; null when empty or invalid. */
export function toApiDateTime(value: string): string | null {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
