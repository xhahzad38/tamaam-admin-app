import {
    CatalogAttributeText,
    CatalogAttributeValue,
    CatalogBundleItem,
    CatalogMedia,
    CatalogVariant,
    attributeTextValue
} from '@/app/features/catalog/data-access/catalog-review.models';

/** How one row compares between the live listing and the seller's proposal. */
export type RowChange = 'added' | 'removed' | 'changed' | 'same';

/** A run of words in a text diff. */
export interface DiffPart {
    text: string;
    kind: 'same' | 'added' | 'removed';
}

/** Above this many words in either text, skip the word-level diff and show both texts as-is. */
const MAX_DIFF_WORDS = 1500;

/**
 * Word-level diff (longest common subsequence) so the reviewer sees exactly what the seller rewrote.
 * Whitespace is kept with the word before it, so the output reads like the original text.
 */
export function diffWords(before: string, after: string): DiffPart[] | null {
    const a = before.match(/\S+\s*/g) ?? [];
    const b = after.match(/\S+\s*/g) ?? [];
    if (a.length > MAX_DIFF_WORDS || b.length > MAX_DIFF_WORDS) {
        return null;
    }
    const key = (word: string) => word.trim();
    const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
            table[i][j] = key(a[i]) === key(b[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
        }
    }

    const parts: DiffPart[] = [];
    const push = (text: string, kind: DiffPart['kind']) => {
        const last = parts[parts.length - 1];
        if (last?.kind === kind) {
            last.text += text;
        } else {
            parts.push({ text, kind });
        }
    };
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (key(a[i]) === key(b[j])) {
            push(b[j], 'same');
            i++;
            j++;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
            push(a[i++], 'removed');
        } else {
            push(b[j++], 'added');
        }
    }
    while (i < a.length) push(a[i++], 'removed');
    while (j < b.length) push(b[j++], 'added');
    return parts;
}

export interface ListRow {
    text: string;
    change: RowChange;
}

/** Bullet points: kept, added (new text) and removed (dropped text), in the proposed order. */
export function diffList(before: readonly string[], after: readonly string[]): ListRow[] {
    const clean = (list: readonly string[]) => list.map((item) => item.trim()).filter(Boolean);
    const live = clean(before);
    const next = clean(after);
    const rows: ListRow[] = next.map((text) => ({ text, change: live.includes(text) ? 'same' : 'added' }));
    for (const text of live) {
        if (!next.includes(text)) {
            rows.push({ text, change: 'removed' });
        }
    }
    return rows;
}

export interface VariantRow {
    live: CatalogVariant | null;
    proposed: CatalogVariant | null;
    change: RowChange;
    /** Fields that differ, for a "changed" row. */
    fields: Set<keyof CatalogVariant>;
}

const VARIANT_FIELDS: Array<keyof CatalogVariant> = ['sku', 'name', 'attributeCombination', 'barcode', 'gtin'];

export function diffVariants(before: readonly CatalogVariant[], after: readonly CatalogVariant[]): VariantRow[] {
    const rows: VariantRow[] = after.map((proposed) => {
        const live = before.find((variant) => variant.id === proposed.id) ?? before.find((variant) => variant.sku === proposed.sku) ?? null;
        if (!live) {
            return { live: null, proposed, change: 'added', fields: new Set() };
        }
        const fields = new Set(VARIANT_FIELDS.filter((field) => (live[field] ?? '') !== (proposed[field] ?? '')));
        return { live, proposed, change: fields.size ? 'changed' : 'same', fields };
    });
    for (const live of before) {
        if (!rows.some((row) => row.live === live)) {
            rows.push({ live, proposed: null, change: 'removed', fields: new Set() });
        }
    }
    return rows;
}

export interface MediaRow {
    media: CatalogMedia;
    change: 'added' | 'removed' | 'same';
}

/** Photos are matched by file URL: the same upload kept, a new upload, or one the seller dropped. */
export function diffMedia(before: readonly CatalogMedia[], after: readonly CatalogMedia[]): MediaRow[] {
    const visible = (list: readonly CatalogMedia[]) => list.filter((media) => media.isActive !== false);
    const live = visible(before);
    const next = visible(after);
    const rows: MediaRow[] = next.map((media) => ({ media, change: live.some((item) => item.url === media.url) ? 'same' : 'added' }));
    for (const media of live) {
        if (!next.some((item) => item.url === media.url)) {
            rows.push({ media, change: 'removed' });
        }
    }
    return rows;
}

export interface SpecRow {
    name: string;
    live: string;
    proposed: string;
    change: RowChange;
}

function specMap(values: readonly CatalogAttributeValue[], texts: readonly CatalogAttributeText[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const value of values) {
        const current = map.get(value.attributeName);
        map.set(value.attributeName, current ? `${current}, ${value.valueName}` : value.valueName);
    }
    for (const text of texts) {
        map.set(text.attributeName, attributeTextValue(text));
    }
    return map;
}

/** Specifications (list and typed attributes) side by side, one row per attribute. */
export function diffSpecs(
    live: { attributeValues: readonly CatalogAttributeValue[]; attributeTexts: readonly CatalogAttributeText[] },
    proposed: { attributeValues: readonly CatalogAttributeValue[]; attributeTexts: readonly CatalogAttributeText[] }
): SpecRow[] {
    const before = specMap(live.attributeValues, live.attributeTexts);
    const after = specMap(proposed.attributeValues, proposed.attributeTexts);
    const names = [...new Set([...after.keys(), ...before.keys()])];
    return names.map((name) => {
        const was = before.get(name) ?? '';
        const now = after.get(name) ?? '';
        const change: RowChange = !was ? 'added' : !now ? 'removed' : was === now ? 'same' : 'changed';
        return { name, live: was, proposed: now, change };
    });
}

export interface BundleRow {
    item: CatalogBundleItem;
    liveQty: number | null;
    change: RowChange;
}

export function diffBundle(before: readonly CatalogBundleItem[], after: readonly CatalogBundleItem[]): BundleRow[] {
    const rows: BundleRow[] = after.map((item) => {
        const live = before.find((line) => line.componentVariantId === item.componentVariantId);
        return { item, liveQty: live?.quantity ?? null, change: !live ? 'added' : live.quantity !== item.quantity ? 'changed' : 'same' };
    });
    for (const live of before) {
        if (!after.some((line) => line.componentVariantId === live.componentVariantId)) {
            rows.push({ item: live, liveQty: live.quantity, change: 'removed' });
        }
    }
    return rows;
}

export function countChanges(rows: ReadonlyArray<{ change: string }>): number {
    return rows.filter((row) => row.change !== 'same').length;
}
