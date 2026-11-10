import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { errorMessage } from '@/app/core/http/api-error';
import { AccountService, MyProfile } from '@/app/features/account/data-access/account.service';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { ErrorStateComponent, LoadingStateComponent, NoticeComponent } from '@/app/shared/ui/state/state.components';

/** "My profile" tab: name and phone, plus read-only login details. */
@Component({
    selector: 'app-profile-settings',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, ButtonModule, TagModule, InputControlComponent, ErrorStateComponent, LoadingStateComponent, NoticeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (loading()) {
            <div class="card"><app-loading-state [rows]="4" /></div>
        } @else if (loadError(); as message) {
            <app-error-state [message]="message" (retry)="load()" />
        } @else if (profile(); as me) {
            <div class="settings-grid">
                <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
                    <h2 class="section-title">Personal details</h2>
                    <p class="section-subtitle">Shown to your team and used when Tamaam support contacts you.</p>
                    <div class="form-grid">
                        <div class="flex flex-col gap-1">
                            <label for="pf-name" class="text-sm font-medium">Full name</label>
                            <app-input-control inputId="pf-name" label="Full name" [control]="form.controls.fullName" autocomplete="name" [maxLength]="200" [showCount]="false" [flowError]="true" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="pf-phone" class="text-sm font-medium">Mobile number</label>
                            <app-input-control inputId="pf-phone" label="Mobile number" type="tel" [control]="form.controls.phoneNumber" placeholder="+92 300 1234567" autocomplete="tel" [maxLength]="20" [showCount]="false" [flowError]="true" />
                        </div>
                        <div class="flex flex-col gap-1 form-grid__full">
                            <span class="text-sm font-medium">Login email</span>
                            <div class="readonly-field"><i class="pi pi-lock text-muted-color"></i>{{ me.email }}</div>
                            <small class="text-muted-color">Your email is your login. Contact Tamaam support to change it.</small>
                        </div>
                    </div>
                    @if (error(); as message) {
                        <div class="mt-4"><app-error-state [message]="message" [retryable]="false" /></div>
                    }
                    @if (notice(); as message) {
                        <div class="mt-4"><app-notice [message]="message" /></div>
                    }
                    <div class="form-actions">
                        <p-button label="Discard" severity="secondary" [outlined]="true" [disabled]="form.pristine || saving()" (onClick)="reset()" />
                        <p-button label="Save changes" icon="pi pi-check" type="submit" [loading]="saving()" [disabled]="form.pristine" />
                    </div>
                </form>

                <aside class="card">
                    <h2 class="section-title">Account</h2>
                    <dl class="detail-list detail-list--stacked">
                        <div>
                            <dt>Roles</dt>
                            <dd class="flex flex-wrap gap-1">
                                @for (role of me.roles; track role) {
                                    <p-tag [value]="role" severity="secondary" />
                                }
                            </dd>
                        </div>
                        <div><dt>Member since</dt><dd>{{ me.createdAt | date: 'mediumDate' }}</dd></div>
                        <div><dt>Last sign-in</dt><dd>{{ me.lastLoginAt | date: 'medium' }}</dd></div>
                    </dl>
                </aside>
            </div>
        }
    `
})
export class ProfileSettingsComponent implements OnInit {
    private readonly account = inject(AccountService);

    readonly profile = signal<MyProfile | null>(null);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly notice = signal<string | null>(null);

    readonly form = inject(FormBuilder).nonNullable.group({
        fullName: ['', [Validators.required, Validators.maxLength(200)]],
        phoneNumber: ['', [Validators.maxLength(20), Validators.pattern(/^\+?[0-9 \-]{7,20}$/)]]
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.account.me().subscribe({
            next: (profile) => {
                this.profile.set(profile);
                this.reset();
                this.loading.set(false);
            },
            error: (err) => {
                this.loadError.set(errorMessage(err, 'Could not load your profile.'));
                this.loading.set(false);
            }
        });
    }

    reset(): void {
        const p = this.profile();
        this.form.reset({ fullName: p?.fullName ?? '', phoneNumber: p?.phoneNumber ?? '' });
    }

    save(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.saving()) return;
        const { fullName, phoneNumber } = this.form.getRawValue();
        this.saving.set(true);
        this.error.set(null);
        this.notice.set(null);
        this.account.updateMe({ fullName: fullName.trim(), phoneNumber: phoneNumber.trim() || null }).subscribe({
            next: (profile) => {
                this.profile.set(profile);
                this.reset();
                this.saving.set(false);
                this.notice.set('Your details were saved.');
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(errorMessage(err, 'Could not save your details.'));
            }
        });
    }
}
