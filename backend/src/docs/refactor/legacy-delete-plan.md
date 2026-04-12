# Legacy delete plan

## Delete now
None.

Delete nothing right now. First complete migration, reconciliation, and route cutover.

## Delete later, after V2 cutover is fully complete

### Legacy model files to remove later
- `backend/src/models/SalesOrder.js`
- `backend/src/models/InventoryMovement.js`
- `backend/src/models/WarehouseTransaction.js`
- `backend/src/models/Receipt.js`
- `backend/src/models/PrimaryPayment.js`
- `backend/src/models/SecondaryPayment.js`

### Legacy route logic to remove later
- old mixed logic inside `backend/src/routes/orders.js`
- old mixed logic inside `backend/src/routes/inventory.js`
- old receipt logic inside `backend/src/routes/receipts.js`
- old primary/secondary payment logic inside `backend/src/routes/payments.js`

## Safe deletion checklist

Delete the legacy files only after all are true:

- [ ] `npm run migrate:v2:reconcile` looks correct
- [ ] reports use V2 collections
- [ ] all web order screens work on V2 collections
- [ ] mobile order screens work on V2 collections
- [ ] invoice/receipt screens work on V2 collections
- [ ] POD upload paths work on V2 collections
- [ ] one full production backup is saved
- [ ] old collections are archived or exported
