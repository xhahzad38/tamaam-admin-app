import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItem, TreeNode, TreeTableNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';

export interface TreeTableColumn {
    field: string;
    header: string;
}

@Component({
    selector: 'app-tree-data-grid',
    standalone: true,
    imports: [CommonModule, FormsModule, TreeTableModule, ButtonModule, CheckboxModule, MenuModule, SkeletonModule],
    templateUrl: './tree-data-grid.component.html',
    styleUrls: ['./tree-data-grid.component.scss']
})

export class TreeDataGridComponent implements OnChanges {

    readonly dataColumnWidths = ['18rem', '12rem', '6rem', '8rem', '6rem'];
    columnWidth(index: number): string {
        return this.dataColumnWidths.at(index) ?? '10rem';
    }

    @Input() columns: TreeTableColumn[] = [];
    @Input() value: TreeNode[] = [];
    @Input() dataKey = 'key';
    @Input() hideActions = false;
    @Input() loading = false;

    @Output() editRecord = new EventEmitter<any>();
    @Output() detailRecord = new EventEmitter<any>();
    @Output() toggleActiveRecord = new EventEmitter<any>();
    @Output() deleteRowRecord = new EventEmitter<any>();
    @Output() selectedRecords = new EventEmitter<any[]>();

    @ViewChild('rowActionMenu') rowActionMenu!: Menu;

    rowMenuModel: MenuItem[] = [];

    private readonly skeletonRowCount = 5;

    private selectedIdSet = new Set<string>();

    get skeletonRows(): number[] {
        return Array.from({ length: this.skeletonRowCount }, (_, i) => i);
    }

    get displayValue(): TreeNode[] {
        if (this.loading) {
            return this.skeletonRows.map((i) => ({
                key: `__skeleton_${i}`,
                data: {}
            }));
        }
        return this.value;
    }

    get emptyColSpan(): number {
        return 1 + this.columns.length + (this.hideActions ? 0 : 1);
    }

    openRowMenu(event: Event, rowData: unknown): void {
        event.stopPropagation();
        this.rowMenuModel = this.buildRowMenu(rowData);
        this.rowActionMenu.toggle(event);
    }

    private buildRowMenu(rowData: unknown): MenuItem[] {
        const row = rowData as Record<string, unknown>;
        const isActive = row['isActive'] === true;

        return [
            {
                label: 'Edit',
                icon: 'pi pi-pencil',
                command: () => this.editRecord.emit(rowData)
            },
            {
                label: 'Details',
                icon: 'pi pi-info-circle',
                command: () => this.detailRecord.emit(rowData)
            },
            { separator: true },
            {
                label: isActive ? 'Disable' : 'Enable',
                icon: isActive ? 'pi pi-times-circle' : 'pi pi-check-circle',
                command: () => this.toggleActiveRecord.emit(rowData)
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => this.deleteRowRecord.emit(rowData)
            }
        ];
    }

    formatCell(rowData: Record<string, unknown>, field: string): unknown {
        const value = rowData?.[field];
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        return value == null ? '' : value;
    }

    isRowSelected(rowNode: TreeTableNode): boolean {
        const key = this.resolveKey(rowNode);
        return key != null && this.selectedIdSet.has(key);
    }

    get allRowsSelected(): boolean {
        if (this.loading) {
            return false;
        }

        const keys = this.collectAllKeys(this.value);
        return keys.length > 0 && keys.every((k) => this.selectedIdSet.has(k));
    }

    get someRowsSelected(): boolean {
        if (this.loading) {
            return false;
        }

        return this.selectedIdSet.size > 0 && !this.allRowsSelected;
    }

    onRowCheckboxChange(rowNode: TreeTableNode, checked: boolean): void {
        if (this.loading) {
            return;
        }

        const key = this.resolveKey(rowNode);
        if (key == null) {
            return;
        }

        if (checked) {
            this.selectedIdSet.add(key);
        } else {
            this.selectedIdSet.delete(key);
        }

        this.emitSelectedRecords();
    }

    onHeaderCheckboxChange(checked: boolean): void {
        if (this.loading) {
            return;
        }

        const keys = this.collectAllKeys(this.value);
        if (checked) {
            keys.forEach((k) => this.selectedIdSet.add(k));
        } else {
            this.selectedIdSet.clear();
        }

        this.emitSelectedRecords();
    }

    clearSelection(): void {
        this.selectedIdSet.clear();
        this.emitSelectedRecords();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['loading']?.currentValue === true) {
            this.clearSelection();
        }

        if (changes['value']) {
            const validKeys = new Set(this.collectAllKeys(this.value));
            for (const id of [...this.selectedIdSet]) {
                if (!validKeys.has(id)) {
                    this.selectedIdSet.delete(id);
                }
            }

            this.emitSelectedRecords();
        }
    }

    private emitSelectedRecords(): void {
        const selected = this.collectSelectedRowData(this.value);
        this.selectedRecords.emit(selected);
    }

    private resolveKey(rowNode: TreeTableNode): string | null {
        const node = rowNode.node;
        if (!node) {
            return null;
        }

        const fromNode = node.key != null ? node.key : (node.data as Record<string, unknown> | undefined)?.[this.dataKey];
        return fromNode != null ? String(fromNode) : null;
    }

    private collectAllKeys(nodes: TreeNode[]): string[] {
        const keys: string[] = [];
        const walk = (items: TreeNode[]) => {

            for (const node of items) {
                const nodeKey = node.key?.toString();
                const key = nodeKey != null ? nodeKey : (node.data as Record<string, unknown> | undefined)?.[this.dataKey];

                if (key != null) {

                    keys.push(String(key));
                }

                if (node.children?.length) {

                    walk(node.children);
                }
            }
        };

        walk(nodes);

        return keys;
    }

    private collectSelectedRowData(nodes: TreeNode[]): any[] {

        const selected: any[] = [];
        const walk = (items: TreeNode[]) => {

            for (const node of items) {
                const nodeKey = node.key?.toString();
                const key = nodeKey != null ? nodeKey : (node.data as Record<string, unknown> | undefined)?.[this.dataKey];

                if (key != null && this.selectedIdSet.has(String(key))) {
                    selected.push(node.data);
                }

                if (node.children?.length) {
                    walk(node.children);
                }
            }
        };

        walk(nodes);
        return selected;
    }
}


