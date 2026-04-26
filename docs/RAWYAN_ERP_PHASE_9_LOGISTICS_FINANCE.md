# Rawyan ERP Phase 9: Fleet, Delivery, Live Tracking & Finance Separation

Phase 9 connects operational logistics with the ERP finance flows and fixes distributor stock fulfilment.

## Important fixes
- Secondary sales delivery now checks distributor stock more safely by product and distributor owner.
- If an old order line has missing warehouse information, the backend falls back to all distributor warehouses for the same product.
- Customer invoice payment is available from Finance as a distributor/customer receivable action.
- Company finance and distributor finance are separated conceptually.

## Correct finance ownership
Company Finance:
- Receives distributor payments against primary sales invoices.
- Pays suppliers for purchase invoices.
- Handles company accounts, expenses, and cash/bank.

Distributor Finance:
- Receives customer payments against secondary sales invoices.
- Tracks distributor customer receivables.
- Handles distributor stock-related secondary sales cash flow.

## Correct stock flow
Primary Dispatch posted -> Distributor Receipt draft.
Distributor Receipt posted -> Distributor stock increases.
Secondary Delivery + Invoice -> Distributor stock decreases and customer invoice is created.
