import { AppShellConfig } from '@/app/core/config/app-shell.config';
import { Role, RoleGroups } from '@/app/core/auth/roles';

/** Roles that can open the dashboard (seller counts come from a reviewer + catalog endpoint). */
export const DASHBOARD_ROLES = [Role.SuperAdmin, Role.AdminReviewer, Role.CatalogAdmin] as const;

/**
 * Admin-app specifics read by core/, shared/ and layout/.
 * The sidebar comes from the database (`GET api/Menu?app=Admin`, seeded by tamaam-api `Persistence/Seeds/DefaultMenus.cs`).
 */
export const ADMIN_SHELL: AppShellConfig = {
    productName: 'Tamaam Admin',
    allowedRoles: [Role.SuperAdmin, Role.AdminReviewer, Role.CatalogAdmin, Role.LogisticsAdmin],
    deniedMessage: 'This account cannot sign in to the admin app.',
    loginHighlights: ['Seller applications', 'Catalog and brands', 'Fulfillment and pricing'],
    menuApp: 'Admin',
    homeUrl: (roles) => {
        const has = (group: readonly string[]) => group.some((role) => roles.includes(role));
        if (has(DASHBOARD_ROLES)) return '/';
        if (has(RoleGroups.logistics)) return '/fulfillment/inbound';
        if (has(RoleGroups.offers)) return '/fulfillment/offers';
        return '/activity';
    }
};
