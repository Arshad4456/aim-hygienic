import { MODULE_BY_KEY, findModuleByPath } from "./moduleCatalog";
import { BRAND_CONFIG } from "./brand";

export const CANONICAL_PORTAL_ROUTES = {
  "/portals": "dashboard",
  "/portals/system-admin": "system-admin",
  "/portals/system-admin/companies": "system-admin-companies",
  "/portals/system-admin/users": "system-admin-users",
  "/portals/system-admin/subscriptions": "subscription-plans",
  "/portals/system-admin/modules": "module-controls",
  "/portals/company-control": "company-control",
  "/portals/companies": "companies",
  "/portals/erp-templates": "erp-templates",
  "/portals/roles": "roles",
  "/portals/users": "users",
  "/portals/territory": "territory",
  "/portals/master-data/suppliers": "suppliers",
  "/portals/master-data/warehouses": "warehouses",
  "/portals/master-data/regions": "regions",
  "/portals/master-data/zones": "zones",
  "/portals/master-data/areas": "areas",
  "/portals/master-data/fields": "fields",
  "/portals/products": "products",
  "/portals/procurement": "procurement",
  "/portals/procurement/purchase-requests": "purchase-requests",
  "/portals/procurement/purchase-orders": "purchase-orders",
  "/portals/procurement/payments": "supplier-payments",
  "/portals/inventory": "inventory",
  "/portals/warehouse": "warehouse",
  "/portals/warehouse/goods-receipts": "goods-receipts",
  "/portals/sales/quotations": "sales-quotations",
  "/portals/sales/primary-orders": "primary-sales-orders",
  "/portals/sales/secondary-orders": "secondary-sales-orders",
  "/portals/customers": "customers",
  "/portals/customers/orders": "customer-orders",
  "/portals/customer/billing": "customer-billing",
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
  "/portals/reports": "reports",
  "/portals/retail-pos": "retail-pos",
  "/portals/manufacturing": "manufacturing",
  "/portals/service": "service",
  "/portals/trading": "trading",
  "/portals/settings": "settings",
};

function cleanPath(pathname = "/portals") {
  return (pathname || "/portals").replace(/\/$/, "") || "/portals";
}

export function normalizePortalPath(pathname = "/portals") {
  return cleanPath(pathname);
}

export function getPortalRoute(pathname = "/portals") {
  const canonicalPath = normalizePortalPath(pathname);
  const key = CANONICAL_PORTAL_ROUTES[canonicalPath];
  const module = key ? MODULE_BY_KEY[key] : findModuleByPath(canonicalPath);
  return {
    pathname,
    canonicalPath,
    moduleKey: key || module?.key || "dashboard",
    title: module?.name || BRAND_CONFIG.name,
    module: module || MODULE_BY_KEY.dashboard,
    isLegacyAlias: false,
  };
}

export default CANONICAL_PORTAL_ROUTES;
