# Rawyan ERP Phase 7: Secondary Sales Foundation

Phase 7 adds Distributor to Customer secondary sales and fixes the procurement product-stock link.

## Procurement stock-link fix
Purchase Orders now use Product Master and Receiving Warehouse dropdowns. Posted GRNs write the same `productId` and warehouse used by Primary Sales, so company stock becomes available for distributor dispatch.

## Secondary sales flow
Distributor Stock Available -> Secondary Sales Order -> Approve -> Deliver + Invoice -> Distributor stock decreases -> Customer invoice generates -> Customer receipt posts.

## Test route
`/portals/sales/secondary-orders`
