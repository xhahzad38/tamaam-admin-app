import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { FluidModule } from 'primeng/fluid';
import { InputOtpModule } from 'primeng/inputotp';
import { interval } from 'rxjs';
import { AuthUser, TwoFactorChallenge } from '@/app/core/auth/auth.models';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { APP_SHELL_CONFIG } from '@/app/core/config/app-shell.config';
import { errorMessage } from '@/app/core/http/api-error';
import { AuthShellComponent, AuthStep } from '@/app/shared/ui/auth-shell/auth-shell.component';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';

const REMEMBERED_EMAIL_KEY = 'rememberedLoginEmail';
const RESEND_SECONDS = 30;

/** Sign-in screen shared by both apps (password, then a code when two-factor sign-in is on). */
@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, FluidModule, CheckboxModule, InputOtpModule, InputControlComponent, AuthShellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './login.html'
})
export class Login {
    private readonly auth = inject(AuthenticationService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly config = inject(APP_SHELL_CONFIG);
    private readonly destroyRef = inject(DestroyRef);

    readonly productName = this.config.productName;
    readonly isSellerApp = this.config.allowedRoles.includes('Seller');
    readonly steps: AuthStep[] = this.config.loginHighlights.map((label) => ({ label }));

    private readonly rememberedEmail = readRememberedEmail();
    readonly form = inject(FormBuilder).nonNullable.group({
        email: [this.rememberedEmail, [Validators.required, Validators.email, Validators.maxLength(256)]],
        password: ['', [Validators.required]],
        rememberMe: [this.rememberedEmail.length > 0]
    });
    readonly code = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] });

    readonly busy = signal(false);
    readonly errorMessage = signal('');
    readonly info = signal('');
    readonly challenge = signal<TwoFactorChallenge | null>(null);
    readonly resendIn = signal(0);
    private readonly formValid = signal(this.form.valid);
    readonly canSubmit = computed(() => this.formValid() && !this.busy());

    constructor() {
        this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe(() => this.formValid.set(this.form.valid));
        interval(1000)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.resendIn() > 0 && this.resendIn.update((s) => s - 1));
    }

    submit(): void {
        this.form.markAllAsTouched();
        if (!this.canSubmit()) return;
        const { email, password, rememberMe } = this.form.getRawValue();
        const trimmedEmail = email.trim();
        this.busy.set(true);
        this.errorMessage.set('');

        this.auth.login(trimmedEmail, password, rememberMe).subscribe({
            next: (result) => {
                rememberEmail(rememberMe ? trimmedEmail : null);
                this.busy.set(false);
                if (result.kind === 'twoFactor') {
                    this.challenge.set(result.challenge);
                    this.code.reset();
                    this.resendIn.set(result.challenge.method === 'sms' ? RESEND_SECONDS : 0);
                    return;
                }
                this.finish(result.user);
            },
            error: (error) => {
                this.busy.set(false);
                this.errorMessage.set(errorMessage(error, 'Could not sign in. Check your email and password.'));
            }
        });
    }

    verify(): void {
        const challenge = this.challenge();
        this.code.markAsTouched();
        if (!challenge || this.code.invalid || this.busy()) return;
        this.busy.set(true);
        this.errorMessage.set('');
        this.auth.verifyTwoFactor(challenge, this.code.value).subscribe({
            next: (user) => {
                this.busy.set(false);
                this.finish(user);
            },
            error: (error) => {
                this.busy.set(false);
                this.code.reset();
                this.errorMessage.set(errorMessage(error, "That code didn't work. Try again."));
            }
        });
    }

    resend(): void {
        const challenge = this.challenge();
        if (!challenge || this.resendIn() > 0) return;
        this.errorMessage.set('');
        this.auth.resendTwoFactor(challenge).subscribe({
            next: () => {
                this.resendIn.set(RESEND_SECONDS);
                this.info.set('A new code is on its way.');
            },
            error: (error) => this.errorMessage.set(errorMessage(error, 'Could not send a new code.'))
        });
    }

    back(): void {
        this.challenge.set(null);
        this.errorMessage.set('');
        this.info.set('');
        this.form.controls.password.reset();
    }

    private finish(user: AuthUser): void {
        if (!this.auth.canUseApp(user)) {
            this.auth.endSession();
            this.challenge.set(null);
            this.errorMessage.set(this.config.deniedMessage);
            return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || this.auth.homeUrl(user);
        void this.router.navigateByUrl(returnUrl);
    }
}

function readRememberedEmail(): string {
    try {
        return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
    } catch {
        return '';
    }
}

function rememberEmail(email: string | null): void {
    try {
        if (email) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
        // storage unavailable; nothing to remember
    }
}
