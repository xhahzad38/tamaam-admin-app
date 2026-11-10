export interface NavItem {
    label: string;
    icon: string;
    routerLink?: string[];
    /** Hide the item unless the user has one of these roles. Omit to show to every signed-in user. */
    roles?: readonly string[];
    items?: readonly NavItem[];
    /** Key that opens/closes this group in the sidebar. Derived from the label when omitted. */
    path?: string;
}

export interface NavSection {
    label: string;
    roles?: readonly string[];
    items: readonly NavItem[];
}

/** Removes items (and empty sections/groups) the user is not allowed to see. */
export function filterNavigation(sections: readonly NavSection[], roles: readonly string[]): NavSection[] {
    const allowed = (required?: readonly string[]) => !required || required.some((role) => roles.includes(role));

    const filterItems = (items: readonly NavItem[]): NavItem[] =>
        items
            .filter((item) => allowed(item.roles))
            .map((item) => (item.items ? { ...item, items: filterItems(item.items) } : item))
            .filter((item) => !item.items || item.items.length > 0);

    return sections
        .filter((section) => allowed(section.roles))
        .map((section) => ({ ...section, items: filterItems(section.items) }))
        .filter((section) => section.items.length > 0);
}
