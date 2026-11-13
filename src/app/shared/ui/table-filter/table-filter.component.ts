import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

/**
 * A labelled dropdown filter for the right side of a list toolbar.
 * Use instead of rows of toggle buttons or select buttons.
 *
 * <div class="table-toolbar">
 *     <div class="table-toolbar__search"><app-search-control (searchChange)="..." /></div>
 *     <div class="table-toolbar__filters">
 *         <app-table-filter inputId="offer-status" label="Status" [options]="statuses" [value]="status()" (valueChange)="setStatus($event)" />
 *     </div>
 * </div>
 */
@Component({
    selector: 'app-table-filter',
    standalone: true,
    imports: [FormsModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'table-filter' },
    template: `
        <label class="table-filter__label" [for]="inputId()">{{ label() }}</label>
        <p-select
            [inputId]="inputId()"
            [options]="$any(options())"
            [optionLabel]="optionLabel()"
            [optionValue]="optionValue()"
            [ngModel]="value()"
            (ngModelChange)="valueChange.emit($event)"
            [placeholder]="placeholder()"
            [showClear]="showClear()"
            appendTo="body"
            styleClass="w-full"
        />
    `
})
export class TableFilterComponent {
    readonly inputId = input.required<string>();
    readonly label = input.required<string>();
    readonly options = input.required<readonly object[]>();
    readonly optionLabel = input('label');
    readonly optionValue = input('value');
    readonly value = input<unknown>(null);
    /** Shown when the value is null, usually the "All …" option's label. */
    readonly placeholder = input('All');
    readonly showClear = input(false);
    readonly valueChange = output<any>();
}
