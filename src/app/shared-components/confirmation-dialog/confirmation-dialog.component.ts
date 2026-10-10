import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ToastModule,
    DialogModule,
    ButtonModule,
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements OnChanges {
  @Input() title: string = 'Confirmation';
  @Input() message: string = 'Are you sure you want to proceed?'
  @Input() openConfirmDialog: boolean = false;
  
  @Output() confirmed = new EventEmitter<boolean>();

  constructor(
    private messageService: MessageService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['openConfirmDialog'] && changes['openConfirmDialog'].currentValue) {
      this.openConfirmDialog = true;
    }
  }

  openConfirmation() {
    this.openConfirmDialog = true;
  }

  closeConfirmation() {
    this.openConfirmDialog = false;
  }

  confirm(value: boolean) {
    this.openConfirmDialog = false;
    this.confirmed.emit(value);
  }
}