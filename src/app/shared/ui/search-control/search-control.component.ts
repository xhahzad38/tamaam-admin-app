import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * Search box for list screens. Emits `searchChange` as the user types (debounced),
 * and immediately on Enter.
 */
@Component({
    selector: 'app-search-control',
    standalone: true,
    imports: [IconFieldModule, InputIconModule, InputTextModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './search-control.component.html',
    styleUrls: ['./search-control.component.scss']
})
export class SearchControlComponent implements OnInit {
    readonly placeholder = input('Search');
    /** Initial text, e.g. from a query param. */
    readonly value = input('');
    readonly debounceMs = input(300);
    readonly searchChange = output<string>();

    private readonly destroyRef = inject(DestroyRef);
    private readonly typed = new Subject<string>();
    private last: string | null = null;

    ngOnInit(): void {
        this.last = this.value();
        this.typed
            .pipe(debounceTime(this.debounceMs()), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe((text) => this.emit(text));
    }

    onInput(event: Event): void {
        this.typed.next((event.target as HTMLInputElement).value);
    }

    onEnter(event: Event): void {
        this.emit((event.target as HTMLInputElement).value);
    }

    private emit(text: string): void {
        const trimmed = text.trim();
        if (trimmed === this.last) {
            return;
        }
        this.last = trimmed;
        this.searchChange.emit(trimmed);
    }
}
