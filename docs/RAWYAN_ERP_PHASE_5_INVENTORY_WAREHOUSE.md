# Rawyan ERP Phase 5: Inventory & Warehouse Foundation

Phase 5 connects procurement to inventory.

## Corrected procurement rules

- A purchase order cannot create duplicate GRNs.
- Creating a GRN creates only a draft receiving document.
- Draft GRN does not update stock.
- Posting a GRN updates the inventory ledger.
- Posting a GRN automatically generates a supplier invoice.
- Supplier payment is posted against a posted supplier invoice.

## Professional flow

Supplier → Purchase Order → Draft GRN → Posted GRN → Inventory Ledger → Supplier Invoice → Supplier Payment

## APIs

- `POST /api/procurement/purchase-orders/:id/receive`
- `POST /api/procurement/goods-receipts/:id/post`
- `POST /api/procurement/supplier-invoices/:id/pay`
- `GET /api/inventory/overview`
- `GET /api/inventory/stock-summary`
- `GET /api/inventory/ledger`
- `GET /api/warehouse/overview`

## Portal routes

- `/portals/procurement`
- `/portals/procurement/purchase-orders`
- `/portals/warehouse/goods-receipts`
- `/portals/inventory`
- `/portals/warehouse`
