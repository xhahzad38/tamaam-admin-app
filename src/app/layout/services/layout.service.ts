import { Injectable, effect, signal, computed } from '@angular/core';

export interface LayoutConfig {
    preset: string;
    primary: string;
    surface: string | undefined | null;
    darkTheme: boolean;
    menuMode: string;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    menuHoverActive: boolean;
    activePath: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    layoutConfig = signal<LayoutConfig>({
        preset: 'Aura',
        primary: 'tamaam',
        surface: null,
        darkTheme: readDarkPreference(),
        menuMode: 'static'
    });

    layoutState = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        menuHoverActive: false,
        activePath: null
    });

    theme = computed(() => (this.layoutConfig().darkTheme ? 'light' : 'dark'));

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    private initialized = false;

    constructor() {
        // Apply the remembered theme before the first paint.
        this.toggleDarkMode();
        effect(() => {
            const config = this.layoutConfig();

            if (!this.initialized || !config) {
                this.initialized = true;
                return;
            }

            writeDarkPreference(config.darkTheme);
            this.handleDarkModeTransition(config);
        });
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        document.startViewTransition(() => {
            this.toggleDarkMode(config);
        });
    }

    /** Flip between light and dark; the choice is remembered in this browser. */
    switchTheme(): void {
        this.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    toggleDarkMode(config?: LayoutConfig): void {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, mobileMenuActive: !this.layoutState().mobileMenuActive }));
        }
    }

    showConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }

    hideConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: false }));
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }
}

const THEME_KEY = 'tm-dark-theme';

function readDarkPreference(): boolean {
    try {
        const stored = localStorage.getItem(THEME_KEY);
        return stored === null ? window.matchMedia?.('(prefers-color-scheme: dark)').matches === true : stored === '1';
    } catch {
        return false;
    }
}

function writeDarkPreference(dark: boolean): void {
    try {
        localStorage.setItem(THEME_KEY, dark ? '1' : '0');
    } catch {
        // Storage unavailable (e.g. private mode): the theme still works for this session.
    }
}
