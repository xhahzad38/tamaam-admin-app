export enum AccountType {
    Individual = 1,
    Business = 2
}

export enum ApprovalStatus {
    Draft = 0,
    Submitted = 1,
    UnderReview = 2,
    ActionRequired = 3,
    Approved = 4,
    Rejected = 5,
    Suspended = 6
}

export enum OnboardingSection {
    Identity = 1,
    Address = 2,
    Tax = 3,
    Bank = 4,
    Store = 5
}

export enum SectionDecision {
    Approve = 1,
    Reject = 2
}

export enum TaxDeclaration {
    Registered = 1,
    NotRegistered = 2,
    Skipped = 3
}

export enum AddressDeclaration {
    Provided = 1,
    Skipped = 2
}

export const APPROVAL_STATUS_LABEL: Record<number, string> = {
    [ApprovalStatus.Draft]: 'Draft',
    [ApprovalStatus.Submitted]: 'Submitted',
    [ApprovalStatus.UnderReview]: 'Under review',
    [ApprovalStatus.ActionRequired]: 'Action required',
    [ApprovalStatus.Approved]: 'Approved',
    [ApprovalStatus.Rejected]: 'Rejected',
    [ApprovalStatus.Suspended]: 'Suspended'
};

export type StatusSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

export function approvalStatusLabel(status: ApprovalStatus): string {
    return APPROVAL_STATUS_LABEL[status] ?? 'Draft';
}

/** Tag colour for an application or section status, shared by the list and detail screens. */
export function approvalStatusSeverity(status: ApprovalStatus): StatusSeverity {
    switch (status) {
        case ApprovalStatus.Approved:
            return 'success';
        case ApprovalStatus.Submitted:
        case ApprovalStatus.UnderReview:
            return 'info';
        case ApprovalStatus.ActionRequired:
            return 'warn';
        case ApprovalStatus.Rejected:
        case ApprovalStatus.Suspended:
            return 'danger';
        default:
            return 'secondary';
    }
}

export const ACCOUNT_TYPE_LABEL: Record<number, string> = {
    [AccountType.Individual]: 'Individual',
    [AccountType.Business]: 'Business'
};

/** Two-letter initials for a seller avatar. */
export function initials(name: string | null | undefined): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return '?';
    }
    return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

export interface ReviewListItem {
    organizationId: string;
    legalName: string;
    displayName: string;
    email: string;
    accountType: AccountType;
    countryCode: string;
    status: ApprovalStatus;
    statusName: string;
    submittedAt: string | null;
    storeName: string | null;
    pendingSections: number;
    approvedSections: number;
    rejectedSections: number;
    waitingOnSeller: number;
}

export interface ReviewSection {
    section: OnboardingSection;
    key: string;
    status: ApprovalStatus;
    statusName: string;
    reviewNote: string | null;
    complete: boolean;
    applicable: boolean;
}

export interface ReviewDocument {
    id: string;
    documentType: number;
    fileName: string;
    expiryDate: string | null;
    status: ApprovalStatus;
}

export interface ReviewRequirement {
    section: OnboardingSection;
    documentType: number;
    label: string;
    required: boolean;
    skipped: boolean;
}

export interface SellerReview {
    organizationId: string;
    email: string;
    accountType: AccountType;
    status: ApprovalStatus;
    statusName: string;
    submittedAt: string | null;
    hasSoldOnOtherPlatform: boolean | null;
    otherPlatforms: string | null;
    marketplaceExperience: string | null;
    sections: ReviewSection[];
    profile: {
        registeredName: string;
        tradeName: string | null;
        registrationNumber: string;
        addressDeclaration: AddressDeclaration | null;
        addressLine1: string | null;
        postalCode: string | null;
        district: string | null;
        phone: string | null;
    } | null;
    tax: {
        declaration: TaxDeclaration | null;
        ntn: string | null;
        isSalesTaxRegistered: boolean;
        strn: string | null;
    } | null;
    bank: {
        accountHolderName: string;
        bankName: string;
        bankBranch: string | null;
        iban: string;
        proofSkipped: boolean;
    } | null;
    store: {
        name: string;
        slug: string;
        supportEmail: string;
        supportPhone: string;
        logoUrl: string | null;
        bannerUrl: string | null;
    } | null;
    documents: ReviewDocument[];
    documentRequirements: ReviewRequirement[];
    suspensionReason: string | null;
    suspendedAt: string | null;
}
