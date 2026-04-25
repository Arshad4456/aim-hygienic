const ADMIN_PATHS = {
  dashboard: "/portals/admin",
  companies: "/portals/admin/companies",
  "erp-templates": "/portals/erp-templates",
  roles: "/portals/roles",
  users: "/portals/users",
  territory: "/portals/admin/regions",
  products: "/portals/admin/products",
  procurement: "/portals/admin/procurement",
  "purchase-orders": "/portals/admin/procurement/purchase-orders",
  "supplier-payments": "/portals/admin/procurement/payments",
  inventory: "/portals/admin/warehouse-inventory",
  warehouse: "/portals/admin/warehouses",
  "goods-receipts": "/portals/admin/procurement/grn",
  "primary-sales-orders": "/portals/admin/order-management/sales-orders",
  "primary-orders": "/portals/admin/order-management/sales-orders",
  "secondary-sales-orders": "/portals/admin/order-management/sales-orders",
  "secondary-orders": "/portals/admin/order-management/sales-orders",
  customers: "/portals/admin/users",
  "customer-orders": "/portals/admin/order-management/sales-orders",
  finance: "/portals/admin/finance",
  receipts: "/portals/admin/finance/receipts",
  payments: "/portals/admin/finance/payments",
  expenses: "/portals/admin/expense",
  loans: "/portals/admin/account/manage",
  returns: "/portals/admin/order-management/returns",
  fleet: "/portals/admin/vehicle-management",
  dispatches: "/portals/admin/logistics/dispatch",
  deliveries: "/portals/admin/logistics/dispatch",
  "live-tracking": "/portals/admin/live-tracking",
  live_tracking: "/portals/admin/live-tracking",
  messages: "/portals/admin/messages",
  reports: "/portals/admin/reports",
  settings: "/portals/admin/settings",
};

const DISTRIBUTOR_PATHS = { dashboard: "/portals/distributor", inventory: "/portals/distributor/inventory", warehouse: "/portals/distributor/stock-received", "primary-sales-orders": "/portals/distributor/primary-order-request", "primary-orders": "/portals/distributor/primary-order-request", "secondary-sales-orders": "/portals/distributor/orders", "secondary-orders": "/portals/distributor/orders", customers: "/portals/distributor/users", users: "/portals/users", "customer-orders": "/portals/distributor/customer-invoices", finance: "/portals/distributor/accounts", receipts: "/portals/distributor/receipts", payments: "/portals/distributor/payments", expenses: "/portals/distributor/expense", returns: "/portals/distributor/return-stock", "live-tracking": "/portals/distributor/live-tracking", live_tracking: "/portals/distributor/live-tracking", messages: "/portals/distributor/messages", reports: "/portals/distributor/reports", settings: "/portals/distributor/settings" };
const SALESMAN_PATHS = { dashboard: "/portals/salesman", customers: "/portals/salesman/customers", "secondary-sales-orders": "/portals/salesman/orders", "secondary-orders": "/portals/salesman/orders", receipts: "/portals/salesman/collections", deliveries: "/portals/salesman/deliveries" };
const ORDER_BOOKER_PATHS = { dashboard: "/portals/orderBooker", customers: "/portals/orderBooker/customers", "secondary-sales-orders": "/portals/orderBooker/orders", "secondary-orders": "/portals/orderBooker/orders", receipts: "/portals/orderBooker/collections" };
const WAREHOUSE_PATHS = { dashboard: "/portals/warehouseManager", warehouse: "/portals/warehouseManager/warehouse-inventory", inventory: "/portals/warehouseManager/stock-summary", "goods-receipts": "/portals/warehouseManager/goods-receipts", dispatches: "/portals/warehouseManager/dispatch-preparation", returns: "/portals/warehouseManager/damage-expiry", payments: "/portals/warehouseManager/payments" };
const DELIVERY_PATHS = { dashboard: "/portals/deliveryBoy", deliveries: "/portals/deliveryBoy/orders", dispatches: "/portals/deliveryBoy/dispatches", "live-tracking": "/portals/deliveryBoy/tracking", live_tracking: "/portals/deliveryBoy/tracking" };
const CUSTOMER_PATHS = { dashboard: "/portals/customer", customers: "/portals/customer", "customer-orders": "/portals/customer/orders", receipts: "/portals/customer/receipts", returns: "/portals/customer/returns", settings: "/portals/customer/settings" };
const SUPPLIER_PATHS = { dashboard: "/portals/supplier", procurement: "/portals/supplier/primary-orders", "purchase-orders": "/portals/supplier/primary-orders", messages: "/portals/supplier/messages", settings: "/portals/supplier/settings" };
const BRAND_MANAGER_PATHS = { dashboard: "/portals/brandManager", "primary-sales-orders": "/portals/brandManager/primary-order-request", "primary-orders": "/portals/brandManager/primary-order-request", returns: "/portals/brandManager/return-stock", messages: "/portals/brandManager/messages", settings: "/portals/brandManager/settings" };
function normalizeRole(role) { return String(role || "").trim().toLowerCase().replace(/_/g, " "); }
function selectMap(user = {}) { const role = normalizeRole(user.role || user.roleName || user.portalType); const portalType = normalizeRole(user.portalType); if (role.includes("distributor") || portalType.includes("distributor")) return DISTRIBUTOR_PATHS; if (role.includes("salesman")) return SALESMAN_PATHS; if (role.includes("order booker") || role.includes("orderbooker")) return ORDER_BOOKER_PATHS; if (role.includes("warehouse")) return WAREHOUSE_PATHS; if (role.includes("delivery") || role.includes("driver")) return DELIVERY_PATHS; if (role.includes("customer")) return CUSTOMER_PATHS; if (role.includes("supplier")) return SUPPLIER_PATHS; if (role.includes("brand")) return BRAND_MANAGER_PATHS; return ADMIN_PATHS; }
export function getWorkingPortalPath(moduleKey, user = {}, fallbackPath = "/portals") { const key = String(moduleKey || "dashboard").trim().toLowerCase(); const map = selectMap(user); return map[key] || ADMIN_PATHS[key] || fallbackPath || "/portals"; }
export function normalizeMenuForWorkingScreens(items = [], user = {}) { return items.map((item) => ({ ...item, canonicalPath: item.canonicalPath || item.path, path: getWorkingPortalPath(item.key, user, item.path) })); }
