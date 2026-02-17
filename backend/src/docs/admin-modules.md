# Admin Dashboard Modules (Proposed Industry-Grade Structure)

This document defines a structured, detailed module map for the Admin Dashboard so the system can scale like a professional industry ERP. The focus is on **Warehouse & Inventory** and **Order Management**, with supporting modules and optional components you can enable later.

## 1) Warehouse & Inventory Module (Detailed)

### 1.1 Master Data (Foundation)
- **Company & Branches**
  - Company master (company ID, legal name, tax info).
  - Branch/master HQ structure (main branch + sub-branches).
  - Default currency, fiscal year, and pricing tiers.
- **Warehouses**
  - Warehouse types: *Raw*, *Production*, *Finished Goods*, *Quarantine*, *Final Release*.
  - Capacity, manager, address, status, and cost center.
  - One company can own multiple warehouses (main branch to branch warehouse mapping).
- **Regions → Zones → Areas**
  - **Warehouse → Zones** mapping (each zone is attached to a warehouse).
  - **Zones → Areas** mapping for delivery routes and coverage.
  - GPS coordinates and route planning data.
- **Products & Units**
  - SKU, barcode, units of measure, pack sizes, conversion factors.
  - Cost price, selling price, minimum stock level.
  - Category, brand, and tax class.
- **Suppliers & Distributors**
  - Supplier master (supplier ID, name, company linkage, CNIC, contact details).
  - Supplier to warehouse mapping (primary/secondary warehouses).
  - Distributor master linked to warehouse/zone coverage.

### 1.2 Inventory Ledger & Movements
- **Ledger-based stock tracking** (no direct manual stock editing).
- Movement types:
  - Purchase In, Transfer In/Out, Sales Out, Returns In, Adjustments.
- **Reference integrity**
  - Link movements to GRN, Purchase Orders, Sales Orders, Transfer IDs.
- **Audit trail**
  - Who posted, time, and related document references.

### 1.3 Warehouse Operations
- **Goods Receipt (GRN)**
  - Supplier → Warehouse receipts with QC status and batch info.
- **Inter-warehouse Transfers**
  - Requests, approvals, dispatch, and receiving confirmation.
  - Support for multiple stages (raw → production → finished).
- **Bin/Location Control (optional)**
  - Bin codes, racks, and location-level stock counts.
- **Cycle Counts & Stock Audits**
  - Scheduled counts by zone/area; variance reports.

### 1.4 Inventory Analytics
- **Stock Summary**
  - Current on-hand by product, warehouse, and zone.
- **Low Stock Alerts**
  - Compare on-hand vs. minimum stock thresholds.
- **Aging & Dead Stock**
  - Slow-moving vs. non-moving inventory reports.

### 1.5 Production & Stage Management (Optional)
- **Raw → WIP → Finished** tracking.
- Lot/batch production tracking with yield and wastage.

---

## 2) Order Management Module (Updated Primary + Secondary Sale)

### 2.1 Primary Sale (Warehouse Sale Stock Clone)
- Primary sale reuses warehouse sale stock behavior and APIs.
- Order request sources: **Brand Manager** and **Distributor**.
- Request queue supports **Unread** marker and **Preview**.
- Status flow: **pending → approved/rejected → dispatched → delivered**.
- Rejected status is visible on relevant dashboards and can be recovered **once**.
- On approval, invoice/receipt is generated and sent to relevant dashboards.
- Receipt action by brand/distributor: **Agree** / **Not Agree**.
  - Agree turns receipt line green.
- Warehouse/Admin then pick-pack, assign vehicle, dispatch, collect proof, and mark delivered.

### 2.2 Secondary Sale (Field Booking Flow)
- Order Booker books secondary sale orders from shops/markets/malls.
- Requests route to the relevant territory distributor and admin.
- Queue supports unread and preview states.
- If rejected, ledger receipt shows **Rejected stamp** in red for relevant stakeholders.
- If approved, receipt and alerts go to relevant salesman and related users.
- Salesman packs from distributor stock and dispatch is set by distributor/admin.
- Salesman uploads **Proof of Delivery** (camera/upload flow equivalent).
- Distributor/admin verifies proof and marks order delivered.
- Delivered status generates delivered-stamped receipt in ledger.

### 2.3 Direct Customer Requests
- Customer can place request directly from customer dashboard.
- Requests route to the linked territory distributor (not all distributors) and admin.
- Follow same approval, dispatch, proof, and delivery lifecycle as secondary sale.

### 2.4 Operational Controls
- Role-aware dashboards show relevant requests and status updates.
- Receipt agreement and proof-of-delivery are tracked at order level.
- Status history is kept for audit and ledger stamping workflows.

---

## 3) Supporting Modules (Recommended)

### 3.1 Procurement
- Supplier quotations, Purchase Orders, GRNs, and supplier payments.

### 3.2 Distribution & Logistics
- Vehicle master, route plans, driver assignments.
- Delivery cost tracking, fuel, maintenance.

### 3.3 Finance
- Invoices, payments, receipts, and aging.
- Profitability by product/warehouse.

### 3.4 HR & Role Management
- User roles: Admin, Warehouse Manager, Sales Manager, Distributor, Salesman, Order Booker, Driver, Customer, Supplier.

### 3.5 Quality & Compliance (Optional)
- QC pass/fail, quarantine stock, recall management.

---

## 4) Modules to Phase Later (If Not Needed Immediately)
- **Production/Manufacturing**: Only needed if you manufacture goods. If you are purely distribution, this can be delayed.
- **Quality/Compliance**: Use if you require batch QA or regulated industries.
- **Bin-level Storage**: Add later if warehouse complexity grows.
- **Advanced Finance**: Delay if basic invoicing and payments are enough.

---

## 5) Immediate Priorities for Implementation
1. Supplier role + linkage to warehouses (done in User Management fields).
2. Warehouse → Zone → Area linkage (done by attaching warehouses to zones, and zones to areas).
3. Order Management module update (Primary + Secondary sale workflows, receipt agreement, proof of delivery, delivered stamping).
4. Inventory ledger-based flow to keep audit and consistency.

