import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const slateSurface = {
    0: '#ffffff',
    50: '{slate.50}',
    100: '{slate.100}',
    200: '{slate.200}',
    300: '{slate.300}',
    400: '{slate.400}',
    500: '{slate.500}',
    600: '{slate.600}',
    700: '{slate.700}',
    800: '{slate.800}',
    900: '{slate.900}',
    950: '{slate.950}'
};

/**
 * Tamaam design system on top of PrimeNG Aura: brand emerald (#059669 = primary.600)
 * with slate surfaces. To rebrand, change the `primary` scale below; every PrimeNG
 * component and every `--tm-*` token in assets/theme follows automatically.
 */
export const TamaamPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b',
            950: '#022c22'
        },
        colorScheme: {
            light: {
                primary: { color: '{primary.600}', contrastColor: '#ffffff', hoverColor: '{primary.700}', activeColor: '{primary.800}' },
                surface: slateSurface
            },
            dark: {
                primary: { color: '{primary.400}', contrastColor: '{surface.950}', hoverColor: '{primary.300}', activeColor: '{primary.200}' },
                surface: slateSurface
            }
        }
    }
});
