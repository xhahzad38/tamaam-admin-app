export interface CatalogAttribute {
    id: string;
    name: string;
    displayName: string;
    slug: string;
    displayType: number;
    sortOrder: number;
    isActive: boolean;
}

export interface CatalogAttributeValue {
    id: string;
    name: string;
    displayName: string;
    colorHex: string | null;
    slug: string;
    sortOrder: number;
    attributeId: string;
    attributeName: string;
    isActive: boolean;
}

export interface AttributeWrite {
    name: string;
    displayName: string;
    slug: string;
    displayType: number;
    sortOrder: number;
}

export interface AttributeValueWrite {
    name: string;
    displayName: string;
    colorHex: string | null;
    slug: string;
    sortOrder: number;
    attributeId: string;
}

export const ATTRIBUTE_DISPLAY_TYPES = [
    { label: 'Dropdown', value: 0 },
    { label: 'Text', value: 1 },
    { label: 'Color', value: 2 },
    { label: 'Number', value: 3 },
    { label: 'Boolean', value: 4 }
];

export function displayTypeLabel(value: number): string {
    return ATTRIBUTE_DISPLAY_TYPES.find((option) => option.value === value)?.label ?? 'Dropdown';
}
