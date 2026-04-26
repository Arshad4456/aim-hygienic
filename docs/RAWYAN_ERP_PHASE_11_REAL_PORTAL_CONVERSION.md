# Rawyan ERP Phase 11: Real Portal Conversion + Legacy Cleanup

Phase 11 starts converting Rawyan ERP from role-folder pages into real permission-driven portals.

## Main idea

Old style:

```txt
frontend/app/portals/admin
frontend/app/portals/distributor
frontend/app/portals/customer
frontend/app/portals/warehouseManager
```

New style:

```txt
frontend/app/portals/[[...slug]]/page.js
frontend/src/features/*
frontend/src/config/portalRouteRegistry.js
```

The App Router folder should only handle routes. Real screens now live in `frontend/src/features`.

## What changed

- Removed dependency on `workingPortalRoutes.js` from sidebar and route loader.
- Sidebar now links to canonical feature routes only.
- Old role URLs are handled by prefix-based legacy aliases.
- Added real feature pages for companies, ERP templates, products, customers, expenses, loans, returns, notifications, settings, and system admin.
- Added system-admin concept for SaaS owner work.
- Messages are now conceptually mapped to Notification Center.
- Added cleanup script for old portal folders.

## New important routes

```txt
/portals/system-admin
/portals/companies
/portals/erp-templates
/portals/products
/portals/customers
/portals/expenses
/portals/loans
/portals/returns
/portals/notifications
/portals/settings
```

## Legacy route behavior

Old URLs like `/portals/admin/products` and `/portals/distributor/orders` are no longer required. After legacy folders are removed, the catch-all route maps them to canonical routes.

Example:

```txt
/portals/admin/products/add -> /portals/products/add -> products feature page
/portals/distributor/orders -> /portals/sales/secondary-orders
/portals/customer/invoices -> /portals/customer/billing
```
