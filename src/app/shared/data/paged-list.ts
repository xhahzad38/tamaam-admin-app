import { DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorState } from 'primeng/paginator';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';
import { PageResult } from '@/app/core/api/api.types';
import { errorMessage } from '@/app/core/http/api-error';

export interface PageRequest {
    /** 1-based, as the API expects. */
    pageNo: number;
    pageSize: number;
    search: string;
}

export interface PagedListOptions {
    pageSize?: number;
    /** Shown when the API gives no usable message. */
    errorMessage?: string;
    /** Load immediately (default true). */
    autoLoad?: boolean;
}

/**
 * State for a server-paged, searchable list: items, paging, loading and error.
 * Replaces the hand-written signals + subscribe blocks that every list page repeated.
 * A new load cancels the previous one, and everything is torn down with the component.
 *
 * Call it in a field initializer (it needs an injection context):
 *
 *   readonly list = createPagedList((req) => this.brands.list(req.search, req.pageNo, req.pageSize), {
 *       errorMessage: 'Could not load brands.'
 *   });
 *
 * Template: list.items(), list.loading(), list.error(), list.reload(), list.search(text), list.page($event)
 */
export function createPagedList<T>(loader: (request: PageRequest) => Observable<PageResult<T>>, options: PagedListOptions = {}) {
    const destroyRef = inject(DestroyRef);
    const fallback = options.errorMessage ?? 'Could not load the list.';

    const items = signal<T[]>([]);
    const total = signal(0);
    const loading = signal(false);
    const error = signal<string | null>(null);
    const first = signal(0);
    const rows = signal(options.pageSize ?? 10);
    const query = signal('');
    const loaded = signal(false);

    const request = (): PageRequest => ({ pageNo: Math.floor(first() / rows()) + 1, pageSize: rows(), search: query().trim() });

    const trigger = new Subject<void>();
    trigger
        .pipe(
            tap(() => {
                loading.set(true);
                error.set(null);
            }),
            switchMap(() =>
                loader(request()).pipe(
                    tap((page) => {
                        items.set(page.items ?? []);
                        total.set(page.totalCount ?? 0);
                        loaded.set(true);
                    }),
                    catchError((err) => {
                        error.set(errorMessage(err, fallback));
                        return EMPTY;
                    }),
                    finalize(() => loading.set(false))
                )
            ),
            takeUntilDestroyed(destroyRef)
        )
        .subscribe();

    const list = {
        items: items.asReadonly(),
        total: total.asReadonly(),
        loading: loading.asReadonly(),
        error: error.asReadonly(),
        first: first.asReadonly(),
        rows: rows.asReadonly(),
        query: query.asReadonly(),
        /** True once at least one page has loaded (use to tell "empty" from "not loaded yet"). */
        loaded: loaded.asReadonly(),
        isEmpty: computed(() => loaded() && !loading() && items().length === 0),

        reload(): void {
            trigger.next();
        },
        /** New search text; jumps back to the first page. */
        search(text: string): void {
            query.set(text);
            first.set(0);
            trigger.next();
        },
        page(event: PaginatorState): void {
            first.set(event.first ?? 0);
            rows.set(event.rows ?? rows());
            trigger.next();
        },
        /** Back to page one, keeping the search (use after filters change). */
        reset(): void {
            first.set(0);
            trigger.next();
        },
        /** Replace an item locally after an edit, without refetching. */
        patch(predicate: (item: T) => boolean, update: (item: T) => T): void {
            items.update((list) => list.map((item) => (predicate(item) ? update(item) : item)));
        }
    };

    if (options.autoLoad !== false) {
        // Defer so the component's own fields (services, filters) are initialised first.
        queueMicrotask(() => trigger.next());
    }
    return list;
}

export type PagedList<T> = ReturnType<typeof createPagedList<T>>;
