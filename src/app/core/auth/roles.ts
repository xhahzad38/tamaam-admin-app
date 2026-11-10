/** Role names exactly as the API issues them (`Domain.Enums.RoleType`). */
export const Role = {
    SuperAdmin: 'SuperAdmin',
    CatalogAdmin: 'CatalogAdmin',
    MarketingAdmin: 'MarketingAdmin',
    FinanceAdmin: 'FinanceAdmin',
    AdminReviewer: 'AdminReviewer',
    LogisticsAdmin: 'LogisticsAdmin',
    SupportAgent: 'SupportAgent',
    Seller: 'Seller',
    BrandOwner: 'BrandOwner',
    Customer: 'Customer'
} as const;

export type RoleName = (typeof Role)[keyof typeof Role];

/**
 * Role groups that mirror the API's `WebAPI/Authorization/ApiRoles.cs`.
 * Routes and menu items use them so users never open a screen whose calls return 403. Keep both in sync.
 */
export const RoleGroups = {
    reviewers: [Role.SuperAdmin, Role.AdminReviewer],
    catalog: [Role.SuperAdmin, Role.CatalogAdmin],
    logistics: [Role.SuperAdmin, Role.LogisticsAdmin],
    offers: [Role.SuperAdmin, Role.LogisticsAdmin, Role.CatalogAdmin],
    auditors: [Role.SuperAdmin, Role.AdminReviewer],
    platformAdmins: [Role.SuperAdmin],
    staff: [Role.SuperAdmin, Role.AdminReviewer, Role.CatalogAdmin, Role.LogisticsAdmin, Role.MarketingAdmin, Role.FinanceAdmin, Role.SupportAgent]
} as const;
