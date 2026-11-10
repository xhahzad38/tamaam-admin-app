import { ChangeDetectionStrategy, Component, inject, input, model, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputOtpModule } from 'primeng/inputotp';
import { toDataURL } from 'qrcode';
import { errorMessage } from '@/app/core/http/api-error';
import { AccountService, TwoFactorMethod, TwoFactorSetup, TwoFactorStatus } from '@/app/features/account/data-access/account.service';
import { ErrorStateComponent } from '@/app/shared/ui/state/state.components';

/** Turns on two-factor sign-in: sends an SMS code or shows an authenticator QR, then confirms a code. */
@Component({
    selector: 'app-two-factor-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputOtpModule, ErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [header]="method() === methods.Sms ? 'Set up SMS verification' : 'Set up an authenticator app'" [visible]="visible()" (visibleChange)="!$event && close()" [modal]="true" [draggable]="false" [style]="{ width: 'min(30rem, 94vw)' }" (onShow)="start()">
            @if (starting()) {
                <p class="text-muted-color">Preparing…</p>
            } @else if (setup(); as s) {
                @if (s.method === 'authenticator') {
                    <ol class="steps">
                        <li>Open Google Authenticator, Microsoft Authenticator or 1Password.</li>
                        <li>Scan this QR code, or enter the key manually.</li>
                        <li>Type the 6-digit code the app shows.</li>
                    </ol>
                    <div class="qr">
                        @if (qr(); as src) {
                            <img [src]="src" width="176" height="176" alt="QR code for your authenticator app" />
                        }
                        <code class="qr__key">{{ s.sharedKey }}</code>
                    </div>
                } @else {
                    <p>We texted a 6-digit code to <strong>{{ s.destination }}</strong>. Enter it below.</p>
                }
                <div class="mt-4 flex justify-center">
                    <p-inputotp [formControl]="code" [length]="6" [integerOnly]="true" ariaLabel="Verification code" (keydown.enter)="confirm()" />
                </div>
                @if (s.method === 'sms') {
                    <p class="mt-3 text-center text-sm">
                        <button type="button" class="link-button" [disabled]="resent()" (click)="resend()">{{ resent() ? 'Code sent' : "Didn't get it? Send again" }}</button>
                    </p>
                }
            }
            @if (error(); as message) {
                <div class="mt-3"><app-error-state [message]="message" [retryable]="false" /></div>
            }
            <ng-template #footer>
                <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="close()" />
                <p-button label="Turn on" icon="pi pi-shield" [loading]="saving()" [disabled]="!setup() || code.invalid" (onClick)="confirm()" />
            </ng-template>
        </p-dialog>
    `,
    styles: `
        .steps {
            margin: 0 0 var(--tm-space-4);
            padding-left: var(--tm-space-5);
            font-size: var(--tm-text-sm);
            line-height: 1.7;
        }
        .qr {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--tm-space-2);
        }
        .qr img {
            border: 1px solid var(--tm-border);
            border-radius: var(--tm-radius-md);
            background: #fff;
            padding: var(--tm-space-2);
        }
        .qr__key {
            padding: var(--tm-space-1) var(--tm-space-2);
            border-radius: var(--tm-radius-sm);
            background: var(--tm-surface-muted);
            font-size: var(--tm-text-sm);
            letter-spacing: 0.08em;
            user-select: all;
        }
    `
})
export class TwoFactorDialogComponent {
    private readonly account = inject(AccountService);

    readonly visible = model(false);
    readonly method = input.required<TwoFactorMethod>();
    readonly enabled = output<TwoFactorStatus>();

    readonly methods = TwoFactorMethod;
    readonly setup = signal<TwoFactorSetup | null>(null);
    readonly qr = signal<string | null>(null);
    readonly starting = signal(false);
    readonly saving = signal(false);
    readonly resent = signal(false);
    readonly error = signal<string | null>(null);
    readonly code = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] });

    start(): void {
        this.setup.set(null);
        this.qr.set(null);
        this.code.reset();
        this.error.set(null);
        this.resent.set(false);
        this.starting.set(true);
        this.account.beginTwoFactor(this.method()).subscribe({
            next: (setup) => {
                this.setup.set(setup);
                this.starting.set(false);
                if (setup.otpauthUri) {
                    void toDataURL(setup.otpauthUri, { width: 176, margin: 1 }).then((src) => this.qr.set(src));
                }
            },
            error: (err) => {
                this.starting.set(false);
                this.error.set(errorMessage(err, 'Could not start the setup.'));
            }
        });
    }

    resend(): void {
        const id = this.setup()?.setupId;
        if (!id) return;
        this.account.resendSetupCode(id).subscribe({
            next: () => this.resent.set(true),
            error: (err) => this.error.set(errorMessage(err, 'Could not send a new code.'))
        });
    }

    confirm(): void {
        const setup = this.setup();
        if (!setup || this.code.invalid || this.saving()) return;
        this.saving.set(true);
        this.error.set(null);
        this.account.enableTwoFactor(this.method(), this.code.value, setup.setupId).subscribe({
            next: (status) => {
                this.saving.set(false);
                this.enabled.emit(status);
                this.close();
            },
            error: (err) => {
                this.saving.set(false);
                this.code.reset();
                this.error.set(errorMessage(err, "That code didn't work."));
            }
        });
    }

    close(): void {
        this.visible.set(false);
    }
}
