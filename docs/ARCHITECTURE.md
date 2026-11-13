# Front-end architecture (admin + seller)

`tamaam-admin-app` and `tamaam-seller-app` are separate Angular 21 + PrimeNG apps that are built as one product. They share a core, a UI kit and a design system. That shared code is **mirrored**: the same files sit in both repos and are kept identical by a script.

## Folder layout

```
src/
  app.shell.ts        app-specific: product name, allowed roles, home page, sidebar navigation
  app.routes.ts       app-specific routes (role guards mirror the API)
  app.config.ts       providers: theme preset, interceptors, confirm/toast services
  app/
    core/             mirrored. Singletons, no UI.
      api/            ApiResponse / PageResult types
      auth/           AuthenticationService, authGuard, Role + RoleGroups, JWT helpers
      config/         APP_SHELL_CONFIG token + navigation model
      http/           interceptors (error -> jwt/refresh -> loading), ApiError, inlineErrors
      services/       loading bar, lookup dropdowns
    shared/           mirrored. Reusable, domain-agnostic.
      ui/             page-header, state components, confirm, paginator, stat-card, auth-shell, controls
      data/           createPagedList(), unsavedChangesGuard
      models/         DTOs used by both apps (e.g. fee rate card)
      theme/          TamaamPreset (PrimeNG)
      utils/          media, text, date helpers
      constants/
    layout/           mirrored. Shell: top bar, role-filtered sidebar, footer
    features/<domain>/
      pages/<page>/       routed screens
      components/<name>/  pieces used only inside the feature
      data-access/        <domain>.service.ts (HTTP) + <domain>.models.ts
      utils/              pure helpers for the feature
      <domain>.routes.ts
  assets/             mirrored. Sakai layout styles + theme/ (tokens, components, auth screens)
```

Mirrored paths are listed in `scripts/shared.mjs` (`MIRRORED`). Besides `core/`, `shared/`, `layout/` and `assets/`, they include `features/system`, `features/account` and `features/auth/pages/login`.

### Keeping the apps in sync

```bash
npm run shared:check   # exits 1 if the mirrored files differ from the sibling app
npm run shared:sync    # copies the mirrored files FROM the sibling app into this one
```

The workflow: make the change in one app, then run `npm run shared:sync` in the other. Anything that must differ between the apps belongs in `src/app.shell.ts`, the routes, or a feature folder, never as an `if (admin)` inside `core/` or `shared/`.

## Conventions

| Concern | Use |
|---|---|
| Screen header | `<app-page-header title subtitle [crumbs]>` with actions projected inside. Wrap the screen in `<div class="page">`. |
| Server-paged list | `readonly list = createPagedList((req) => service.list(req.search, req.pageNo, req.pageSize))`, plus `<app-table-paginator>` and `list.search()`. See `brand-list` (admin) and `activity-log` for reference. |
| List toolbar | The main status / queue of a list goes in `<app-status-tabs [tabs] [active] (activeChange)>` (tabs with counts) above the toolbar. Then `<div class="table-toolbar">`: `<div class="table-toolbar__search">` (search, left) and `<div class="table-toolbar__filters">` (right) holding `<app-table-filter>` dropdowns for any other filters. No rows of toggle buttons, select buttons or radio buttons as filters, and no filters on a row above search. |
| Loading / empty / error | `<app-loading-state>`, `<app-empty-state>`, `<app-error-state (retry)>`, `<app-notice>` |
| Confirmation | `await inject(ConfirmService).ask({ message, danger: true })`. Never `window.confirm`. |
| Row actions | `<div class="row-actions"><button class="link-button">…` (add `link-button--danger` for destructive actions) |
| Forms | `.form-grid` / `.form-actions`, `<app-input-control>`, `<app-select-control>` |
| Errors shown inline | pass `{ context: inlineErrors }` so the global toast is skipped, then `errorMessage(err, 'fallback')` |
| React to a specific API failure | `hasErrorCode(err, ApiErrorCode.X)`. Codes mirror `Application/Exceptions/ErrorCodes.cs`. |
| Colours / spacing | `var(--tm-*)` tokens from `assets/theme/_tokens.scss`. No hex values in feature styles (printed labels excepted). |
| Roles | `RoleGroups` in `core/auth/roles.ts` mirror `WebAPI/Authorization/ApiRoles.cs`. Use them for routes **and** menu items. |
| Unsaved edits | implement `HasUnsavedChanges` and add `canDeactivate: [unsavedChangesGuard]` |

## Auth flow

1. `POST api/Account/authenticate` stores the session (localStorage with "Remember me", otherwise sessionStorage).
2. `jwtInterceptor` adds the bearer token. When the token is about to expire, or a call returns 401, it calls `api/Account/refresh-token` once (concurrent calls share that refresh) and retries.
3. `errorInterceptor` signs the user out only on a 401 that couldn't be refreshed. A 403 shows a "Not allowed" toast and does not sign the user out.
4. Sign-out revokes the refresh token (`api/Account/revoke-token`).

## Rebranding

Change the `primary` scale in `shared/theme/tamaam.preset.ts` and the SVG in `shared/ui/logo/logo.component.ts`. Everything else follows from the tokens.
