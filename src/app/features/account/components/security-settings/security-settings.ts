import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { errorMessage } from '@/app/core/http/api-error';
import { relativeTime } from '@/app/core/services/notification.service';
import { TwoFactorDialogComponent } from '@/app/features/account/components/two-factor-dialog/two-factor-dialog';
import { AccountService, Session, TwoFactorMethod, TwoFactorStatus } from '@/app/features/account/data-access/account.service';
import { ConfirmService } from '@/app/shared/ui/confirm/confirm.service';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { ErrorStateComponent, LoadingStateComponent, NoticeComponent } from '@/app/shared/ui/state/state.components';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const { newPassword, confirmPassword } = group.value as { newPassword: string; confirmPassword: string };
    return confirmPassword && newPassword !== confirmPassword ? { passwordMismatch: true } : null;
}

/** 8+ characters with at least one number. */
const PASSWORD_RULE = /^(?=.*\d).{8,}$/;

/** "Security" tab: password, two-factor sign-in and active sessions. */
@Component({
    selector: 'app-security-settings',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, RouterLink, ButtonModule, DialogModule, SelectModule, TagModule, ToggleSwitchModule, InputControlComponent, ErrorStateComponent, LoadingStateComponent, NoticeComponent, TwoFactorDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './security-settings.html',
    styleUrl: './security-settings.scss'
})
export class SecuritySettingsComponent implements OnInit {
    private readonly account = inject(AccountService);
    private readonly auth = inject(AuthenticationService);
    private readonly confirm = inject(ConfirmService);

    // ---- password
    readonly form = inject(FormBuilder).nonNullable.group(
        {
            currentPassword: ['', [Validators.required]],
            newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_RULE), Validators.maxLength(100)]],
            confirmPassword: ['', [Validators.required]]
        },
        { validators: passwordsMatch }
    );
    readonly savingPassword = signal(false);
    readonly passwordError = signal<string | null>(null);
    readonly passwordNotice = signal<string | null>(null);

    // ---- two-factor
    readonly twoFactor = signal<TwoFactorStatus | null>(null);
    readonly methodOptions = [
        { label: 'SMS', value: TwoFactorMethod.Sms },
        { label: 'Authenticator app', value: TwoFactorMethod.Authenticator }
    ];
    readonly chosenMethod = signal<TwoFactorMethod>(TwoFactorMethod.Sms);
    readonly setupOpen = signal(false);
    readonly disableOpen = signal(false);
    readonly disablePassword = new FormControl('', { nonNullable: true, validators: [Validators.required] });
    readonly disabling = signal(false);
    readonly twoFactorError = signal<string | null>(null);
    readonly twoFactorNotice = signal<string | null>(null);
    /** What the switch shows; snaps back to the real state when a dialog closes without a change. */
    readonly switchOn = signal(false);

    constructor() {
        effect(() => {
            const open = this.setupOpen() || this.disableOpen();
            if (!open) untracked(() => this.switchOn.set(!!this.twoFactor()?.enabled));
        });
    }

    // ---- sessions
    readonly sessions = signal<Session[]>([]);
    readonly sessionsLoading = signal(true);
    readonly sessionsError = signal<string | null>(null);
    readonly busySession = signal<string | null>(null);
    readonly others = computed(() => this.sessions().filter((s) => !s.isCurrent).length);
    readonly ago = relativeTime;

    ngOnInit(): void {
        this.loadTwoFactor();
        this.loadSessions();
    }

    // ---------------------------------------------------------------- password

    savePassword(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.savingPassword()) return;
        this.savingPassword.set(true);
        this.passwordError.set(null);
        this.passwordNotice.set(null);
        this.account.changePassword(this.form.getRawValue()).subscribe({
            next: () => {
                this.savingPassword.set(false);
                this.form.reset();
                this.passwordNotice.set('Password updated. Your other devices were signed out.');
                this.loadSessions();
            },
            error: (err) => {
                this.savingPassword.set(false);
                this.passwordError.set(errorMessage(err, 'Could not update your password.'));
            }
        });
    }

    // ---------------------------------------------------------------- two-factor

    loadTwoFactor(): void {
        this.account.twoFactor().subscribe({
            next: (status) => {
                this.twoFactor.set(status);
                this.switchOn.set(status.enabled);
                if (status.method === 'authenticator') this.chosenMethod.set(TwoFactorMethod.Authenticator);
                else if (!status.hasPhone) this.chosenMethod.set(TwoFactorMethod.Authenticator);
            },
            error: (err) => this.twoFactorError.set(errorMessage(err, 'Could not load two-factor settings.'))
        });
    }

    onToggle(on: boolean): void {
        this.switchOn.set(on);
        this.twoFactorError.set(null);
        this.twoFactorNotice.set(null);
        if (on) this.startSetup();
        else this.disableOpen.set(true);
    }

    /** Switching method while on = set up the new method (replaces the old one). */
    onMethodChange(method: TwoFactorMethod): void {
        this.chosenMethod.set(method);
        if (this.twoFactor()?.enabled) this.startSetup();
    }

    startSetup(): void {
        if (this.chosenMethod() === TwoFactorMethod.Sms && !this.twoFactor()?.hasPhone) {
            this.twoFactorError.set('Add a mobile number under My profile to use SMS, or choose an authenticator app.');
            this.switchOn.set(!!this.twoFactor()?.enabled);
            return;
        }
        this.setupOpen.set(true);
    }

    onEnabled(status: TwoFactorStatus): void {
        this.twoFactor.set(status);
        this.switchOn.set(true);
        this.twoFactorNotice.set(status.method === 'sms' ? 'Two-factor sign-in is on. We will text you a code each time you sign in.' : 'Two-factor sign-in is on. Use your authenticator app each time you sign in.');
    }

    disableTwoFactor(): void {
        this.disablePassword.markAsTouched();
        if (this.disablePassword.invalid || this.disabling()) return;
        this.disabling.set(true);
        this.twoFactorError.set(null);
        this.account.disableTwoFactor(this.disablePassword.value).subscribe({
            next: (status) => {
                this.disabling.set(false);
                this.twoFactor.set(status);
                this.disableOpen.set(false);
                this.disablePassword.reset();
                this.twoFactorNotice.set('Two-factor sign-in is off.');
            },
            error: (err) => {
                this.disabling.set(false);
                this.twoFactorError.set(errorMessage(err, 'Could not turn off two-factor sign-in.'));
            }
        });
    }

    // ---------------------------------------------------------------- sessions

    loadSessions(): void {
        this.sessionsLoading.set(true);
        this.sessionsError.set(null);
        this.account.sessions().subscribe({
            next: (list) => {
                this.sessions.set(list);
                this.sessionsLoading.set(false);
            },
            error: (err) => {
                this.sessionsError.set(errorMessage(err, 'Could not load your sessions.'));
                this.sessionsLoading.set(false);
            }
        });
    }

    async signOutSession(session: Session): Promise<void> {
        if (session.isCurrent) {
            if (await this.confirm.ask({ message: 'Sign out of Tamaam on this device?', acceptLabel: 'Sign out' })) this.auth.logout();
            return;
        }
        if (!(await this.confirm.ask({ message: `Sign out ${session.browser} on ${session.os}?`, acceptLabel: 'Sign out', danger: true }))) return;
        this.busySession.set(session.id);
        this.account.revokeSession(session.id).subscribe({
            next: () => {
                this.busySession.set(null);
                this.sessions.update((list) => list.filter((s) => s.id !== session.id));
            },
            error: (err) => {
                this.busySession.set(null);
                this.sessionsError.set(errorMessage(err, 'Could not sign out that session.'));
            }
        });
    }

    async signOutOthers(): Promise<void> {
        if (!(await this.confirm.ask({ message: `Sign out of ${this.others()} other session(s)? You stay signed in here.`, acceptLabel: 'Sign out all others', danger: true }))) return;
        this.busySession.set('others');
        this.account.revokeOtherSessions().subscribe({
            next: () => {
                this.busySession.set(null);
                this.sessions.update((list) => list.filter((s) => s.isCurrent));
            },
            error: (err) => {
                this.busySession.set(null);
                this.sessionsError.set(errorMessage(err, 'Could not sign out the other sessions.'));
            }
        });
    }

    deviceIcon(session: Session): string {
        return session.deviceType === 'mobile' ? 'pi pi-mobile' : session.deviceType === 'tablet' ? 'pi pi-tablet' : 'pi pi-desktop';
    }
}
