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

## 2) Order Management Module (Detailed)

### 2.1 Sales Channels & Roles
- **Customer Orders** from customer dashboard.
- **Distributor Orders** for assigned zones.
- **Salesman/Order Booker Orders** on behalf of customers.
- **Channel-specific pricing** and discount rules.

### 2.2 Order Lifecycle
1. **Inquiry / Quote (optional)**
2. **Sales Order** (SO) created by customer/salesman/distributor
3. **Approval workflow** (credit limit, stock check, pricing check)
4. **Pick & Pack** (warehouse allocation)
5. **Dispatch & Delivery** (vehicle assignment, route plan)
6. **Invoice & Payment** (cash/credit, collection schedule)
7. **Returns & Claims** (RMA, defective, replacements)

### 2.3 Key Features
- **Order validation**
  - Check stock availability, customer credit limits, and pricing rules.
- **Allocation rules**
  - Allocate from main warehouse or nearest branch warehouse.
- **Delivery scheduling**
  - Assign distributor/vehicle/driver/route per zone/area.
- **Order status tracking**
  - Draft → Approved → Picking → Dispatched → Delivered → Closed.

### 2.4 Reporting
- **Open order backlog**
- **Fulfillment SLA**
- **Sales performance by zone/area**
- **Customer purchase history**

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
3. Order Management module scaffolding (Sales Order → Approval → Dispatch → Delivery).
4. Inventory ledger-based flow to keep audit and consistency.

