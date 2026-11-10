import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';

/**
 * Top of every screen: breadcrumb, title, optional description and right-aligned actions.
 * For a description with links, project it instead: `<p pageSubtitle>See <a ...>...</a></p>`.
 *
 * <app-page-header title="Brands" subtitle="..." [crumbs]="[{ label: 'Brands' }]">
 *     <p-button label="Add brand" icon="pi pi-plus" />
 * </app-page-header>
 */
@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [BreadcrumbModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (crumbs().length) {
            <p-breadcrumb [model]="crumbs()" [home]="home" styleClass="page-header__crumbs" />
        }
        <div class="page-header__row">
            <div class="page-header__text">
                @if (backLink(); as link) {
                    <a [routerLink]="link" class="page-header__back"><i class="pi pi-arrow-left"></i>{{ backLabel() }}</a>
                }
                <h1 class="page-header__title">{{ title() }}</h1>
                @if (subtitle()) {
                    <p class="page-header__subtitle">{{ subtitle() }}</p>
                }
                <ng-content select="[pageSubtitle]" />
            </div>
            <div class="page-header__actions">
                <ng-content />
            </div>
        </div>
    `,
    styles: `
        :host {
            display: block;
        }
        :host ::ng-deep .page-header__crumbs {
            padding: 0;
            margin-bottom: var(--tm-space-3);
            background: transparent;
            font-size: var(--tm-text-sm);
        }
        .page-header__row {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-end;
            justify-content: space-between;
            gap: var(--tm-space-3);
        }
        .page-header__text {
            min-width: 0;
        }
        .page-header__back {
            display: inline-flex;
            align-items: center;
            gap: var(--tm-space-2);
            margin-bottom: var(--tm-space-2);
            font-size: var(--tm-text-sm);
            color: var(--tm-text-muted);
        }
        .page-header__title {
            margin: 0;
            font-size: var(--tm-text-2xl);
            font-weight: 600;
            line-height: 1.25;
            color: var(--tm-text);
        }
        .page-header__subtitle,
        :host ::ng-deep [pageSubtitle] {
            margin: var(--tm-space-1) 0 0;
            max-width: 48rem;
            font-size: var(--tm-text-sm);
            color: var(--tm-text-muted);
        }
        .page-header__actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--tm-space-2);
        }
        .page-header__actions:empty {
            display: none;
        }
    `
})
export class PageHeaderComponent {
    readonly title = input.required<string>();
    readonly subtitle = input<string | null>(null);
    readonly crumbs = input<MenuItem[]>([]);
    readonly backLink = input<unknown[] | string | null>(null);
    readonly backLabel = input('Back');

    readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
}
