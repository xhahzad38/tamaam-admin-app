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
