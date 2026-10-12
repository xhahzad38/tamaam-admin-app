import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';
import { environment } from '@/environments/environment';
import {
    APPROVAL_STATUS_LABEL,
    AccountType,
    AddressDeclaration,
    ApprovalStatus,
    OnboardingSection,
    ReviewRequirement,
    ReviewSection,
    SectionDecision,
    SellerReview,
    TaxDeclaration
} from './seller-review.models';
import { BreadCrumbComponent } from '@/app/shared-components/bread-crumb/bread-crumb.component';
import { SellerReviewService } from './seller-review.service';

interface SummaryRow {
    label: string;
    value: string;
}

@Component({
    selector: 'app-seller-review-detail',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, BreadCrumbComponent, InputControlComponent, ButtonModule],
    templateUrl: './seller-review-detail.html'
})
export class SellerReviewDetail implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly reviews = inject(SellerReviewService);

    readonly crumbs = signal<MenuItem[]>([
        { label: 'Seller reviews', routerLink: '/seller-reviews' },
        { label: 'Application' }
    ]);
    readonly state = signal<SellerReview | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly busySection = signal<OnboardingSection | null>(null);
    readonly rejectSection = signal<OnboardingSection | null>(null);
    readonly rejectNote = new FormControl('', { nonNullable: true });
    readonly suspendOpen = signal(false);
    readonly suspendNote = new FormControl('', { nonNullable: true });
    readonly accountBusy = signal(false);
    readonly ApprovalStatus = ApprovalStatus;
    private organizationId = '';

    ngOnInit(): void {
        this.organizationId = this.route.snapshot.paramMap.get('organizationId') ?? '';
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.reviews.get(this.organizationId).subscribe({
            next: (state) => {
                this.crumbs.set([
                    { label: 'Seller reviews', routerLink: '/seller-reviews' },
                    { label: state.store?.name || state.profile?.registeredName || state.email || 'Application' }
                ]);
                this.state.set(state);
                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.error.set(error?.messages?.[0] ?? 'Could not load this application.');
            }
        });
    }

    sections(): ReviewSection[] {
        return (this.state()?.sections ?? []).filter((section) => section.applicable);
    }

    skippedSections(): ReviewSection[] {
        return (this.state()?.sections ?? []).filter((section) => !section.applicable);
    }

    skippedNames(): string {
        return this.skippedSections()
            .map((section) => this.sectionTitle(section.section))
            .join(', ');
    }

    statusLabel(status: ApprovalStatus): string {
        return APPROVAL_STATUS_LABEL[status] ?? 'Draft';
    }

    sectionTitle(section: OnboardingSection): string {
        switch (section) {
            case OnboardingSection.Identity:
                return this.state()?.accountType === AccountType.Business ? 'Business identity' : 'Identity';
            case OnboardingSection.Address:
                return 'Address';
            case OnboardingSection.Tax:
                return 'Tax';
            case OnboardingSection.Bank:
                return 'Bank';
            default:
                return 'Store';
        }
    }

    canDecide(section: ReviewSection): boolean {
        return section.status === ApprovalStatus.Submitted || section.status === ApprovalStatus.UnderReview;
    }

    rows(section: OnboardingSection): SummaryRow[] {
        const state = this.state();
        if (!state) {
            return [];
        }
        const profile = state.profile;
        const docs = this.documentRows(section);
        switch (section) {
            case OnboardingSection.Identity:
                return profile
                    ? [
                          { label: 'Name', value: profile.registeredName },
                          { label: 'Trade name', value: profile.tradeName ?? '' },
                          { label: 'Registration', value: profile.registrationNumber },
                          ...docs
                      ]
                    : docs;
            case OnboardingSection.Address:
                return profile
                    ? [
                          {
                              label: 'Address',
                              value:
                                  profile.addressDeclaration === AddressDeclaration.Skipped
                                      ? 'Skipped'
                                      : [profile.addressLine1, profile.district, profile.postalCode].filter(Boolean).join(', ')
                          },
                          ...docs
                      ]
                    : docs;
            case OnboardingSection.Tax: {
                const tax = state.tax;
                if (!tax || tax.declaration == null) {
                    return docs;
                }
                if (tax.declaration !== TaxDeclaration.Registered) {
                    return [{ label: 'Tax registration', value: tax.declaration === TaxDeclaration.Skipped ? 'Skipped' : 'Not registered' }];
                }
                return [
                    { label: 'NTN', value: tax.ntn ?? '' },
                    { label: 'Sales tax', value: tax.isSalesTaxRegistered ? (tax.strn ?? '') : 'Not registered' },
                    ...docs
                ];
            }
            case OnboardingSection.Bank: {
                const bank = state.bank;
                return bank
                    ? [
                          { label: 'Account title', value: bank.accountHolderName },
                          { label: 'Bank', value: bank.bankBranch ? `${bank.bankName} — ${bank.bankBranch}` : bank.bankName },
                          { label: 'IBAN', value: bank.iban },
                          { label: 'Bank proof', value: bank.proofSkipped ? 'Skipped' : '' },
                          ...docs
                      ]
                    : docs;
            }
            default: {
                const store = state.store;
                return store
                    ? [
                          { label: 'Name', value: store.name },
                          { label: 'Link', value: `/store/${store.slug}` },
                          { label: 'Contact Email', value: store.supportEmail },
                          { label: 'Contact phone number', value: store.supportPhone },
                          { label: 'Store logo', value: store.logoUrl ? 'Added' : 'Not added' },
                          { label: 'Banner', value: store.bannerUrl ? 'Added' : 'Not added' }
                      ]
                    : [];
            }
        }
    }

    imageUrl(path: string | null | undefined): string | null {
        if (!path) {
            return null;
        }
        return path.startsWith('http') ? path : `${environment.apiUrl}${path}`;
    }

    startReject(section: OnboardingSection): void {
        this.rejectSection.set(section);
        this.rejectNote.setValue('');
        this.error.set(null);
    }

    cancelReject(): void {
        this.rejectSection.set(null);
        this.rejectNote.setValue('');
    }

    approve(section: OnboardingSection): void {
        this.decide(section, SectionDecision.Approve, null);
    }

    confirmReject(section: OnboardingSection): void {
        const note = this.rejectNote.value.trim();
        if (!note) {
            this.error.set('Tell the seller why this section was rejected.');
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
                this.error.set('Could not open the file.');
            }
        });
    }

    private documentRows(section: OnboardingSection): SummaryRow[] {
        const state = this.state();
        if (!state) {
            return [];
        }
        return state.documentRequirements
            .filter((requirement) => requirement.section === section)
            .map((requirement) => ({
                label: requirement.label,
                value: this.documentValue(requirement)
            }));
    }

    private documentValue(requirement: ReviewRequirement): string {
        const document = this.state()?.documents.find((item) => item.documentType === requirement.documentType);
        if (document) {
            return document.fileName;
        }
        if (requirement.skipped) {
            return 'Skipped';
        }
        return requirement.required ? 'Missing' : 'Not provided';
    }

    fileFor(section: OnboardingSection, label: string): string | null {
        const requirement = this.requirements(section).find((item) => item.label === label);
        return requirement ? this.documentId(requirement) : null;
    }

    documentId(requirement: ReviewRequirement): string | null {
        return this.state()?.documents.find((item) => item.documentType === requirement.documentType)?.id ?? null;
    }

    requirements(section: OnboardingSection): ReviewRequirement[] {
        return (this.state()?.documentRequirements ?? []).filter((requirement) => requirement.section === section);
    }

    startSuspend(): void {
        this.suspendOpen.set(true);
        this.suspendNote.setValue('');
        this.error.set(null);
    }

    cancelSuspend(): void {
        this.suspendOpen.set(false);
        this.suspendNote.setValue('');
    }

    confirmSuspend(): void {
        const note = this.suspendNote.value.trim();
        if (!note) {
            this.error.set('Enter the reason for the suspension.');
            return;
        }
        this.accountBusy.set(true);
        this.error.set(null);
        this.reviews.suspend(this.organizationId, note).subscribe({
            next: (state) => {
                this.state.set(state);
                this.accountBusy.set(false);
                this.cancelSuspend();
            },
            error: (error) => {
                this.accountBusy.set(false);
                this.error.set(error?.messages?.[0] ?? 'Could not suspend this seller.');
            }
        });
    }

    reinstate(): void {
        this.accountBusy.set(true);
        this.error.set(null);
        this.reviews.reinstate(this.organizationId).subscribe({
            next: (state) => {
                this.state.set(state);
                this.accountBusy.set(false);
            },
            error: (error) => {
                this.accountBusy.set(false);
                this.error.set(error?.messages?.[0] ?? 'Could not reinstate this seller.');
            }
        });
    }

    private decide(section: OnboardingSection, decision: SectionDecision, note: string | null): void {
        this.busySection.set(section);
        this.error.set(null);
        this.reviews.review(this.organizationId, section, decision, note).subscribe({
            next: (state) => {
                this.state.set(state);
                this.busySection.set(null);
                this.cancelReject();
            },
            error: (error) => {
                this.busySection.set(null);
                this.error.set(error?.messages?.[0] ?? 'Could not save the decision.');
            }
        });
    }
}
