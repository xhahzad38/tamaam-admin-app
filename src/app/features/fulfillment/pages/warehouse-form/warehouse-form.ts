import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputControlComponent } from '@/app/shared/ui/input-control/input-control.component';
import { SelectControlComponent } from '@/app/shared/ui/select-control/select-control.component';

import { AdminFulfillmentService } from '@/app/features/fulfillment/data-access/fulfillment.service';
import { CityOption, Warehouse } from '@/app/features/fulfillment/data-access/fulfillment.models';

import { errorMessage } from '@/app/core/http/api-error';
import { PageHeaderComponent } from '@/app/shared/ui/page-header/page-header.component';
import { ErrorStateComponent } from '@/app/shared/ui/state/state.components';
@Component({
    selector: 'app-fulfillment-center-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, InputControlComponent, SelectControlComponent, ButtonModule, PageHeaderComponent, ErrorStateComponent],
    templateUrl: './warehouse-form.html'
})
export class FulfillmentCenterFormPage implements OnInit {
    private readonly fulfillment = inject(AdminFulfillmentService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);

    readonly crumbs: MenuItem[] = [{ label: 'Warehouses', routerLink: '/fulfillment/warehouses' }, { label: 'New fulfillment center' }];
    readonly form = new FormGroup({
        name: new FormControl('', { nonNullable: true }),
        contactName: new FormControl('', { nonNullable: true }),
        contactPhone: new FormControl('', { nonNullable: true }),
        addressLine1: new FormControl('', { nonNullable: true }),
        addressLine2: new FormControl('', { nonNullable: true }),
        cityId: new FormControl<string | null>(null),
        area: new FormControl('', { nonNullable: true }),
        postalCode: new FormControl('', { nonNullable: true }),
        processingTimeHours: new FormControl(24, { nonNullable: true }),
        directions: new FormControl('', { nonNullable: true }),
        isDefault: new FormControl(false, { nonNullable: true }),
        isActive: new FormControl(true, { nonNullable: true })
    });
    readonly cities = signal<CityOption[]>([]);
    readonly warehouse = signal<Warehouse | null>(null);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.fulfillment.cities().subscribe({
            next: (items) => this.cities.set(items),
            error: (error) => this.error.set(errorMessage(error, 'Could not load cities.'))
        });
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            return;
        }
        this.fulfillment.warehouse(id).subscribe({
            next: (warehouse) => {
                this.warehouse.set(warehouse);
                this.crumbs[1] = { label: warehouse.name };
                this.form.patchValue({
                    ...warehouse,
                    addressLine2: warehouse.addressLine2 ?? '',
                    area: warehouse.area ?? '',
                    postalCode: warehouse.postalCode ?? '',
                    directions: warehouse.directions ?? ''
                });
            },
            error: (error) => this.error.set(errorMessage(error, 'Could not load this fulfillment center.'))
        });
    }

    control(name: keyof typeof this.form.controls): FormControl {
        return this.form.controls[name] as FormControl;
    }

    save(): void {
        const raw = this.form.getRawValue();
        if (!raw.cityId) {
            this.error.set('Choose a city.');
            return;
        }
        const clean = (value: string) => value.trim() || null;
        this.saving.set(true);
        this.error.set(null);
        this.fulfillment
            .saveFulfillmentCenter({
                name: raw.name.trim(),
                contactName: raw.contactName.trim(),
                contactPhone: raw.contactPhone.trim(),
                addressLine1: raw.addressLine1.trim(),
                addressLine2: clean(raw.addressLine2),
                cityId: raw.cityId,
                area: clean(raw.area),
                postalCode: clean(raw.postalCode),
                processingTimeHours: Number(raw.processingTimeHours) || 24,
                directions: clean(raw.directions),
                isDefault: raw.isDefault,
                isActive: raw.isActive
            }, this.warehouse()?.id)
            .subscribe({
                next: (warehouse) => {
                    this.saving.set(false);
                    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${warehouse.name} (${warehouse.code}) was saved.`, life: 4000 });
                    void this.router.navigate(['/fulfillment/warehouses']);
                },
                error: (error) => {
                    this.saving.set(false);
                    this.error.set(errorMessage(error, 'Could not save the fulfillment center.'));
                }
            });
    }
}
