import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { APP_SHELL_CONFIG } from '@/app/core/config/app-shell.config';
import { errorInterceptor, jwtInterceptor, loadingInterceptor } from '@/app/core/http';
import { TamaamPreset } from '@/app/shared/theme/tamaam.preset';
import { appRoutes } from './app.routes';
import { ADMIN_SHELL } from './app.shell';

export const appConfig: ApplicationConfig = {
    providers: [
        { provide: APP_SHELL_CONFIG, useValue: ADMIN_SHELL },
        MessageService,
        ConfirmationService,
        provideZonelessChangeDetection(),
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
            withEnabledBlockingInitialNavigation()
        ),
        providePrimeNG({
            theme: { preset: TamaamPreset, options: { darkModeSelector: '.app-dark' } }
        }),
        // Order matters: errorInterceptor is outermost so jwtInterceptor can refresh on a 401 before it becomes a sign-out.
        provideHttpClient(withInterceptors([errorInterceptor, jwtInterceptor, loadingInterceptor]))
    ]
};
