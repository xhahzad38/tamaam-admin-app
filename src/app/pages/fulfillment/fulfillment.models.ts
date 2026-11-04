/** Same values as the API's CatalogStatus. */
export type CatalogStatus = 0 | 1 | 2 | 3 | 4;

export enum FulfillmentType {
    FBM = 0,
    FBT = 1
}

export enum WarehouseOwnerType {
    Seller = 1,
    Platform = 2
}

export enum WarehouseKind {
    Fulfillment = 1,
    Pickup = 2,
    Return = 3,
    Both = 4
}

export enum HandoverType {
    Pickup = 0,
    Return = 1,
    Both = 2
}

export enum OfferCondition {
    New = 1,
    Refurbished = 2,
    Used = 3
}

export enum OfferStatus {
    Draft = 0,
    Active = 1,
    Paused = 2,
    OutOfStock = 3,
    Ended = 4
}

export enum InboundStatus {
    Draft = 0,
    Sealed = 1,
    InTransit = 2,
    Receiving = 3,
    Received = 4,
    PartiallyReceived = 5,
    Cancelled = 6
}

export const FULFILLMENT_LABEL: Record<number, string> = {
    [FulfillmentType.FBM]: 'Ships from you (FBM)',
    [FulfillmentType.FBT]: 'Fulfilled by Tamaam (FBT)'
};

export const CONDITION_LABEL: Record<number, string> = {
    [OfferCondition.New]: 'New',
    [OfferCondition.Refurbished]: 'Refurbished',
    [OfferCondition.Used]: 'Used'
};

export const OFFER_STATUS_LABEL: Record<number, string> = {
    [OfferStatus.Draft]: 'Draft',
    [OfferStatus.Active]: 'Live',
    [OfferStatus.Paused]: 'Paused',
    [OfferStatus.OutOfStock]: 'Out of stock',
    [OfferStatus.Ended]: 'Ended'
};

export const INBOUND_STATUS_LABEL: Record<number, string> = {
    [InboundStatus.Draft]: 'Draft',
    [InboundStatus.Sealed]: 'Ready to ship',
    [InboundStatus.InTransit]: 'On its way',
    [InboundStatus.Receiving]: 'Being received',
    [InboundStatus.Received]: 'Received',
    [InboundStatus.PartiallyReceived]: 'Received with shortfall',
    [InboundStatus.Cancelled]: 'Cancelled'
};

export const HANDOVER_LABEL: Record<number, string> = {
    [HandoverType.Pickup]: 'Pickup',
    [HandoverType.Return]: 'Returns only',
    [HandoverType.Both]: 'Pickup and returns'
};

export type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

export function offerSeverity(status: OfferStatus): Severity {
    switch (status) {
        case OfferStatus.Active:
            return 'success';
        case OfferStatus.Paused:
        case OfferStatus.OutOfStock:
            return 'warn';
        case OfferStatus.Ended:
            return 'danger';
        default:
            return 'secondary';
    }
}

export function inboundSeverity(status: InboundStatus): Severity {
    switch (status) {
        case InboundStatus.Received:
            return 'success';
        case InboundStatus.Sealed:
        case InboundStatus.InTransit:
        case InboundStatus.Receiving:
            return 'info';
        case InboundStatus.PartiallyReceived:
            return 'warn';
        case InboundStatus.Cancelled:
            return 'danger';
        default:
            return 'secondary';
    }
}

export interface CityOption {
    id: string;
    code: string;
    name: string;
}

export interface Warehouse {
    id: string;
    code: string;
    name: string;
    ownerType: WarehouseOwnerType;
    kind: WarehouseKind;
    defaultFulfillmentType: FulfillmentType;
    contactName: string;
    contactPhone: string;
    addressLine1: string;
    addressLine2: string | null;
    cityId: string;
    cityName: string;
    area: string | null;
    postalCode: string | null;
    processingTimeHours: number;
    directions: string | null;
    isDefault: boolean;
    isActive: boolean;
    storeId: string | null;
    storeName: string | null;
    offerCount: number;
    createdAt: string;
}

export interface SaveWarehouseRequest {
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
    handoverType: HandoverType;
}

export interface Offer {
    id: string;
    productId: string;
    productName: string;
    psku: string;
    productStatus: CatalogStatus;
    brandName: string;
    imageUrl: string | null;
    variantId: string;
    sku: string;
    variantName: string;
    attributeCombination: string;
    barcode: string | null;
    ownedByYou: boolean;
    storeId: string;
    storeName: string;
    sellerSku: string;
    fnsku: string;
    price: number;
    listPrice: number | null;
    condition: OfferCondition;
    status: OfferStatus;
    fulfillmentType: FulfillmentType;
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    handlingDays: number;
    maxPerCustomer: number | null;
    lowStockThreshold: number;
    packageWeightKg: number | null;
    packageLengthCm: number | null;
    packageWidthCm: number | null;
    packageHeightCm: number | null;
    onHand: number;
    reserved: number;
    unsellable: number;
    inbound: number;
    available: number;
    activationProblems: string[];
    canActivate: boolean;
    createdAt: string;
}

export interface OfferVariant {
    variantId: string;
    productId: string;
    productName: string;
    psku: string;
    sku: string;
    variantName: string;
    attributeCombination: string;
    brandName: string;
    imageUrl: string | null;
    productStatus: CatalogStatus;
    ownedByYou: boolean;
    brandCanSell: boolean;
    yourOffers: Offer[];
}

export interface SaveOfferRequest {
    variantId: string | null;
    warehouseId: string | null;
    sellerSku: string;
    price: number;
    listPrice: number | null;
    condition: OfferCondition;
    handlingDays: number;
    maxPerCustomer: number | null;
    lowStockThreshold: number;
    packageWeightKg: number | null;
    packageLengthCm: number | null;
    packageWidthCm: number | null;
    packageHeightCm: number | null;
}

export interface UnitLabel {
    offerId: string;
    fnsku: string;
    sellerSku: string;
    title: string;
    attributeCombination: string;
    condition: OfferCondition;
    copies: number;
}

export interface InboundShipmentListItem {
    id: string;
    asnNumber: string;
    status: InboundStatus;
    storeId: string;
    storeName: string;
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    lineCount: number;
    unitCount: number;
    receivedUnits: number;
    cartonCount: number;
    courierName: string | null;
    trackingNumber: string | null;
    expectedAt: string | null;
    shippedAt: string | null;
    receivedAt: string | null;
    createdAt: string;
}

export interface InboundAddress {
    name: string;
    code: string;
    contactName: string;
    contactPhone: string;
    addressLine1: string;
    addressLine2: string | null;
    area: string | null;
    cityName: string;
    postalCode: string | null;
    country: string;
}

export interface InboundItem {
    id: string;
    offerId: string;
    variantId: string;
    productName: string;
    attributeCombination: string;
    psku: string;
    sku: string;
    sellerSku: string;
    fnsku: string;
    barcode: string | null;
    condition: OfferCondition;
    imageUrl: string | null;
    expectedQty: number;
    packedQty: number;
    receivedGoodQty: number;
    receivedUnsellableQty: number;
    remainingQty: number;
}

export interface InboundCartonLine {
    itemId: string;
    fnsku: string;
    sellerSku: string;
    productName: string;
    qty: number;
}

export interface InboundCarton {
    id: string;
    cartonNumber: string;
    status: number;
    weightKg: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    unitCount: number;
    lines: InboundCartonLine[];
}

export interface InboundReceiving {
    id: string;
    receivingNumber: string;
    status: number;
    completedAt: string | null;
    notes: string | null;
    goodQty: number;
    unsellableQty: number;
}

export interface InboundShipmentDetail extends InboundShipmentListItem {
    destination: InboundAddress;
    origin: InboundAddress | null;
    originWarehouseId: string | null;
    courierId: string | null;
    notes: string | null;
    sealedAt: string | null;
    items: InboundItem[];
    cartons: InboundCarton[];
    receivings: InboundReceiving[];
    canEdit: boolean;
    canSeal: boolean;
    canShip: boolean;
    canCancel: boolean;
    canPrintLabels: boolean;
    canReceive: boolean;
}

export interface CartonLabel {
    cartonNumber: string;
    index: number;
    unitCount: number;
    weightKg: number | null;
    dimensions: string;
    lines: InboundCartonLine[];
}

export interface InboundLabels {
    shipmentId: string;
    asnNumber: string;
    storeName: string;
    shipTo: InboundAddress;
    shipFrom: InboundAddress | null;
    courierName: string | null;
    trackingNumber: string | null;
    totalUnits: number;
    totalCartons: number;
    units: UnitLabel[];
    cartons: CartonLabel[];
}

export interface SaveInboundRequest {
    warehouseId: string;
    originWarehouseId: string | null;
    expectedAt: string | null;
    notes: string | null;
    items: Array<{ offerId: string; qty: number }>;
}

export interface CartonWrite {
    weightKg: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    lines: Array<{ itemId: string; qty: number }>;
}
