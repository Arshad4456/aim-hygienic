# Final legacy delete plan after Step 3

## Runtime status

Legacy runtime usage has been removed from active backend routes and services.

Active runtime routes/services now use V2 collections instead of these legacy transaction models:
- `SalesOrder`
- `InventoryMovement`
- `WarehouseTransaction`
- `Receipt`
- `PrimaryPayment`
- `SecondaryPayment`
- `ReturnClaim`

## Delete now
None.

Do not delete the legacy files immediately after Step 3. Keep them until:
- frontend UI/UX testing is completed on V2,
- mobile testing is completed on V2,
- one production backup/export is saved,
- and the team confirms rollback is no longer needed.

## Final delete list (delete after V2 UI + mobile signoff)

### Legacy model files
- `backend/src/models/SalesOrder.js`
- `backend/src/models/InventoryMovement.js`
- `backend/src/models/WarehouseTransaction.js`
- `backend/src/models/Receipt.js`
- `backend/src/models/PrimaryPayment.js`
- `backend/src/models/SecondaryPayment.js`
- `backend/src/models/ReturnClaim.js`

### Optional archival cleanup later
Keep these until you are fully done with migration validation and historical reference.
You may archive or remove them later if you no longer need migration history:
- `backend/src/scripts/migrations/01_migrate_sales_orders.js`
- `backend/src/scripts/migrations/02_migrate_inventory_movements.js`
- `backend/src/scripts/migrations/03_migrate_warehouse_transactions.js`
- `backend/src/scripts/migrations/04_migrate_receipts.js`
- `backend/src/scripts/migrations/05_migrate_primary_secondary_payments.js`
- `backend/src/scripts/migrations/reconcileLegacyV2Migration.js`
- `backend/src/scripts/migrations/runLegacyV2Migration.js`
- `backend/src/services/migrations/legacyMappers.js`
- `backend/src/docs/refactor/legacy-to-v2-migration-plan.md`

## Safe deletion checklist

Delete the legacy model files only after all are true:

- [x] migration runs successfully for V2 target collections
- [x] V2 route bundle is deployed
- [x] reports, dashboard, and sales KPI use V2 sources
- [x] finance bridge and return posting use V2 sources
- [x] active backend runtime routes/services no longer import legacy transaction models
- [ ] web UI order, receipt, dispatch, POD, and report screens are verified on V2
- [ ] mobile flows are verified on V2
- [ ] one full production backup is saved
- [ ] old collections are archived or exported if needed
