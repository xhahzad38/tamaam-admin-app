import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ApiResponse, PageResult } from '@/app/core/api/api.types';

import {
    CityOption,
    FulfillmentType,
    InboundLabels,
    InboundShipmentDetail,
    InboundShipmentListItem,
    InboundStatus,
    Offer,
    OfferStatus,
    Warehouse,
    WarehouseOwnerType
} from './fulfillment.models';

import { inlineErrors } from '@/app/core/http/api-error';
export interface SaveFulfillmentCenterRequest {
    name: string;
    contactName: string;
    contactPhone: string;
    addressLine1: string;
    addressLine2: string | null;
    cityId: string;
    area: string | null;
    postalCode: string | null;
    processingTimeHours: number;
    directions: string | null;
    isDefault: boolean;
    isActive: boolean;
}

export interface ReceiveLine {
    itemId: string;
    goodQty: number;
    unsellableQty: number;
}

@Injectable({ providedIn: 'root' })
export class AdminFulfillmentService {
    private readonly warehouseUrl = `${environment.apiUrl}/api/Warehouse`;
    private readonly offerUrl = `${environment.apiUrl}/api/Offer`;
    private readonly inboundUrl = `${environment.apiUrl}/api/Inbound`;
    private readonly options = { context: inlineErrors };

    constructor(private readonly http: HttpClient) {}

    warehouses(search: string, ownerType: WarehouseOwnerType | null, pageNo: number, pageSize: number): Observable<PageResult<Warehouse>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        if (ownerType !== null) {
            params = params.set('ownerType', ownerType);
        }
        return this.http.get<PageResult<Warehouse>>(this.warehouseUrl, { ...this.options, params });
    }

    warehouse(id: string): Observable<Warehouse> {
        return this.http.get<ApiResponse<Warehouse>>(`${this.warehouseUrl}/${id}`, this.options).pipe(map((r) => r.data));
    }

    saveFulfillmentCenter(body: SaveFulfillmentCenterRequest, id?: string | null): Observable<Warehouse> {
        const request = id
            ? this.http.put<ApiResponse<Warehouse>>(`${this.warehouseUrl}/${id}`, body, this.options)
            : this.http.post<ApiResponse<Warehouse>>(this.warehouseUrl, body, this.options);
        return request.pipe(map((r) => r.data));
    }

    cities(): Observable<CityOption[]> {
        return this.http.get<ApiResponse<CityOption[]>>(`${this.warehouseUrl}/cities`, this.options).pipe(map((r) => r.data ?? []));
    }

    offers(search: string, status: OfferStatus | null, fulfillmentType: FulfillmentType | null, productId: string | null, pageNo: number, pageSize: number): Observable<PageResult<Offer>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        if (status !== null) {
            params = params.set('status', status);
        }
        if (fulfillmentType !== null) {
            params = params.set('fulfillmentType', fulfillmentType);
        }
        if (productId) {
            params = params.set('productId', productId);
        }
        return this.http.get<PageResult<Offer>>(this.offerUrl, { ...this.options, params });
    }

    pauseOffer(id: string): Observable<Offer> {
        return this.http.post<ApiResponse<Offer>>(`${this.offerUrl}/${id}/pause`, {}, this.options).pipe(map((r) => r.data));
    }

    inboundShipments(search: string, status: InboundStatus | null, pageNo: number, pageSize: number): Observable<PageResult<InboundShipmentListItem>> {
        let params = new HttpParams().set('pageNo', pageNo).set('pageSize', pageSize);
        if (search.trim()) {
            params = params.set('searchText', search.trim());
        }
        if (status !== null) {
            params = params.set('status', status);
        }
        return this.http.get<PageResult<InboundShipmentListItem>>(this.inboundUrl, { ...this.options, params });
    }

    inbound(id: string): Observable<InboundShipmentDetail> {
        return this.http.get<ApiResponse<InboundShipmentDetail>>(`${this.inboundUrl}/${id}`, this.options).pipe(map((r) => r.data));
    }

    receive(id: string, lines: ReceiveLine[], notes: string | null, complete: boolean): Observable<InboundShipmentDetail> {
        return this.http
            .post<ApiResponse<InboundShipmentDetail>>(`${this.inboundUrl}/${id}/receive`, { lines, notes, complete }, this.options)
            .pipe(map((r) => r.data));
    }

    inboundLabels(id: string): Observable<InboundLabels> {
        return this.http.get<ApiResponse<InboundLabels>>(`${this.inboundUrl}/${id}/labels`, this.options).pipe(map((r) => r.data));
    }
}
