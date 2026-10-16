export interface CatalogProductListItem {
    id: string;
    name: string;
    slug: string;
    categoryName: string | null;
    brandName: string;
    storeName: string | null;
    structure: number;
    status: number;
    rejectionReason: string | null;
    primaryImageUrl: string | null;
    createdAt: string;
}

export interface CatalogVariant {
    id: string;
    sku: string;
    barcode: string | null;
    gtin: string | null;
    weightKg: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    attributeCombination: string;
    isDefault: boolean;
}

export interface CatalogMedia {
    id: string;
    mediaType: number;
    fileName: string;
    url: string;
    isPrimary: boolean;
    isActive: boolean;
    altText: string | null;
}

export interface CatalogBundleItem {
    componentVariantId: string;
    productName: string;
    sku: string;
    attributeCombination: string;
    quantity: number;
}

export interface CatalogAttributeValue {
    attributeValueId: string;
    attributeName: string;
    valueName: string;
}

export interface CatalogProductDetail {
    id: string;
    name: string;
    description: string;
    slug: string;
    categoryName: string | null;
    brandName: string;
    storeName: string | null;
    structure: number;
    status: number;
    rejectionReason: string | null;
    variants: CatalogVariant[];
    media: CatalogMedia[];
    bundleItems: CatalogBundleItem[];
    attributeValues: CatalogAttributeValue[];
}

export interface CatalogChangeListItem {
    id: string;
    productId: string;
    productName: string;
    storeName: string;
    statusCode: string;
    statusName: string;
    createdAt: string;
}

export interface CatalogChangeDetail {
    id: string;
    productId: string;
    statusCode: string;
    statusName: string;
    reviewNote: string | null;
    createdAt: string;
    current: CatalogProductDetail;
    proposed: {
        name: string;
        description: string;
        slug: string;
        variants: CatalogVariant[];
        bundleItems: CatalogBundleItem[];
        media: CatalogMedia[];
        attributeValues: CatalogAttributeValue[];
    };
}

export const CATALOG_STATUS_LABEL: Record<number, string> = {
    0: 'Draft',
    1: 'Pending review',
    2: 'Live',
    3: 'Rejected',
    4: 'Archived'
};

export const STRUCTURE_LABEL: Record<number, string> = {
    1: 'Simple',
    2: 'Variable',
    3: 'Bundle'
};
