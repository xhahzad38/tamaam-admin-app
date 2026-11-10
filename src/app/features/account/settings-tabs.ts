import { InjectionToken, Type } from '@angular/core';

/** A tab on the Settings page. Built-in tabs: profile, security, notifications. */
export interface SettingsTab {
    /** URL segment: /settings/<key> */
    key: string;
    label: string;
    icon: string;
    /** Standalone component rendered as the tab body. */
    component: () => Promise<Type<unknown>>;
}

/**
 * Extra, app-specific settings tabs (e.g. the seller's Store profile and Business & bank),
 * inserted after "Profile". Provide in the app's app.config.ts.
 */
export const SETTINGS_TABS = new InjectionToken<SettingsTab[]>('SETTINGS_TABS', { factory: () => [] });

/** Optional page copy override, e.g. "Profile & store settings" for sellers. */
export const SETTINGS_COPY = new InjectionToken<{ title: string; subtitle: string }>('SETTINGS_COPY', {
    factory: () => ({ title: 'Settings', subtitle: 'Your profile, password and notifications.' })
});
