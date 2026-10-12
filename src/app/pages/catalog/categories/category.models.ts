export interface CategoryListItem {
    id: string;
    parentCategoryId: string | null;
    parentName: string | null;
    name: string;
    description: string | null;
    slug: string;
    level: number;
    sortOrder: number;
    badge: boolean;
    badgeText: string | null;
    requiresExtraApproval: boolean;
    isActive: boolean;
    imageUrl: string | null;
    approvalStatus: number;
}

export interface CategoryNode {
    id: string;
    parentCategoryId: string | null;
    name: string;
    description: string | null;
    slug: string;
    level: number;
    sortOrder: number;
    badge: boolean;
    badgeText: string | null;
    requiresExtraApproval: boolean;
    isActive: boolean;
    imageUrl: string | null;
    approvalStatus: number;
    children: CategoryNode[];
}

export interface CategoryAttributeLink {
    attributeId: string;
    attributeName: string;
    isRequired: boolean;
    displayOrder: number;
}

export interface CategoryReturnPolicy {
    returnsAllowed: boolean;
    returnWindowDays: number;
    notes: string | null;
}

export interface CategoryWarrantyRule {
    warrantyRequired: boolean;
    minDurationMonths: number;
    serialOrImeiRequired: boolean;
}

export interface CategoryCommission {
    id: string;
    name: string;
    categoryId: string | null;
    fulfillmentType: number | null;
    commissionPercent: number;
    closingFee: number;
    effectiveFrom: string;
    effectiveTo: string | null;
}

export interface CategoryDetail extends CategoryNode {
    attributes: CategoryAttributeLink[];
    returnPolicy: CategoryReturnPolicy | null;
    warrantyRule: CategoryWarrantyRule | null;
    commissionRates: CategoryCommission[];
}

export interface CategoryWrite {
    name: string;
    slug: string | null;
    description: string | null;
    parentCategoryId: string | null;
    sortOrder: number;
    badge: boolean;
    badgeText: string | null;
    requiresExtraApproval: boolean;
    isActive: boolean;
}

export interface CategoryOption {
    id: string;
    label: string;
}

export function flattenCategories(nodes: CategoryNode[], depth = 0, bucket: CategoryOption[] = []): CategoryOption[] {
    for (const node of nodes) {
        const prefix = depth > 0 ? `${'· '.repeat(depth)}` : '';
        bucket.push({ id: node.id, label: `${prefix}${node.name}` });
        flattenCategories(node.children ?? [], depth + 1, bucket);
    }
    return bucket;
}

export function findCategory(nodes: CategoryNode[], id: string): CategoryNode | null {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }
        const child = findCategory(node.children ?? [], id);
        if (child) {
            return child;
        }
    }
    return null;
}

export function collectCategoryIds(node: CategoryNode, ids: Set<string>): void {
    ids.add(node.id);
    for (const child of node.children ?? []) {
        collectCategoryIds(child, ids);
    }
}

export function fulfillmentLabel(value: number | null): string {
    if (value === 0) {
        return 'FBM';
    }
    if (value === 1) {
        return 'FBT';
    }
    return 'Both';
}
