import { inject, Injector } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from './auth-services';
import { TokenService } from './auth-services/token-service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const injector = inject(Injector);
  const isApiUrl = request.url.startsWith(environment.apiUrl);
  let cartKey = localStorage.getItem('cartKey');
  if (!cartKey) {
    cartKey = crypto.randomUUID();
    localStorage.setItem('cartKey', cartKey);
  }

  const isPublicUrl =
    request.url.includes('/api/account/authenticate') ||
    request.url.includes('/api/account/send-login-otp') ||
    request.url.includes('/api/account/verify-login-otp') ||
    request.url.includes('/api/account/forgot-password') ||
    request.url.includes('/api/account/reset-password');

  if (isApiUrl) {
    const headers: Record<string, string> = {};
    if (cartKey) {
      headers['X-Cart-Key'] = cartKey;
    }

    if (!isPublicUrl) {
      const authService = injector.get(AuthenticationService);
      const tokenService = injector.get(TokenService);
      const user = authService.userValue;
      const token = user?.jwToken;

      if (token) {
        if (tokenService.isTokenExpired(token)) {
          authService.logout();
          return next(request.clone({ setHeaders: headers }));
        }
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    request = request.clone({ setHeaders: headers });
  }

  return next(request);
};
