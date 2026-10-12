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
