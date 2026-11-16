import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { ApiResponse } from '@/app/core/api/api.types';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { APP_SHELL_CONFIG } from '@/app/core/config/app-shell.config';
import { MenuDto, NavSection, toNavSections } from '@/app/core/config/navigation.models';
import { inlineErrors } from '@/app/core/http/api-error';

/**
 * Sidebar menu from the database (`GET api/Menu?app=Admin|Seller`), already filtered by the
 * user's roles on the server. Reloads whenever the signed-in user changes.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthenticationService);
    private readonly shell = inject(APP_SHELL_CONFIG);
    private readonly url = `${environment.apiUrl}/api/Menu`;

    /** null until the first response (or error) for the current user. */
    private readonly remote = signal<NavSection[] | null>(null);
    private readonly failed = signal(false);

    readonly loading = computed(() => this.remote() === null && !this.failed());

    /** True when the last load failed; the sidebar stays empty until `reload()` succeeds. */
    readonly error = this.failed.asReadonly();

    readonly sections = computed<NavSection[]>(() => this.remote() ?? []);

    /** Changes only on sign-in/out or a role change, not on token refresh or profile patches. */
    private readonly identity = computed(() => {
        const user = this.auth.currentUser();
        return user ? `${user.id}|${[...user.roles].sort().join(',')}` : null;
    });

    constructor() {
        effect(() => {
            const identity = this.identity();
            this.remote.set(null);
            this.failed.set(false);
            if (identity) this.load();
        });
    }

    reload(): void {
        if (this.auth.currentUser()) this.load();
    }

    private load(): void {
        const params = new HttpParams().set('app', this.shell.menuApp);
        this.http.get<ApiResponse<MenuDto[]>>(this.url, { params, context: inlineErrors }).subscribe({
            next: (response) => {
                this.failed.set(false);
                this.remote.set(toNavSections(response.data ?? []));
            },
            error: () => this.failed.set(true)
        });
    }
}
