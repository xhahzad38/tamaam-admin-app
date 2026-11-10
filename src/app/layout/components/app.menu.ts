import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AuthenticationService } from '@/app/core/auth/authentication.service';
import { APP_SHELL_CONFIG } from '@/app/core/config/app-shell.config';
import { NavItem, filterNavigation } from '@/app/core/config/navigation.models';
import { AppMenuitem } from './app.menuitem';

/** Sidebar menu built from the app's navigation config, showing only what the user's roles allow. */
@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [AppMenuitem],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ul class="layout-menu">
        @for (item of model(); track item.label) {
            <li app-menuitem [item]="item" [root]="true"></li>
        }
    </ul>`
})
export class AppMenu {
    private readonly auth = inject(AuthenticationService);
    private readonly navigation = inject(APP_SHELL_CONFIG).navigation;

    readonly model = computed<MenuItem[]>(() =>
        filterNavigation(this.navigation, this.auth.roles()).map((section) => ({
            label: section.label,
            items: section.items.map(toMenuItem)
        }))
    );
}

/**
 * AppMenuitem opens a submenu by matching `path` against the layout's activePath, so every
 * group (an item with children) needs a unique `path`, or it can never expand. Use the
 * configured one, otherwise derive it from the label. AppMenuitem prefixes the parent's
 * path itself, so nested groups stay unique.
 */
function toMenuItem(item: NavItem): MenuItem {
    const children = item.items?.map(toMenuItem);
    return {
        label: item.label,
        icon: `pi pi-fw ${item.icon}`,
        routerLink: item.routerLink,
        items: children,
        ...(children?.length ? { path: item.path ?? `/${slug(item.label)}/` } : {})
    };
}

function slug(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
