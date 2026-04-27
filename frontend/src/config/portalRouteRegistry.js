import { MODULE_BY_KEY, findModuleByPath } from "./moduleCatalog";

export const CANONICAL_PORTAL_ROUTES = {
  "/portals": "dashboard",
  "/portals/system-admin": "system-admin",
  "/portals/system-admin/companies": "system-admin-companies",
  "/portals/system-admin/subscriptions": "subscription-plans",
  "/portals/system-admin/modules": "module-controls",
  "/portals/companies": "companies",
  "/portals/erp-templates": "erp-templates",
  "/portals/roles": "roles",
  "/portals/users": "users",
  "/portals/territory": "territory",
  "/portals/products": "products",
  "/portals/procurement": "procurement",
  "/portals/procurement/purchase-orders": "purchase-orders",
  "/portals/procurement/payments": "supplier-payments",
  "/portals/inventory": "inventory",
  "/portals/warehouse": "warehouse",
  "/portals/warehouse/goods-receipts": "goods-receipts",
  "/portals/sales/primary-orders": "primary-sales-orders",
  "/portals/sales/secondary-orders": "secondary-sales-orders",
  "/portals/customers": "customers",
  "/portals/customers/orders": "customer-orders",
  "/portals/customer/billing": "customer-billing",
  "/portals/customer/invoices": "customer-billing",
  "/portals/customer/receipts": "customer-billing",
  "/portals/customers/billing": "customer-billing",
  "/portals/finance": "finance",
  "/portals/finance/receipts": "receipts",
  "/portals/finance/payments": "payments",
  "/portals/expenses": "expenses",
  "/portals/loans": "loans",
  "/portals/returns": "returns",
  "/portals/operations": "operations",
  "/portals/fleet": "fleet",
  "/portals/logistics/dispatches": "dispatches",
  "/portals/deliveries": "deliveries",
  "/portals/live-tracking": "live-tracking",
  "/portals/notifications": "notifications",
  "/portals/messages": "notifications",
  "/portals/reports": "reports",
  "/portals/settings": "settings",
};

export const LEGACY_PORTAL_ALIASES = {
  "/portals/admin": "/portals",
  "/portals/admin/users": "/portals/users",
  "/portals/admin/companies": "/portals/companies",
  "/portals/admin/module-access": "/portals/roles",
  "/portals/admin/regions": "/portals/territory",
  "/portals/admin/zones": "/portals/territory",
  "/portals/admin/areas": "/portals/territory",
  "/portals/admin/fields": "/portals/territory",
  "/portals/admin/products": "/portals/products",
  "/portals/admin/procurement": "/portals/procurement",
  "/portals/admin/procurement/purchase-orders": "/portals/procurement/purchase-orders",
  "/portals/admin/procurement/payments": "/portals/procurement/payments",
  "/portals/admin/procurement/grn": "/portals/warehouse/goods-receipts",
  "/portals/admin/warehouse-inventory": "/portals/warehouse",
  "/portals/admin/warehouses": "/portals/warehouse",
  "/portals/admin/order-management": "/portals/sales/primary-orders",
  "/portals/admin/order-management/sales-orders": "/portals/sales/primary-orders",
  "/portals/admin/finance": "/portals/finance",
  "/portals/admin/expense": "/portals/expenses",
  "/portals/admin/account": "/portals/loans",
  "/portals/admin/vehicle-management": "/portals/fleet",
  "/portals/admin/assets/vehicles": "/portals/fleet",
  "/portals/admin/logistics": "/portals/operations",
  "/portals/admin/live-tracking": "/portals/live-tracking",
  "/portals/admin/messages": "/portals/notifications",
  "/portals/admin/reports": "/portals/reports",
  "/portals/admin/settings": "/portals/settings",
  "/portals/distributor": "/portals",
  "/portals/distributor/orders": "/portals/sales/secondary-orders",
  "/portals/distributor/primary-order-request": "/portals/sales/primary-orders",
  "/portals/distributor/customer-invoices": "/portals/customers/orders",
  "/portals/distributor/receipts": "/portals/finance/receipts",
  "/portals/distributor/payments": "/portals/finance/payments",
  "/portals/distributor/accounts": "/portals/finance",
  "/portals/distributor/inventory": "/portals/inventory",
  "/portals/distributor/stock-received": "/portals/warehouse/goods-receipts",
  "/portals/distributor/return-stock": "/portals/returns",
  "/portals/distributor/damage-expiry": "/portals/returns",
  "/portals/distributor/live-tracking": "/portals/live-tracking",
  "/portals/distributor/users": "/portals/users",
  "/portals/distributor/messages": "/portals/notifications",
  "/portals/distributor/reports": "/portals/reports",
  "/portals/distributor/settings": "/portals/settings",
  "/portals/salesman": "/portals",
  "/portals/salesman/orders": "/portals/sales/secondary-orders",
  "/portals/salesman/customers": "/portals/customers",
  "/portals/salesman/collections": "/portals/finance/receipts",
  "/portals/salesman/deliveries": "/portals/deliveries",
  "/portals/orderBooker": "/portals",
  "/portals/orderBooker/orders": "/portals/sales/secondary-orders",
  "/portals/orderBooker/customers": "/portals/customers",
  "/portals/orderBooker/collections": "/portals/finance/receipts",
  "/portals/warehouseManager": "/portals/warehouse",
  "/portals/warehouseManager/orders": "/portals/logistics/dispatches",
  "/portals/warehouseManager/goods-receipts": "/portals/warehouse/goods-receipts",
  "/portals/warehouseManager/warehouse-inventory": "/portals/warehouse",
  "/portals/warehouseManager/stock-summary": "/portals/inventory",
  "/portals/warehouseManager/damage-expiry": "/portals/returns",
  "/portals/warehouseManager/payments": "/portals/finance/payments",
  "/portals/deliveryBoy": "/portals/deliveries",
  "/portals/deliveryBoy/orders": "/portals/deliveries",
  "/portals/deliveryBoy/dispatches": "/portals/logistics/dispatches",
  "/portals/deliveryBoy/tracking": "/portals/live-tracking",
  "/portals/customer": "/portals/customer/billing",
  "/portals/customer/orders": "/portals/customer/billing",
  "/portals/customer/invoices": "/portals/customer/billing",
  "/portals/customer/receipts": "/portals/customer/billing",
  "/portals/customer/returns": "/portals/returns",
  "/portals/customer/settings": "/portals/settings",
  "/portals/supplier": "/portals/procurement",
  "/portals/supplier/primary-orders": "/portals/procurement/purchase-orders",
  "/portals/supplier/messages": "/portals/notifications",
  "/portals/supplier/settings": "/portals/settings",
  "/portals/brandManager": "/portals/sales/primary-orders",
  "/portals/brandManager/primary-order-request": "/portals/sales/primary-orders",
  "/portals/brandManager/return-stock": "/portals/returns",
  "/portals/brandManager/messages": "/portals/notifications",
};

function cleanPath(pathname = "/portals") {
  return (pathname || "/portals").replace(/\/$/, "") || "/portals";
}

function applyLegacyAlias(pathname = "/portals") {
  const clean = cleanPath(pathname);
  if (LEGACY_PORTAL_ALIASES[clean]) return LEGACY_PORTAL_ALIASES[clean];

  const match = Object.keys(LEGACY_PORTAL_ALIASES)
    .sort((a, b) => b.length - a.length)
    .find((legacyPath) => clean.startsWith(`${legacyPath}/`));

  if (!match) return clean;
  const suffix = clean.slice(match.length);
  return `${LEGACY_PORTAL_ALIASES[match]}${suffix}`;
}

export function normalizePortalPath(pathname = "/portals") {
  return applyLegacyAlias(pathname);
}

export function getPortalRoute(pathname = "/portals") {
  const normalizedPath = cleanPath(pathname);
  const canonicalPath = normalizePortalPath(pathname);
  const key = CANONICAL_PORTAL_ROUTES[canonicalPath];
  const module = key ? MODULE_BY_KEY[key] : findModuleByPath(canonicalPath);
  return {
    pathname,
    canonicalPath,
    moduleKey: key || module?.key || "dashboard",
    title: module?.name || "Rawyan ERP",
    module: module || MODULE_BY_KEY.dashboard,
    isLegacyAlias: normalizedPath !== canonicalPath,
  };
}

export default CANONICAL_PORTAL_ROUTES;
