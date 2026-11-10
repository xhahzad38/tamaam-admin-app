import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';

/** The standard paginator under every server-paged table. */
@Component({
    selector: 'app-table-paginator',
    standalone: true,
    imports: [PaginatorModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (total() > 0) {
            <p-paginator
                [first]="first()"
                [rows]="rows()"
                [totalRecords]="total()"
                [rowsPerPageOptions]="rowsPerPageOptions()"
                [showCurrentPageReport]="true"
                currentPageReportTemplate="{first}–{last} of {totalRecords}"
                (onPageChange)="pageChange.emit($event)"
                styleClass="mt-3"
            />
        }
    `
})
export class TablePaginatorComponent {
    readonly first = input(0);
    readonly rows = input(10);
    readonly total = input(0);
    readonly rowsPerPageOptions = input([10, 20, 50]);
    readonly pageChange = output<PaginatorState>();
}
