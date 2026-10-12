import { Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { FluidModule } from 'primeng/fluid';
import { ToastModule } from 'primeng/toast';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { AuthenticationService } from '@/app/_helpers/auth-services/authentication.service';
import { InputControlComponent } from '@/app/shared-components/input-control/input-control.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ToastModule, FluidModule, CheckboxModule, AppFloatingConfigurator, InputControlComponent],
    templateUrl: './login.html',
    styleUrls: ['../register-seller/register-seller.scss', './login.scss']
})
export class Login {
    private readonly rememberedEmailKey = 'rememberedLoginEmail';
    readonly highlights = ['Seller applications', 'Section decisions', 'Approvals and rejections'];

    form: FormGroup;
    busy = signal(false);
    errorMessage = signal('');
    loginValid = signal(false);

    constructor(
        private readonly fb: FormBuilder,
        private readonly auth: AuthenticationService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly destroyRef: DestroyRef
    ) {
        const rememberedEmail = localStorage.getItem(this.rememberedEmailKey) ?? '';
        this.form = this.fb.group({
            email: [rememberedEmail, [Validators.required, Validators.email, Validators.maxLength(256)]],
            password: ['', [Validators.required]],
            rememberMe: [rememberedEmail.length > 0]
        });
        this.refreshLoginValid();
        this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshLoginValid());
    }

    submit(): void {
        this.form.markAllAsTouched();
        if (!this.loginValid() || this.busy()) {
            return;
        }

        const email = String(this.form.get('email')?.value ?? '').trim();
        const password = String(this.form.get('password')?.value ?? '');
        const rememberMe = !!this.form.get('rememberMe')?.value;
        this.busy.set(true);
        this.errorMessage.set('');
        this.auth.login(email, password, rememberMe).subscribe({
            next: (user) => {
                if (rememberMe) {
                    localStorage.setItem(this.rememberedEmailKey, email);
                } else {
                    localStorage.removeItem(this.rememberedEmailKey);
                }
                const roles: string[] = user?.roles ?? [];
                const canReview = roles.includes('SuperAdmin') || roles.includes('AdminReviewer');
                const canCatalog = roles.includes('CatalogAdmin');
                if (!canReview && !canCatalog) {
                    this.auth.endSession();
                    this.busy.set(false);
                    this.errorMessage.set('This account cannot sign in to the admin app.');
                    return;
                }
                this.busy.set(false);
                const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || this.auth.homeUrl();
                this.router.navigateByUrl(returnUrl);
            },
            error: (error) => {
                this.busy.set(false);
                this.errorMessage.set(error?.message || 'Could not sign in.');
            }
        });
    }

    private refreshLoginValid(): void {
        this.loginValid.set(this.form.valid);
    }
}
