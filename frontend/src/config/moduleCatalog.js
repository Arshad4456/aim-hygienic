export const RAWYAN_MODULE_CATALOG = [
  ["dashboard","Dashboard","Core","/portals","Role-aware business overview."],
  ["companies","Companies","Core","/portals/companies","Company, branch, and tenant records."],
  ["erp-templates","ERP Templates","Core","/portals/erp-templates","ERP templates and business types."],
  ["roles","Roles & Permissions","Core","/portals/roles","Database-driven roles and permissions."],
  ["users","Users","Core","/portals/users","Company users and teams."],
  ["territory","Territory","Territory","/portals/territory","Regions, zones, areas, fields, routes, and beat plans."],
  ["products","Products","Inventory","/portals/products","Product catalog, SKU, pricing, and barcode setup."],
  ["procurement","Procurement","Supply Chain","/portals/procurement","Supplier to company purchase flow."],
  ["purchase-orders","Purchase Orders","Supply Chain","/portals/procurement/purchase-orders","Supplier order workflow."],
  ["supplier-payments","Supplier Payments","Supply Chain","/portals/procurement/payments","Company payments to suppliers."],
  ["inventory","Inventory","Inventory","/portals/inventory","Stock availability, ledgers, valuation, and movement."],
  ["warehouse","Warehouse","Inventory","/portals/warehouse","Goods receipts, dispatch preparation, transfers, and warehouse stock."],
  ["goods-receipts","Goods Receipts","Inventory","/portals/warehouse/goods-receipts","Receiving stock into company warehouse."],
  ["primary-sales-orders","Primary Sales Orders","Sales","/portals/sales/primary-orders","Company sells to distributor."],
  ["secondary-sales-orders","Secondary Sales Orders","Sales","/portals/sales/secondary-orders","Distributor sells to customer or retailer."],
  ["customers","Customers","Sales","/portals/customers","Customer and retailer management."],
  ["customer-orders","Customer Orders","Sales","/portals/customers/orders","Customer order requests and history."],
  ["finance","Finance","Finance","/portals/finance","Accounts, invoices, ledgers, balances, aging, and reports."],
  ["receipts","Receipts","Finance","/portals/finance/receipts","Distributor and customer collections."],
  ["payments","Payments","Finance","/portals/finance/payments","Supplier, distributor, expense, and loan payment workflows."],
  ["expenses","Expenses","Finance","/portals/expenses","Company and distributor expenses."],
  ["loans","Loans","Finance","/portals/loans","Loan details and repayment tracking."],
  ["returns","Returns","Operations","/portals/returns","Return stock, damage, expiry, and approval workflow."],
  ["fleet","Fleet","Logistics","/portals/fleet","Vehicles, trips, fuel, maintenance, and assignments."],
  ["dispatches","Dispatches","Logistics","/portals/logistics/dispatches","Warehouse dispatch to delivery users."],
  ["deliveries","Deliveries","Logistics","/portals/deliveries","Delivery day plan, proof of delivery, and exceptions."],
  ["live-tracking","Live Tracking","Logistics","/portals/live-tracking","Live location, duty sessions, route playback, and tracking reports."],
  ["messages","Messages","Communication","/portals/messages","Role-based messages and announcements."],
  ["reports","Reports","Reports","/portals/reports","Sales, inventory, finance, territory, fleet, and user activity reports."],
  ["settings","Settings","Core","/portals/settings","Company, user, portal, and password settings."],
].map(([key, name, category, path, description], index) => ({ key, name, category, path, canonicalPath: path, description, order: index + 1 }));

export const MODULE_BY_KEY = Object.fromEntries(RAWYAN_MODULE_CATALOG.map((item) => [item.key, item]));

export function findModuleByPath(pathname = "") {
  const clean = (pathname || "/portals").replace(/\/$/, "") || "/portals";
  return RAWYAN_MODULE_CATALOG.find((m) => clean === m.path || clean.startsWith(`${m.path}/`)) || MODULE_BY_KEY.dashboard;
}
