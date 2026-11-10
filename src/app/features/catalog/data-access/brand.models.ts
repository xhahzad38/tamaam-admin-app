export interface Brand {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    sortOrder: number;
    logoUrl: string | null;
    enforcementId: string;
    enforcementName: string;
    ownerOrganizationId: string | null;
    ownerOrganizationName: string | null;
    approvalStatus: number;
    isActive: boolean;
}

export interface BrandWrite {
    name: string;
    slug: string | null;
    description: string | null;
    sortOrder: number;
    enforcementId: string;
    ownerOrganizationId: string | null;
    isActive: boolean;
}

export interface BrandChangeRequest {
    id: string;
    brandId: string;
    brandName: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    approvalStatus: number;
    requestedByUserId: string;
    createdAt: string;
}

export interface EnforcementOption {
    id: string;
    name: string;
}

export interface BrandDocument {
    id: string;
    brandId: string;
    documentKind: string;
    blobUrl: string;
    fileName: string;
    expiresOn: string | null;
    isActive: boolean;
}

export interface BrandAuthorization {
    id: string;
    brandId: string;
    storeId: string;
    storeName: string;
    authorizationType: string;
    documentId: string | null;
    documentFileName: string | null;
    approvalStatus: number;
    validFrom: string | null;
    validTo: string | null;
    reviewedByUserId: string | null;
    reviewNote: string | null;
    isActive: boolean;
}

export interface BrandAuthorizationWrite {
    id?: string | null;
    storeId: string;
    authorizationType: string;
    documentId: string | null;
    approvalStatus: number;
    validFrom: string | null;
    validTo: string | null;
    reviewNote: string | null;
    isActive: boolean;
}

export interface BrandAuthorizationQueueItem extends BrandAuthorization {
    brandName: string;
    documentUrl: string | null;
    createdAt: string;
}

export const BRAND_DOCUMENT_KINDS = [
    { label: 'Trademark certificate', value: 'TrademarkCertificate' },
    { label: 'Authorization letter', value: 'AuthorizationLetter' },
    { label: 'Distribution agreement', value: 'DistributionAgreement' }
];

export const BRAND_AUTHORIZATION_TYPES = [
    { label: 'Authorized reseller', value: 'AuthorizedReseller' },
    { label: 'Distributor', value: 'Distributor' },
    { label: 'Brand owner', value: 'BrandOwner' }
];
