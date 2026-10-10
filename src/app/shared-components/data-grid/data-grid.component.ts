import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    PaginatorModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ToolbarModule,
    MenuModule,
    SkeletonModule
  ],
  templateUrl: './data-grid.component.html',
  styleUrls: ['./data-grid.component.scss']
})
export class DataGridComponent implements OnInit, OnChanges, OnDestroy {
  @Input() title: string = 'Details';
  @Input() headers: string[] = [];
  @Input() data: any[] = [];
  @Input() hideMainFeatures: boolean = false;
  @Input() hideActions: boolean = false;
  @Input() hideEdit: boolean = false;
  @Input() hideToggle: boolean = false;
  @Input() hideDelete: boolean = false;
  @Input() clickableFields: string[] = [];
  @Input() showApprovalActions: boolean = false;
  @Input() totalRecords: number = 0;
  @Input() first: number = 0;
  @Input() rows: number = 10;
  @Input() loading = false;

  @Output() createRecord = new EventEmitter<any>();
  @Output() editRecord = new EventEmitter<any>();
  @Output() detailRecord = new EventEmitter<any>();
  @Output() fieldClick = new EventEmitter<{ field: string; row: any }>();
  @Output() toggleActiveRecord = new EventEmitter<any>();
  @Output() deleteRowRecord = new EventEmitter<any>();
  @Output() deleteRecord = new EventEmitter<any>();
  @Output() approveRecord = new EventEmitter<any>();
  @Output() rejectRecord = new EventEmitter<any>();
  @Output() selectedRecords = new EventEmitter<any[]>();
  @Output() onPageChange = new EventEmitter<any>();

  @ViewChild('rowActionMenu') rowActionMenu!: Menu;

  rowMenuModel: MenuItem[] = [];
  dataItems: any[] = [];
  selectedItems: any[] = [];

  get skeletonRows(): number[] {
    const count = Math.min(Math.max(this.rows, 1), 5);
    return Array.from({ length: count }, (_, i) => i);
  }

  get tableRows(): { id: string }[] | any[] {
    if (this.loading) {
      return this.skeletonRows.map((i) => ({ id: `__skeleton_${i}` }));
    }
    return this.dataItems;
  }

  get emptyColSpan(): number {
    return 1 + this.headers.length + (this.hideActions ? 0 : 1);
  }

  ngOnInit() {
    this.dataItems = this.data;
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.dataItems = this.data;
  }

  ngOnDestroy(): void {
    this.hideRowMenu();
  }

  openRowMenu(event: Event, rowData: unknown): void {
    event.preventDefault();
    event.stopPropagation();
    this.hideRowMenu();
    this.rowMenuModel = this.buildRowMenu(rowData);
    queueMicrotask(() => this.rowActionMenu?.toggle(event));
  }

  private hideRowMenu(): void {
    this.rowActionMenu?.hide();
    document.querySelectorAll('.p-overlay:has(.p-menu), body > .p-menu, .p-menu.p-popup').forEach((el) => el.remove());
  }

  private runRowAction(action: () => void): void {
    this.hideRowMenu();
    setTimeout(() => {
      this.hideRowMenu();
      action();
    }, 0);
  }

  private buildRowMenu(rowData: unknown): MenuItem[] {
    const row = rowData as Record<string, unknown>;
    const isActive = row['isActive'] === true;

    const items: MenuItem[] = [];

    if (!this.hideEdit) {
      items.push({
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.runRowAction(() => this.editRecord.emit(rowData))
      });
    }

    items.push({
      label: 'Details',
      icon: 'pi pi-info-circle',
      command: () => this.runRowAction(() => this.detailRecord.emit(rowData))
    });

    if (this.showApprovalActions) {
      items.push(
        { separator: true },
        {
          label: 'Approve',
          icon: 'pi pi-check',
          command: () => this.runRowAction(() => this.approveRecord.emit(rowData))
        },
        {
          label: 'Reject',
          icon: 'pi pi-ban',
          command: () => this.runRowAction(() => this.rejectRecord.emit(rowData))
        }
      );
    }

    const statusItems: MenuItem[] = [];
    if (!this.hideToggle) {
      statusItems.push({
        label: isActive ? 'Disable' : 'Enable',
        icon: isActive ? 'pi pi-times-circle' : 'pi pi-check-circle',
        command: () => this.runRowAction(() => this.toggleActiveRecord.emit(rowData))
      });
    }
    if (!this.hideDelete) {
      statusItems.push({
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => this.runRowAction(() => this.deleteRowRecord.emit(rowData))
      });
    }
    if (statusItems.length) {
      items.push({ separator: true }, ...statusItems);
    }

    return items;
  }

  isClickable(field: string): boolean {
    return this.clickableFields.includes(field);
  }

  onFieldClick(event: Event, field: string, row: unknown): void {
    event.preventDefault();
    event.stopPropagation();
    this.fieldClick.emit({ field, row });
  }

  create() {
    this.createRecord.emit(true);
  }

  delete() {
    this.deleteRecord.emit(true);
  }

  export() {}

  next() {
    this.first = this.first + this.rows;
  }

  prev() {
    this.first = this.first - this.rows;
  }

  reset() {
    this.first = 0;
  }

  pageChange(event: any) {
    this.onPageChange.emit(event);
  }

  isLastPage(): boolean {
    return this.dataItems ? this.first + this.rows >= this.dataItems.length : true;
  }

  isFirstPage(): boolean {
    return this.dataItems ? this.first === 0 : true;
  }

  getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  formatHeader(header: string): string {
    const withSpaces = header.replace(/([a-z])([A-Z])/g, '$1 $2');
    return withSpaces
      .split('.')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  onSelectionChange(_event: any) {
    if (this.loading) {
      this.selectedItems = [];
      return;
    }
    this.selectedRecords.emit(this.selectedItems);
  }
}
