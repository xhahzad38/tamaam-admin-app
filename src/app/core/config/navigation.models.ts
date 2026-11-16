export interface NavItem {
    label: string;
    icon: string;
    routerLink?: string[];
    items?: readonly NavItem[];
    /** Key that opens/closes this group in the sidebar. Derived from the label when omitted. */
    path?: string;
    /** External link, used instead of `routerLink`. */
    url?: string;
    target?: string;
}

export interface NavSection {
    label: string;
    items: readonly NavItem[];
}

/** A node of `GET api/Menu` (Application/Features/Menus/MenuDto). Level 0 = section, 1 = item, 2 = sub-item. */
export interface MenuDto {
    id: string;
    code: string;
    title: string;
    icon: string | null;
    routerLink: string | null;
    path: string | null;
    externalUrl: string | null;
    target: string | null;
    level: number;
    isGroup: boolean;
    children: MenuDto[];
}

/**
 * Converts the API menu tree (already filtered by the user's roles on the server) to sidebar sections.
 * Groups get a `/code/` path so each one opens and closes on its own.
 */
export function toNavSections(menus: readonly MenuDto[]): NavSection[] {
    const toItem = (menu: MenuDto): NavItem => ({
        label: menu.title,
        icon: menu.icon ?? '',
        routerLink: menu.routerLink ? [menu.routerLink] : undefined,
        url: menu.externalUrl ?? undefined,
        target: menu.target ?? undefined,
        path: menu.children.length ? `/${menu.path || menu.code}/` : undefined,
        items: menu.children.length ? menu.children.map(toItem) : undefined
    });

    return menus
        .map((section) => ({ label: section.title, items: section.children.map(toItem) }))
        .filter((section) => section.items.length > 0);
}
