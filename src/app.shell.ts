import { AppShellConfig } from '@/app/core/config/app-shell.config';
import { Role, RoleGroups } from '@/app/core/auth/roles';

/** Roles that can open the dashboard (seller counts come from a reviewer + catalog endpoint). */
export const DASHBOARD_ROLES = [Role.SuperAdmin, Role.AdminReviewer, Role.CatalogAdmin] as const;

/** Admin-app specifics read by core/, shared/ and layout/. */
export const ADMIN_SHELL: AppShellConfig = {
    productName: 'Tamaam Admin',
    allowedRoles: [Role.SuperAdmin, Role.AdminReviewer, Role.CatalogAdmin, Role.LogisticsAdmin],
    deniedMessage: 'This account cannot sign in to the admin app.',
    loginHighlights: ['Seller applications', 'Catalog and brands', 'Fulfillment and pricing'],
    homeUrl: (roles) => {
        const has = (group: readonly string[]) => group.some((role) => roles.includes(role));
        if (has(DASHBOARD_ROLES)) return '/';
        if (has(RoleGroups.logistics)) return '/fulfillment/inbound';
        if (has(RoleGroups.offers)) return '/fulfillment/offers';
        return '/activity';
    },
    navigation: [
        {
            label: 'Overview',
            items: [{ label: 'Dashboard', icon: 'pi-home', routerLink: ['/'], roles: DASHBOARD_ROLES }]
        },
        {
            label: 'Sellers',
            roles: RoleGroups.reviewers,
            items: [
                { label: 'Onboarding review', icon: 'pi-verified', routerLink: ['/seller-reviews'] },
                { label: 'All sellers', icon: 'pi-users', routerLink: ['/sellers'] },
                { label: 'KYC change requests', icon: 'pi-file-edit', routerLink: ['/sellers/profile-changes'] }
            ]
        },
        {
            label: 'Catalog',
            roles: RoleGroups.catalog,
            items: [
                {
                    label: 'Categories',
                    icon: 'pi-sitemap',
                    items: [
                        { label: 'All categories', icon: 'pi-list', routerLink: ['/catalog/categories'] },
                        { label: 'Category attributes', icon: 'pi-th-large', routerLink: ['/catalog/categories/attributes'] },
                        { label: 'Commission', icon: 'pi-percentage', routerLink: ['/catalog/categories/commission'] },
                        { label: 'Return policy', icon: 'pi-replay', routerLink: ['/catalog/categories/return-policy'] },
                        { label: 'Warranty rule', icon: 'pi-shield', routerLink: ['/catalog/categories/warranty'] }
                    ]
                },
                { label: 'Attributes', icon: 'pi-list', routerLink: ['/catalog/attributes'] },
                {
                    label: 'Brands',
                    icon: 'pi-bookmark',
                    items: [
                        { label: 'All brands', icon: 'pi-list', routerLink: ['/catalog/brands'] },
                        { label: 'Documents', icon: 'pi-file', routerLink: ['/catalog/brands/documents'] },
                        { label: 'Authorizations', icon: 'pi-verified', routerLink: ['/catalog/brands/authorizations'] },
                        { label: 'Change requests', icon: 'pi-check-square', routerLink: ['/catalog/brands/requests'] }
                    ]
                },
                {
                    label: 'Lookups',
                    icon: 'pi-tags',
                    items: [
                        { label: 'Lookup values', icon: 'pi-list', routerLink: ['/catalog/lookups'] },
                        { label: 'Lookup types', icon: 'pi-cog', routerLink: ['/catalog/lookup-types'] }
                    ]
                }
            ]
        },
        {
            label: 'Reviews',
            roles: RoleGroups.catalog,
            items: [
                { label: 'Product review', icon: 'pi-check-circle', routerLink: ['/catalog/product-reviews'] },
                { label: 'Product change requests', icon: 'pi-pencil', routerLink: ['/catalog/change-requests'] },
                { label: 'Brand authorization review', icon: 'pi-verified', routerLink: ['/catalog/brand-authorization-reviews'] }
            ]
        },
        {
            label: 'Pricing & offers',
            roles: RoleGroups.offers,
            items: [
                { label: 'Offers', icon: 'pi-tags', routerLink: ['/fulfillment/offers'] },
                { label: 'Fee rate card', icon: 'pi-percentage', routerLink: ['/pricing/rate-card'] }
            ]
        },
        {
            label: 'Fulfillment',
            roles: RoleGroups.logistics,
            items: [
                { label: 'Inbound receiving', icon: 'pi-inbox', routerLink: ['/fulfillment/inbound'] },
                { label: 'Fulfillment centers', icon: 'pi-building', routerLink: ['/fulfillment/warehouses'] }
            ]
        },
        {
            label: 'System',
            roles: RoleGroups.auditors,
            items: [{ label: 'Activity log', icon: 'pi-history', routerLink: ['/activity'] }]
        }
    ]
};
