/**
 * Fulfillment fee rate card (API: FeeRateCardDto). Admins edit it via `api/PricingAdmin/rate-card`;
 * sellers read it via `api/SellerPricing/rate-card`.
 */
export enum FulfillmentType {
    FBM = 0,
    FBT = 1
}

export enum FeeRateKind {
    FbtOutboundLowPrice = 1,
    FbtOutboundHighPrice = 2,
    FbpPickup = 3,
    FbpDropoff = 4
}

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
    [FulfillmentType.FBT]: 'Fulfilled by Tamaam (FBT)',
    [FulfillmentType.FBM]: 'Fulfilled by partner (FBP)'
};

export const FEE_RATE_KIND_LABELS: Record<FeeRateKind, string> = {
    [FeeRateKind.FbtOutboundLowPrice]: 'FBT outbound, low price',
    [FeeRateKind.FbtOutboundHighPrice]: 'FBT outbound, standard price',
    [FeeRateKind.FbpPickup]: 'FBP courier pickup',
    [FeeRateKind.FbpDropoff]: 'FBP hub drop-off'
};

/** Which fee kinds apply to each fulfillment model. */
export const FEE_KINDS_BY_TYPE: Record<FulfillmentType, FeeRateKind[]> = {
    [FulfillmentType.FBT]: [FeeRateKind.FbtOutboundLowPrice, FeeRateKind.FbtOutboundHighPrice],
    [FulfillmentType.FBM]: [FeeRateKind.FbpPickup, FeeRateKind.FbpDropoff]
};

export interface FeeSettings {
    lowPriceThreshold: number;
    storagePerCbfMonth: number;
    longTermStoragePerCbfMonth: number;
    longTermAfterDays: number;
    nonSaleableStoragePerCbfMonth: number;
    nonSaleableAfterDays: number;
    volumetricDivisor: number;
    weightRoundingKg: number;
    removalMinPerRequest: number;
    removalHandlingPerUnit: number;
    removalDeliveryPerKg: number;
    removalCollectionPerCbf: number;
    maxPriceChangePercent: number;
    priceEngineStep: number;
    currencyCode: string;
}

export interface FeeSlab {
    kind: FeeRateKind;
    fromKg: number;
    /** null = no upper limit */
    toKg: number | null;
    fee: number;
    /** Optional per-step surcharge above fromKg (e.g. +Rs 50 per extra 0.5 kg). */
    stepKg: number | null;
    feePerStep: number | null;
}

export interface SizeTier {
    id: string | null;
    fulfillmentType: FulfillmentType;
    code: string;
    name: string;
    maxLongestCm: number | null;
    maxMedianCm: number | null;
    maxShortestCm: number | null;
    packagingKg: number;
    maxShippingKg: number | null;
    useVolumetricWeight: boolean;
    sortOrder: number;
    slabs: FeeSlab[];
}

export interface FeeRateCard {
    settings: FeeSettings;
    tiers: SizeTier[];
}

/** Human-readable weight band, e.g. "0.5 – 1 kg" or "over 10 kg". */
export function slabRange(slab: Pick<FeeSlab, 'fromKg' | 'toKg'>): string {
    return slab.toKg == null ? `over ${slab.fromKg} kg` : `${slab.fromKg} – ${slab.toKg} kg`;
}

/** Human-readable dimension limit, e.g. "45 × 35 × 20 cm". */
export function tierDimensions(tier: Pick<SizeTier, 'maxLongestCm' | 'maxMedianCm' | 'maxShortestCm'>): string {
    const parts = [tier.maxLongestCm, tier.maxMedianCm, tier.maxShortestCm];
    return parts.every((p) => p == null) ? 'No size limit' : `${parts.map((p) => p ?? '∞').join(' × ')} cm`;
}
