import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    NavigationCancel,
    NavigationEnd,
    NavigationError,
    NavigationStart,
    Router
} from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class LoadingBarService {
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    private pending = 0;
    private trickleId: ReturnType<typeof setInterval> | null = null;
    private completeTimeoutId: ReturnType<typeof setTimeout> | null = null;

    readonly visible = signal(false);
    readonly progress = signal(0);

    constructor() {
        this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
            if (event instanceof NavigationStart) {
                this.dismissPopupMenus();
                this.start();
                return;
            }

            if (
                event instanceof NavigationEnd ||
                event instanceof NavigationCancel ||
                event instanceof NavigationError
            ) {
                this.stop();
            }
        });

        this.destroyRef.onDestroy(() => {
            this.clearTrickle();
            this.clearCompleteTimeout();
        });
    }

    start(): void {
        this.pending++;
        if (this.pending === 1) {
            this.begin();
        }
    }

    stop(): void {
        this.pending = Math.max(0, this.pending - 1);
        if (this.pending === 0) {
            this.complete();
        }
    }

    private begin(): void {
        this.clearCompleteTimeout();
        this.visible.set(true);
        this.progress.set(0);
        requestAnimationFrame(() => this.progress.set(20));
        this.startTrickle();
    }

    private startTrickle(): void {
        this.clearTrickle();
        this.trickleId = setInterval(() => {
            const current = this.progress();
            if (current >= 80) {
                return;
            }

            this.progress.set(current + (80 - current) * 0.1);
        }, 200);
    }

    private complete(): void {
        this.clearTrickle();
        this.progress.set(100);
        this.dismissPopupMenus();
        this.completeTimeoutId = setTimeout(() => {
            this.visible.set(false);
            this.progress.set(0);
        }, 300);
    }

    private dismissPopupMenus(): void {
        document.querySelectorAll('.p-overlay:has(.p-menu), body > .p-menu, .p-menu.p-popup').forEach((el) => el.remove());
        document.querySelectorAll('.p-overlay-mask, .p-overflow-hidden').forEach((el) => {
            if (el instanceof HTMLElement && el.classList.contains('p-overlay-mask')) {
                el.remove();
            }
        });
        document.body.classList.remove('p-overflow-hidden', 'p-overlay-open');
    }

    private clearTrickle(): void {
        if (this.trickleId !== null) {
            clearInterval(this.trickleId);
            this.trickleId = null;
        }
    }

    private clearCompleteTimeout(): void {
        if (this.completeTimeoutId !== null) {
            clearTimeout(this.completeTimeoutId);
            this.completeTimeoutId = null;
        }
    }
}
