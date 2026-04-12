# Legacy → ERP V2 Migration Plan

This migration removes duplication by splitting the old mixed records into:

- **business documents**
- **inventory ledger**
- **receipts / payments with allocations**

## Critical rule

During migration:

- `SalesOrder`, `WarehouseTransaction`, `Receipt`, `PrimaryPayment`, and `SecondaryPayment` migrate into **document collections**.
- `InventoryMovement` migrates into **InventoryLedger** and is the only stock-truth source during migration.
- `WarehouseTransaction` does **not** create inventory ledger rows during migration, because that would duplicate stock that already exists in `InventoryMovement`.

---

## 1. SalesOrder migration

### Old source
- `SalesOrder`

### New targets
- `CompanySalesOrder` when `saleType = primary`
- `SecondaryOrder` when `saleType = secondary`

### Mapping rules
- `orderNo -> documentNo`
- `customerName / distributorId / customerId -> party snapshots`
- `items -> lines`
- `totalAmount -> totals.grandTotal`
- `status`
  - `pending -> draft` for company orders
  - `pending -> submitted` for secondary orders
  - `approved -> approved`
  - `dispatched -> dispatched`
  - `delivered -> delivered`
- `invoiceNo` only seeds `financialStatus`; invoice migration is a separate step
- `podUrl / proofOfDeliveryImageUrl -> podUrl`

---

## 2. InventoryMovement migration

### Old source
- `InventoryMovement`

### New target
- `InventoryLedger`

### Mapping rules
- `PURCHASE_IN -> purchase_receipt`
- `TRANSFER_IN -> transfer_in`
- `TRANSFER_OUT -> transfer_out`
- `SALE_OUT -> secondary_dispatch`
- `RETURN_IN -> return_in`
- `ADJUSTMENT -> adjustment_in / adjustment_out`

### Important
This is the authoritative stock migration. Do not double-post stock from `WarehouseTransaction` during migration.

---

## 3. WarehouseTransaction migration

### Old source
- `WarehouseTransaction`

### New targets
- `GoodsReceipt` for `PURCHASING_STOCK`, `STOCK_IN`
- `CompanyDispatchNote` for `SALE_STOCK`, `PURCHASING_OUT`, `STOCK_OUT`
- `ReturnDocument` for `RETURN_STOCK`, `RETURN_TO_SD`
- `MOVEMENT` is not auto-migrated into a document; review manually if needed

### Important
These migrated documents are **history documents** only in phase 1. Inventory truth still comes from `InventoryLedger` migrated from `InventoryMovement`.

---

## 4. Receipt migration

### Old source
- `Receipt`

### New targets
- `CustomerReceipt` when linked order is a secondary order
- `CompanyReceiptFromDistributor` otherwise

### Mapping rules
- `receiptNo -> documentNo`
- `linkedInvoiceNo -> allocations[].invoiceNo`
- `amount -> amount`
- `paymentMethod -> paymentMethod`
- `attachmentUrl -> attachmentUrl`
- `approved -> posted`

### Important
This migration creates receipt documents. Allocation to new invoice `_id` values should be completed in phase 2 reconciliation if invoice numbers already exist in migrated invoice tables.

---

## 5. PrimaryPayment migration

### Old source
- `PrimaryPayment`

### New target
- `CompanyInvoiceToDistributor`

### Mapping rules
- `invoiceNo -> documentNo`
- `amountTotal -> invoiceTotal`
- `amountPaidBack -> allocatedReceiptTotal`
- `amountRemaining -> balanceAmount`
- `payDate -> invoiceDate`
- `returnDate -> dueDate`

### Meaning
Legacy primary payment is treated as a company invoice / receivable from distributor.

---

## 6. SecondaryPayment migration

### Old source
- `SecondaryPayment`

### New target
- `CompanyReceiptFromDistributor`

### Mapping rules
- `primaryInvoiceNo -> allocations[].invoiceNo`
- `amountPaid -> amount`
- `paidDate -> paymentDate`

### Meaning
Legacy secondary payment is treated as a distributor payment against company invoice.

---

## 7. Run order

1. Dry run first
2. Migrate SalesOrder
3. Migrate InventoryMovement
4. Migrate WarehouseTransaction
5. Migrate Receipt
6. Migrate PrimaryPayment / SecondaryPayment
7. Reconcile counts
8. Update reports to V2 collections
9. Switch routes
10. Archive legacy collections

---

## 8. Commands

```bash
npm run migrate:v2:dry
npm run migrate:v2
npm run migrate:v2:reconcile
```

Single company only:

```bash
node src/scripts/migrations/runLegacyV2Migration.js --companyId=COMP-001 --dry-run
node src/scripts/migrations/runLegacyV2Migration.js --companyId=COMP-001
```

---

## 9. Do not delete legacy files yet

Do not delete these files before:

- routes switch to V2 models
- reports switch to V2 collections
- counts reconcile correctly
- production backup is taken

See `legacy-delete-plan.md`.
