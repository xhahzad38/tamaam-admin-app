import { InjectionToken } from '@angular/core';

/**
 * Everything that differs between the admin and seller apps lives in one object,
 * provided from each app's `src/app.config.ts`. Code under core/, shared/ and layout/
 * reads it instead of hard-coding app-specific roles, copy or menus, so those folders
 * stay byte-identical across both apps (see `npm run shared:check`).
 */
export interface AppShellConfig {
    /** Product name shown in the top bar and login screen, e.g. "Tamaam Admin". */
    productName: string;
    /** Users holding at least one of these roles may sign in. */
    allowedRoles: readonly string[];
    /** Shown on the login page when the account has none of `allowedRoles`. */
    deniedMessage: string;
    /** Short bullet points on the login hero panel. */
    loginHighlights: readonly string[];
    /** Where a freshly signed-in user lands. */
    homeUrl: (roles: readonly string[]) => string;
    /**
     * Which sidebar `GET api/Menu?app=` returns for this app (`Menus.App` in the database,
     * seeded by tamaam-api `Persistence/Seeds/DefaultMenus.cs`).
     */
    menuApp: 'Admin' | 'Seller';
}

export const APP_SHELL_CONFIG = new InjectionToken<AppShellConfig>('APP_SHELL_CONFIG');
