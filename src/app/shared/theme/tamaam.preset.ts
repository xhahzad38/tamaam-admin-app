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
 * Tamaam design system on top of PrimeNG Aura: brand green (#1f8a4c = primary.600)
 * with slate surfaces. To rebrand, change the `primary` scale below; every PrimeNG
 * component and every `--tm-*` token in assets/theme follows automatically.
 */
export const TamaamPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#eefbf3',
            100: '#d6f5e1',
            200: '#afe9c6',
            300: '#7bd6a3',
            400: '#45bb7b',
            500: '#23a05e',
            600: '#1f8a4c',
            700: '#196d3e',
            800: '#175734',
            900: '#13472c',
            950: '#082817'
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
