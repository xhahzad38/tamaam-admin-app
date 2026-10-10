import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-drawer',
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule],
  templateUrl: './side-drawer.component.html',
  styleUrls: ['./side-drawer.component.scss']
})
export class SidedrawerComponent {

  @Input() showDrawer: boolean = false;
  @Input() title: string = '';
  /** Tailwind classes applied to the drawer panel, e.g. to control its width per consumer. */
  @Input() panelClass: string = '';

  @Output() closeDrawer = new EventEmitter<void>();

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeDrawer.emit();
    }
  }
}