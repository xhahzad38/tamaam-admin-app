export interface CatalogProductListItem {
    id: string;
    name: string;
    psku: string;
    categoryName: string | null;
    brandName: string;
    storeName: string | null;
    structure: number;
    status: number;
    rejectionReason: string | null;
    primaryImageUrl: string | null;
    createdAt: string;
}

export interface CatalogProductContent {
    name: string;
    description: string;
    bulletPoints: string[];
}

export interface CatalogVariant {
    id: string;
    sku: string;
    name: string;
    barcode: string | null;
    gtin: string | null;
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

export interface CatalogAttributeText {
    attributeId: string;
    attributeName: string;
    displayType: number;
    value: string;
}

/** Shows a typed specification the way a shopper reads it. Display type 4 is yes/no. */
export function attributeTextValue(text: CatalogAttributeText): string {
    if (text.displayType === 4) {
        return text.value === 'true' ? 'Yes' : text.value === 'false' ? 'No' : text.value;
    }
    return text.value;
}

export interface CatalogProductDetail {
    id: string;
    psku: string;
    content: CatalogProductContent;
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
    attributeTexts: CatalogAttributeText[];
    countryOfOriginName: string | null;
    categoryRequiresExtraApproval: boolean;
    offerCount: number;
}

export interface CatalogChangeProposal {
    content: CatalogProductContent;
    variants: CatalogVariant[];
    bundleItems: CatalogBundleItem[];
    media: CatalogMedia[];
    attributeValues: CatalogAttributeValue[];
    attributeTexts: CatalogAttributeText[];
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
    proposed: CatalogChangeProposal;
}

export function catalogContentName(value: { content?: CatalogProductContent | null } | null | undefined): string {
    return value?.content?.name?.trim() || '';
}

export function catalogContentDescription(value: { content?: CatalogProductContent | null } | null | undefined): string {
    return value?.content?.description?.trim() || '';
}

export function catalogContentBullets(value: { content?: CatalogProductContent | null } | null | undefined): string[] {
    return value?.content?.bulletPoints ?? [];
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
