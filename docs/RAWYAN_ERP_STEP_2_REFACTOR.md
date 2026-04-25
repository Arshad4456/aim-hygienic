# Rawyan ERP — Step 2 Refactor

This package contains the full backend, frontend, and mobile project without `node_modules` or build/cache folders.

## Completed in Step 2

- Renamed user-facing system identity to **Rawyan ERP**.
- Renamed frontend route folder from `app/dashboards` to `app/portals`.
- Added a safe legacy redirect from `/dashboards/*` to `/portals/*`.
- Added professional frontend structure: `src/features`, `src/config`, `src/app-shell`, `src/styles`, `src/services`, and `src/hooks`.
- Moved live tracking from `src/modules/liveTracking` to `src/features/live-tracking` and converted `.jsx` files to `.js`.
- Added compatibility wrappers for old live-tracking imports.
- Added ERP Template foundation for Distribution, Trading, Manufacturing, Retail POS, Service, and Custom ERP.
- Added backend `src/core`, `src/config`, and module wrapper structure.
- Added backend ERP template APIs at `/api/erp-templates`.
- Updated Company model with `erpTemplateId`, `erpTemplateKey`, `businessType`, `enabledModules`, and `systemName`.
- Added professional mobile feature structure including live tracking.
- Added responsive Rawyan ERP gradient design tokens and CSS utility classes.

## Important

Existing portal pages remain functional. This step creates the professional structure and compatibility layer; Step 3 should migrate heavy business logic from role-specific portal folders into reusable feature pages/components.
