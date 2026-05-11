# Rawyan ERP Phase 1 Refactor Report

## Goal

Prepare Rawyan ERP for a real multi-ERP SaaS architecture without building every ERP module in Phase 1.

## Main Architecture Changes

### Backend

- Added `backend/src/erp/` as the home for ERP-type-specific code.
- Moved industry-specific modules into their ERP folders.
- Moved reusable operational modules into `backend/src/core/`.
- Removed old placeholder wrappers from `backend/src/modules/`.
- Added `backend/src/erp/erp.registry.js` with ERP types, statuses, modules, roles, and distribution territory flow.

### Frontend

- Replaced `frontend/src/features/` with `frontend/src/modules/`.
- ERP screens are now grouped by business type, for example `modules/distribution/sales` and `modules/manufacturing/production`.
- Common screens are under `modules/common`, but their data must stay role/ERP/permission-scoped.

## Important Rule

ERP types are not modules. ERP types are separate business setups. Each ERP owns its modules, roles, workflows, and portal logic.

## Backend Moves

- `backend/src/modules/warehouse` → `backend/src/core/common-modules/warehouse`
- `backend/src/modules/procurement` → `backend/src/core/supply-chain/modules/procurement`
- `backend/src/modules/inventory` → `backend/src/core/supply-chain/modules/inventory`
- `backend/src/modules/sales` → `backend/src/core/supply-chain/modules/sales`
- `backend/src/modules/finance` → `backend/src/core/finance/modules/finance`
- `backend/src/modules/notifications` → `backend/src/core/messaging/modules/notifications`
- `backend/src/modules/territory` → `backend/src/erp/distribution/modules/territory`
- `backend/src/modules/operations` → `backend/src/erp/distribution/modules/operations`
- `backend/src/modules/logistics` → `backend/src/erp/logistics/modules/logistics`
- `backend/src/modules/location` → `backend/src/erp/logistics/modules/live-tracking`
- `backend/src/modules/manufacturing` → `backend/src/erp/manufacturing/modules/production`
- `backend/src/modules/retail-pos` → `backend/src/erp/retail-pos/modules/pos`
- `backend/src/modules/service` → `backend/src/erp/service-business/modules/service-orders`
- `backend/src/modules/trading` → `backend/src/erp/trading/modules/trading-shipments`

## Frontend Moves

- `frontend/src/features/common` → `frontend/src/modules/common/entity-workspace`
- `frontend/src/features/dashboard` → `frontend/src/modules/common/dashboard`
- `frontend/src/features/notifications` → `frontend/src/modules/common/notifications`
- `frontend/src/features/settings` → `frontend/src/modules/common/settings`
- `frontend/src/features/reports` → `frontend/src/modules/common/reports`
- `frontend/src/features/master-data` → `frontend/src/modules/common/master-data`
- `frontend/src/features/finance` → `frontend/src/modules/common/finance`
- `frontend/src/features/roles` → `frontend/src/modules/common/access/roles`
- `frontend/src/features/users` → `frontend/src/modules/common/access/users`
- `frontend/src/features/products` → `frontend/src/modules/common/products`
- `frontend/src/features/customers` → `frontend/src/modules/common/customers`
- `frontend/src/features/expenses` → `frontend/src/modules/common/expenses`
- `frontend/src/features/loans` → `frontend/src/modules/common/loans`
- `frontend/src/features/returns` → `frontend/src/modules/common/returns`
- `frontend/src/features/auth` → `frontend/src/modules/common/auth`
- `frontend/src/features/companies` → `frontend/src/modules/system-admin/companies`
- `frontend/src/features/company-control` → `frontend/src/modules/system-admin/company-control`
- `frontend/src/features/erp-templates` → `frontend/src/modules/system-admin/erp-types`
- `frontend/src/features/system-admin` → `frontend/src/modules/system-admin/dashboard`
- `frontend/src/features/procurement` → `frontend/src/modules/common/supply-chain/procurement`
- `frontend/src/features/inventory` → `frontend/src/modules/common/supply-chain/inventory`
- `frontend/src/features/sales` → `frontend/src/modules/distribution/sales`
- `frontend/src/features/territory` → `frontend/src/modules/distribution/territory`
- `frontend/src/features/operations` → `frontend/src/modules/distribution/operations`
- `frontend/src/features/logistics` → `frontend/src/modules/logistics/fleet`
- `frontend/src/features/live-tracking` → `frontend/src/modules/logistics/live-tracking`
- `frontend/src/features/retail-pos` → `frontend/src/modules/retail-pos/pos`
- `frontend/src/features/manufacturing` → `frontend/src/modules/manufacturing/production`
- `frontend/src/features/service` → `frontend/src/modules/service-business/service-orders`
- `frontend/src/features/trading` → `frontend/src/modules/trading/trading-shipments`

## Deleted Legacy Confusion Folders

See `docs/DELETED_FILES.md`.

## Next Phase

Phase 2 should build the SaaS foundation: companies/tenants, ERP types, plans, subscriptions, company admin creation, roles, permissions, and dynamic portal/module access.
