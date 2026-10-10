import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingBarService } from '@/app/shared/services/loading-bar.service';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingBar = inject(LoadingBarService);

  loadingBar.start();

  return next(request).pipe(finalize(() => loadingBar.stop()));
};
