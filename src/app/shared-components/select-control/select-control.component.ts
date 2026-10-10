import { Component, ContentChild, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-select-control',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MultiSelectModule, SelectModule],
  templateUrl: './select-control.component.html',
  styleUrls: ['./select-control.component.scss']
})
export class SelectControlComponent {
  /** false = single (p-select), true = multi (p-multiselect) */
  @Input() multiple = false;

  @Input() control!: AbstractControl;
  @Input() label = '';
  @Input() inputId = '';
  @Input() appendTo: string | HTMLElement | null = null;
  @Input() placeholder = 'Select';
  @Input() options: unknown[] = [];
  @Input() optionLabel = 'name';
  @Input() optionValue?: string;
  @Input() filter = true;
  @Input() showClear = true;
  @Input() display: 'chip' | 'comma' = 'chip';
  @Input() maxSelectedLabels?: number;
  /** Render the validation message in the normal flow instead of overlaying the next element. */
  @Input() flowError = false;

  @ContentChild('item', { read: TemplateRef }) itemTemplate?: TemplateRef<unknown>;
  @ContentChild('selecteditems', { read: TemplateRef }) selectedItemsTemplate?: TemplateRef<unknown>;

  get asFormControl(): FormControl {
    return this.control as FormControl;
  }

  get showError(): boolean {
    return this.control?.invalid && (this.control?.dirty || this.control?.touched);
  }

  get errorMessage(): string {
    if (!this.control?.errors) return '';

    const e = this.control.errors;

    if (e['required']) return `${this.label || 'Field'} is required`;
    if (e['minlength']) return `Select at least ${e['minlength'].requiredLength} item(s)`;
    if (e['maxlength']) return `Select at most ${e['maxlength'].requiredLength} item(s)`;

    return 'Invalid field';
  }

  getOptionLabel(item: unknown): string {
    if (item == null) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (typeof item === 'object' && this.optionLabel) {
      const value = (item as Record<string, unknown>)[this.optionLabel];
      return value == null ? '' : String(value);
    }
    return String(item);
  }
}
