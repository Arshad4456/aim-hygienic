# Phase 11 Delete List

## Delete immediately / never commit

```txt
backend/node_modules
frontend/node_modules
mobile/node_modules
frontend/.next
frontend/out
frontend/dist
backend/dist
backend/build
mobile/.expo
mobile/dist
*.log
aim-hygienics.archive
```

## Delete after applying Phase 11 patch

Phase 11 no longer depends on these old role folders. The dynamic catch-all portal route will handle these URLs through alias mapping.

```txt
frontend/app/portals/admin
frontend/app/portals/distributor
frontend/app/portals/customer
frontend/app/portals/salesman
frontend/app/portals/orderBooker
frontend/app/portals/warehouseManager
frontend/app/portals/deliveryBoy
frontend/app/portals/supplier
frontend/app/portals/brandManager
frontend/app/portals/components
frontend/app/portals/searchItems.js
frontend/src/config/workingPortalRoutes.js
```

Use:

```bash
node scripts/cleanup-phase11-legacy-portals.js
```

## Keep for now

```txt
frontend/app/portals/[[...slug]]/page.js
frontend/app/dashboards/[[...slug]]/page.js
frontend/package.json
frontend/package-lock.json
frontend/next.config.mjs
frontend/jsconfig.json
frontend/postcss.config.mjs
frontend/eslint.config.mjs
```

The `/dashboards/[[...slug]]` redirect can be removed only after you are sure no users use old `/dashboards/...` links.
