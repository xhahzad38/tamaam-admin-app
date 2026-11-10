import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, AbstractControl, FormControl, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleButtonModule } from 'primeng/togglebutton';

@Component({
  selector: 'app-input-control',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    InputTextModule,
    Password,
    FluidModule, 
    ButtonModule, 
    SelectModule, 
    FormsModule, 
    TextareaModule,
    ToggleButtonModule
  ],
  templateUrl: './input-control.component.html',
  styleUrls: ['./input-control.component.scss']
})
export class InputControlComponent {

  @Input() control!: AbstractControl;
  @Input() label = '';
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() inputId = '';
  @Input() autocomplete = '';
  @Input() maxLength: number | null = null;
  @Input() minLength: number | null = null;
  @Input() readonly: boolean = false;
  @Input() showCount: boolean = true;
  /** Render the validation message in the normal flow instead of overlaying the next element. */
  @Input() flowError = false;

  // Cast for [formControl] binding — FormControl is a narrowing of AbstractControl
  get asFormControl(): FormControl {
    return this.control as FormControl;
  }

  // 🔥 Show error only when user interacts
  get showError(): boolean {
    return this.control?.invalid && (this.control?.dirty || this.control?.touched);
  }

  // 🔥 Centralized error handler
  get errorMessage(): string {
    if (!this.control?.errors) return '';

    const e = this.control.errors;
    
    if (e['required']) return this.label ? `${this.label} is required` : 'This field is required';
    if (e['email']) return 'Invalid email format';
    if (e['minlength']) return `Minimum ${e['minlength'].requiredLength} characters required`;
    if (e['maxlength']) return `Maximum ${e['maxlength'].requiredLength} characters allowed`;
    if (e['min']) return `Value must be ≥ ${e['min'].min}`;
    if (e['max']) return `Value must be ≤ ${e['max'].max}`;
    const custom = Object.values(e).find((value) => typeof value === 'string');
    if (custom) return custom;
    if (e['pattern']) return 'Invalid format';

    return 'Invalid field';
  }

  // Character count
  get currentLength(): number {
    return this.control?.value?.length || 0;
  }

  // Auto detect required
  get isRequired(): boolean {
    return this.control?.hasValidator?.(null as any) ? true : false;
  }
}