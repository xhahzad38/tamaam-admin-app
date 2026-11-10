/** Case-insensitive "does any of these values contain the query" check for client-side filtering. */
export function includesQuery(query: string, ...values: Array<string | number | null | undefined>): boolean {
    const text = query.trim().toLowerCase();
    if (!text) {
        return true;
    }
    return values.some((value) =>
        String(value ?? '')
            .toLowerCase()
            .includes(text)
    );
}

/** "Men's Shoes & Bags" -> "men-s-shoes-bags" */
export function toSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
