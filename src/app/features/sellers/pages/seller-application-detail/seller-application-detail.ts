import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { errorMessage } from '@/app/core/http/api-error';
import {
    ACCOUNT_TYPE_LABEL,
    AccountType,
    AddressDeclaration,
    ApprovalStatus,
    OnboardingSection,
    ReviewRequirement,
    ReviewSection,
    SectionDecision,
    SellerReview,
    TaxDeclaration,
    approvalStatusLabel,
    approvalStatusSeverity,
    initials
} from '@/app/features/sellers/data-access/seller-review.models';
import { SellerReviewService } from '@/app/features/sellers/data-access/seller-review.service';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent, LoadingStateComponent } from '@/app/shared/ui/state/state.components';
import { toMediaUrl } from '@/app/shared/utils/media.util';

interface DetailField {
    label: string;
    value: string;
}

type DocumentState = 'provided' | 'missing' | 'skipped' | 'notProvided';

interface DetailDocument {
    label: string;
    fileName: string | null;
    documentId: string | null;
    state: DocumentState;
}

interface SectionView {
    review: ReviewSection;
    title: string;
    icon: string;
    fields: DetailField[];
    documents: DetailDocument[];
    canDecide: boolean;
}

const SECTION_ICON: Record<number, string> = {
    [OnboardingSection.Identity]: 'pi pi-id-card',
    [OnboardingSection.Address]: 'pi pi-map-marker',
    [OnboardingSection.Tax]: 'pi pi-percentage',
    [OnboardingSection.Bank]: 'pi pi-building-columns',
    [OnboardingSection.Store]: 'pi pi-shop'
};

/** One seller's onboarding application: approve or reject each section, and suspend or reinstate approved sellers. */
@Component({
    selector: 'app-seller-application-detail',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, ButtonModule, TagModule, InputControlComponent, PageHeaderComponent, ErrorStateComponent, LoadingStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './seller-application-detail.html',
    styleUrl: './seller-application-detail.scss'
})
export class SellerApplicationDetailPage {
    private readonly reviews = inject(SellerReviewService);
    private readonly organizationId = inject(ActivatedRoute).snapshot.paramMap.get('organizationId') ?? '';

    readonly application = signal<SellerReview | null>(null);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly busySection = signal<OnboardingSection | null>(null);
    readonly rejectingSection = signal<OnboardingSection | null>(null);
    readonly rejectNote = new FormControl('', { nonNullable: true });
    readonly suspendOpen = signal(false);
    readonly suspendNote = new FormControl('', { nonNullable: true });
    readonly accountBusy = signal(false);

    readonly ApprovalStatus = ApprovalStatus;
    readonly statusLabel = approvalStatusLabel;
    readonly statusSeverity = approvalStatusSeverity;
    readonly mediaUrl = toMediaUrl;

    readonly sellerName = computed(() => {
        const application = this.application();
        return application?.store?.name || application?.profile?.tradeName || application?.profile?.registeredName || application?.email || 'Seller application';
    });
    readonly avatar = computed(() => initials(this.sellerName()));
    readonly accountTypeLabel = computed(() => ACCOUNT_TYPE_LABEL[this.application()?.accountType ?? AccountType.Individual]);
    readonly crumbs = computed<MenuItem[]>(() => [
        { label: 'Sellers', routerLink: '/sellers' },
        { label: 'Applications', routerLink: '/sellers/applications' },
        { label: this.loading() ? 'Application' : this.sellerName() }
    ]);

    readonly sections = computed<SectionView[]>(() =>
        (this.application()?.sections ?? [])
            .filter((review) => review.applicable)
            .map((review) => ({
                review,
                title: this.sectionTitle(review.section),
                icon: SECTION_ICON[review.section] ?? 'pi pi-file',
                fields: this.fields(review.section),
                documents: this.documents(review.section),
                canDecide: review.status === ApprovalStatus.Submitted || review.status === ApprovalStatus.UnderReview
            }))
    );
    readonly skippedSectionNames = computed(() =>
        (this.application()?.sections ?? [])
            .filter((review) => !review.applicable)
            .map((review) => this.sectionTitle(review.section))
            .join(', ')
    );
    readonly progress = computed(() => {
        const sections = this.sections();
        const count = (...statuses: ApprovalStatus[]) => sections.filter((section) => statuses.includes(section.review.status)).length;
        const total = sections.length;
        const approved = count(ApprovalStatus.Approved);
        const pending = count(ApprovalStatus.Submitted, ApprovalStatus.UnderReview);
        const rejected = count(ApprovalStatus.Rejected, ApprovalStatus.ActionRequired);
        const pct = (n: number) => (total ? (n / total) * 100 : 0);
        return { total, approved, pending, rejected, approvedPct: pct(approved), pendingPct: pct(pending), rejectedPct: pct(rejected) };
    });
    readonly logoUrl = computed(() => toMediaUrl(this.application()?.store?.logoUrl));
    readonly bannerUrl = computed(() => toMediaUrl(this.application()?.store?.bannerUrl));

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.reviews.get(this.organizationId).subscribe({
            next: (application) => {
                this.application.set(application);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.loadError.set(errorMessage(error, 'Could not load this application.'));
            }
        });
    }

    approve(section: OnboardingSection): void {
        this.decide(section, SectionDecision.Approve, null);
    }

    startReject(section: OnboardingSection): void {
        this.rejectingSection.set(section);
        this.rejectNote.setValue('');
        this.actionError.set(null);
    }

    cancelReject(): void {
        this.rejectingSection.set(null);
        this.rejectNote.setValue('');
    }

    confirmReject(section: OnboardingSection): void {
        const note = this.rejectNote.value.trim();
        if (!note) {
            this.actionError.set('Tell the seller why this section was rejected.');
            return;
        }
        this.decide(section, SectionDecision.Reject, note);
    }

    openDocument(documentId: string): void {
        const tab = window.open('', '_blank');
        this.reviews.downloadDocument(this.organizationId, documentId).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                if (tab) {
                    tab.location.href = url;
                } else {
                    window.open(url, '_blank');
                }
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
            },
            error: () => {
                tab?.close();
                this.actionError.set('Could not open the file.');
            }
        });
    }

    startSuspend(): void {
        this.suspendOpen.set(true);
        this.suspendNote.setValue('');
        this.actionError.set(null);
    }

    cancelSuspend(): void {
        this.suspendOpen.set(false);
        this.suspendNote.setValue('');
    }

    confirmSuspend(): void {
        const note = this.suspendNote.value.trim();
        if (!note) {
            this.actionError.set('Enter the reason for the suspension.');
            return;
        }
        this.runAccountAction(this.reviews.suspend(this.organizationId, note), 'Could not suspend this seller.', () => this.cancelSuspend());
    }

    reinstate(): void {
        this.runAccountAction(this.reviews.reinstate(this.organizationId), 'Could not reinstate this seller.');
    }

    private runAccountAction(request: ReturnType<SellerReviewService['reinstate']>, fallback: string, done?: () => void): void {
        this.accountBusy.set(true);
        this.actionError.set(null);
        request.subscribe({
            next: (application) => {
                this.application.set(application);
                this.accountBusy.set(false);
                done?.();
            },
            error: (error) => {
                this.accountBusy.set(false);
                this.actionError.set(errorMessage(error, fallback));
            }
        });
    }

    private decide(section: OnboardingSection, decision: SectionDecision, note: string | null): void {
        this.busySection.set(section);
        this.actionError.set(null);
        this.reviews.review(this.organizationId, section, decision, note).subscribe({
            next: (application) => {
                this.application.set(application);
                this.busySection.set(null);
                this.cancelReject();
            },
            error: (error) => {
                this.busySection.set(null);
                this.actionError.set(errorMessage(error, 'Could not save the decision.'));
            }
        });
    }

    private sectionTitle(section: OnboardingSection): string {
        switch (section) {
            case OnboardingSection.Identity:
                return this.application()?.accountType === AccountType.Business ? 'Business identity' : 'Identity';
            case OnboardingSection.Address:
                return 'Address';
            case OnboardingSection.Tax:
                return 'Tax';
            case OnboardingSection.Bank:
                return 'Bank account';
            default:
                return 'Store';
        }
    }

    private fields(section: OnboardingSection): DetailField[] {
        const application = this.application();
        if (!application) {
            return [];
        }
        const { profile, tax, bank, store } = application;
        switch (section) {
            case OnboardingSection.Identity:
                return profile
                    ? [
                          { label: 'Registered name', value: profile.registeredName },
                          { label: 'Trade name', value: profile.tradeName ?? '' },
                          { label: 'Registration number', value: profile.registrationNumber }
                      ]
                    : [];
            case OnboardingSection.Address:
                if (!profile) {
                    return [];
                }
                return [
                    {
                        label: 'Business address',
                        value:
                            profile.addressDeclaration === AddressDeclaration.Skipped
                                ? 'Skipped by seller'
                                : [profile.addressLine1, profile.district, profile.postalCode].filter(Boolean).join(', ')
                    },
                    { label: 'Phone number', value: profile.phone ?? '' }
                ];
            case OnboardingSection.Tax:
                if (!tax || tax.declaration == null) {
                    return [];
                }
                if (tax.declaration !== TaxDeclaration.Registered) {
                    return [{ label: 'Tax registration', value: tax.declaration === TaxDeclaration.Skipped ? 'Skipped by seller' : 'Not registered' }];
                }
                return [
                    { label: 'Tax registration', value: 'Registered' },
                    { label: 'NTN', value: tax.ntn ?? '' },
                    { label: 'Sales tax (STRN)', value: tax.isSalesTaxRegistered ? (tax.strn ?? '') : 'Not registered' }
                ];
            case OnboardingSection.Bank:
                return bank
                    ? [
                          { label: 'Account title', value: bank.accountHolderName },
                          { label: 'Bank name', value: bank.bankName },
                          { label: 'Branch', value: bank.bankBranch ?? '' },
                          { label: 'IBAN', value: bank.iban }
                      ]
                    : [];
            default:
                return store
                    ? [
                          { label: 'Store name', value: store.name },
                          { label: 'Store link', value: `/store/${store.slug}` },
                          { label: 'Contact email', value: store.supportEmail },
                          { label: 'Contact phone', value: store.supportPhone },
                          { label: 'Store logo', value: store.logoUrl ? 'Uploaded' : 'Not uploaded' },
                          { label: 'Store banner', value: store.bannerUrl ? 'Uploaded' : 'Not uploaded' }
                      ]
                    : [];
        }
    }

    private documents(section: OnboardingSection): DetailDocument[] {
        const application = this.application();
        if (!application) {
            return [];
        }
        const rows = application.documentRequirements
            .filter((requirement) => requirement.section === section)
            .map((requirement) => this.document(application, requirement));
        if (section === OnboardingSection.Bank && application.bank?.proofSkipped && rows.length === 0) {
            rows.push({ label: 'Bank proof', fileName: null, documentId: null, state: 'skipped' });
        }
        return rows;
    }

    private document(application: SellerReview, requirement: ReviewRequirement): DetailDocument {
        const file = application.documents.find((item) => item.documentType === requirement.documentType);
        if (file) {
            return { label: requirement.label, fileName: file.fileName, documentId: file.id, state: 'provided' };
        }
        const state: DocumentState = requirement.skipped ? 'skipped' : requirement.required ? 'missing' : 'notProvided';
        return { label: requirement.label, fileName: null, documentId: null, state };
    }
}
