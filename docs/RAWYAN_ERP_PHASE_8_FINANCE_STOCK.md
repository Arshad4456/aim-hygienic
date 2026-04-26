# Rawyan ERP Phase 8: Finance, Distributor Stock, and Stock Summary Fixes

Phase 8 finalizes the finance foundation and fixes stock ownership issues discovered after Phase 7.

## Fixes included

- Distributor stock no longer defaults to the logged-in company admin user.
- Company admins can view all distributor stock and select a distributor before creating secondary sales.
- Secondary sales uses the selected distributor's stock owner and warehouse.
- Product names are hydrated from Product Master to avoid generic names such as `Primary sale item` in new transactions.
- Inventory summary now shows product-level stock availability, not just movement lines.
- Warehouse stock detail still remains available separately.
- Finance center added for distributor invoices, distributor receipts, customer receivables, supplier payables, and cash/bank overview.

## Correct flow

Supplier purchase -> Post GRN -> Company stock increases.
Company primary sales -> Post dispatch -> Company stock decreases and distributor invoice generates.
Post distributor receipt -> Distributor stock increases.
Distributor secondary sales -> Deliver/invoice -> Distributor stock decreases and customer invoice generates.
Finance -> Distributor invoice payment -> Company receipt from distributor generates.

## Important behavior

Distributor stock becomes available only after the distributor stock receipt is posted. Posting the company dispatch alone creates a distributor receipt draft and invoice, but it does not increase distributor stock until the receipt is posted.
