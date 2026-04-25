# Rawyan ERP Phase 4 — Supplier, Purchase & Procurement Foundation

This patch fixes the Phase 2 role seeding conflict and starts Phase 4 of the ERP roadmap: Supplier → Company procurement.

## Fix included

- Fixed role seed error: `Updating the path 'erpTemplateKey' would create a conflict at 'erpTemplateKey'`.
- Expanded `Role` model with ERP template, enabled modules, landing path, mobile modules, and audit fields.
- Added Purchase Manager default system role.
- Added missing portal module seed records for purchase orders, supplier payments, and goods receipts.

## Phase 4 modules started

- Supplier master
- Purchase orders
- Purchase order approval
- Goods receipt creation from purchase order
- Procurement overview KPIs
- Supplier invoice and supplier payment visibility

## New API routes

- `GET /api/procurement/overview`
- `GET /api/procurement/suppliers`
- `POST /api/procurement/suppliers`
- `GET /api/procurement/purchase-orders`
- `POST /api/procurement/purchase-orders`
- `POST /api/procurement/purchase-orders/:id/approve`
- `POST /api/procurement/purchase-orders/:id/receive`
- `GET /api/procurement/goods-receipts`
- `GET /api/procurement/supplier-invoices`
- `GET /api/procurement/supplier-payments`

## Frontend routes

- `/portals/procurement`
- `/portals/procurement/purchase-orders`
- `/portals/procurement/payments`
- `/portals/warehouse/goods-receipts`

The new procurement screen is loaded from:

`frontend/src/features/procurement/pages/ProcurementFoundationPage.js`
