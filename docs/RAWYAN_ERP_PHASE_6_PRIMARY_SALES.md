# Rawyan ERP Phase 6: Primary Sales Foundation

Phase 6 adds the professional Company → Distributor primary-sales flow.

## Correct ERP workflow

1. Company creates Primary Sales Order for Distributor.
2. Company approves the order.
3. Company creates a Dispatch Note.
4. Posting the Dispatch Note reduces company warehouse stock.
5. A Company Invoice to Distributor is generated automatically.
6. A Distributor Stock Receipt draft is generated automatically.
7. Posting the Distributor Stock Receipt increases distributor stock.

## Important protections

- Stock does not reduce when the order is created or approved.
- Duplicate dispatch notes for the same primary sales order are blocked.
- Company dispatch cannot post if stock is not available.
- Distributor stock does not increase until Distributor Receipt is posted.
- Distributor invoice is generated once from the posted dispatch.

## Test paths

- `/portals/sales/primary-orders`
- `/api/sales/primary/orders`
- `/api/sales/primary/dispatches`
- `/api/sales/primary/invoices`
- `/api/sales/primary/stock-receipts`
