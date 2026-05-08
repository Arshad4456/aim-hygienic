import { RAWYAN_MODULE_CATALOG } from "./moduleCatalog";

export function normalizeRoleKey(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

const COMMON_COMPANY_MODULES = ["dashboard", "roles", "users", "products", "customers", "suppliers", "warehouses", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications"];
export const ERP_MODULE_SETS = {
  distribution_erp: [...COMMON_COMPANY_MODULES, "companies", "territory", "regions", "zones", "areas", "fields", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "operations", "fleet", "dispatches", "deliveries", "live-tracking"],
  trading_erp: [...COMMON_COMPANY_MODULES, "sales-quotations", "primary-sales-orders", "customer-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "trading"],
  manufacturing_erp: [...COMMON_COMPANY_MODULES, "sales-quotations", "primary-sales-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "manufacturing"],
  retail_pos_erp: [...COMMON_COMPANY_MODULES, "retail-pos", "customer-orders", "customer-billing", "returns", "goods-receipts"],
  service_erp: ["dashboard", "roles", "users", "customers", "products", "inventory", "finance", "receipts", "payments", "expenses", "service", "reports", "settings", "notifications"],
  custom_erp: [...COMMON_COMPANY_MODULES, "companies", "territory", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "procurement", "purchase-requests", "purchase-orders", "goods-receipts", "retail-pos", "manufacturing", "service", "trading", "operations", "fleet", "dispatches", "deliveries", "live-tracking"],
};
const SYSTEM_ADMIN_KEYS = ["system-admin", "system-admin-companies", "system-admin-users", "subscription-plans", "module-controls", "erp-templates", "reports", "settings"];
const role = (label, scope, homePath, moduleKeys) => ({ label, scope, homePath, moduleKeys });
const ROLE_PROFILES = {
  "system admin": role("System Admin", "system", "/portals/system-admin", SYSTEM_ADMIN_KEYS),
  admin: role("System Admin", "system", "/portals/system-admin", SYSTEM_ADMIN_KEYS),
  "company admin": role("Company Admin", "company", "/portals", ["*"]),
  ceo: role("CEO", "company", "/portals", ["dashboard", "reports", "finance", "inventory", "primary-sales-orders", "secondary-sales-orders", "retail-pos", "manufacturing", "service", "trading", "live-tracking", "settings"]),
  "purchase manager": role("Purchase Manager", "company", "/portals/procurement", ["dashboard", "suppliers", "products", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "reports", "settings"]),
  "finance manager": role("Finance Manager", "company", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "expenses", "loans", "reports", "settings"]),
  accountant: role("Accountant", "company", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "expenses", "reports", "settings"]),
  "sales manager": role("Sales Manager", "company", "/portals/sales/primary-orders", ["dashboard", "products", "customers", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "reports", "settings"]),
  "warehouse manager": role("Warehouse Manager", "company", "/portals/warehouse", ["dashboard", "warehouse", "warehouses", "inventory", "goods-receipts", "dispatches", "returns", "manufacturing", "reports", "settings"]),
  "dispatch / logistics": role("Dispatch / Logistics", "company", "/portals/operations", ["dashboard", "operations", "fleet", "dispatches", "deliveries", "live-tracking", "warehouse", "inventory", "reports", "settings"]),
  "brand manager": role("Brand Manager", "company", "/portals/sales/primary-orders", ["dashboard", "products", "customers", "sales-quotations", "primary-sales-orders", "retail-pos", "returns", "notifications", "reports", "settings"]),
  distributor: role("Distributor", "distributor", "/portals/sales/secondary-orders", ["dashboard", "users", "customers", "secondary-sales-orders", "customer-orders", "customer-billing", "inventory", "goods-receipts", "receipts", "payments", "finance", "returns", "notifications", "reports", "settings"]),
  "distributor accountant": role("Distributor Accountant", "distributor", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "customer-billing", "reports", "settings"]),
  "distributor store manager": role("Distributor Store Manager", "distributor", "/portals/inventory", ["dashboard", "inventory", "goods-receipts", "returns", "reports", "settings"]),
  salesman: role("Salesman", "field", "/portals/sales/secondary-orders", ["dashboard", "secondary-sales-orders", "customers", "receipts", "deliveries", "live-tracking", "settings"]),
  "order booker": role("Order Booker", "field", "/portals/sales/secondary-orders", ["dashboard", "secondary-sales-orders", "customers", "receipts", "live-tracking", "settings"]),
  "driver / delivery": role("Driver / Delivery", "field", "/portals/deliveries", ["dashboard", "deliveries", "dispatches", "live-tracking", "customer-billing", "settings"]),
  supplier: role("Supplier", "supplier", "/portals/procurement/purchase-orders", ["dashboard", "procurement", "purchase-requests", "purchase-orders", "notifications", "settings"]),
  customer: role("Customer", "customer", "/portals/customer/billing", ["dashboard", "customer-orders", "customer-billing", "returns", "settings"]),
  "store manager": role("Store Manager", "company", "/portals/retail-pos", ["dashboard", "retail-pos", "products", "customers", "inventory", "warehouse", "finance", "receipts", "returns", "reports", "settings"]),
  cashier: role("Cashier", "own", "/portals/retail-pos", ["dashboard", "retail-pos", "customers", "receipts", "returns", "settings"]),
  "production manager": role("Production Manager", "company", "/portals/manufacturing", ["dashboard", "manufacturing", "products", "inventory", "warehouse", "goods-receipts", "procurement", "purchase-requests", "reports", "settings"]),
  "production supervisor": role("Production Supervisor", "warehouse", "/portals/manufacturing", ["dashboard", "manufacturing", "inventory", "warehouse", "reports", "settings"]),
  "quality manager": role("Quality Manager", "company", "/portals/manufacturing", ["dashboard", "manufacturing", "inventory", "reports", "settings"]),
  "service manager": role("Service Manager", "company", "/portals/service", ["dashboard", "service", "customers", "products", "inventory", "finance", "receipts", "reports", "settings"]),
  "service agent": role("Service Agent", "own", "/portals/service", ["dashboard", "service", "customers", "inventory", "receipts", "settings"]),
  technician: role("Technician", "own", "/portals/service", ["dashboard", "service", "inventory", "settings"]),
  "trading manager": role("Trading Manager", "company", "/portals/trading", ["dashboard", "trading", "products", "customers", "suppliers", "procurement", "purchase-orders", "primary-sales-orders", "inventory", "warehouse", "finance", "reports", "settings"]),
  "import officer": role("Import Officer", "company", "/portals/trading", ["dashboard", "trading", "suppliers", "procurement", "purchase-orders", "inventory", "warehouse", "finance", "reports", "settings"]),
  "export officer": role("Export Officer", "company", "/portals/trading", ["dashboard", "trading", "customers", "primary-sales-orders", "inventory", "finance", "reports", "settings"]),
};
const ROLE_ALIASES = { "super admin": "system admin", "system_admin": "system admin", "super_admin": "system admin", "company_admin": "company admin", "delivery boy": "driver / delivery", driver: "driver / delivery", delivery: "driver / delivery", orderbooker: "order booker", logistics: "dispatch / logistics", dispatch: "dispatch / logistics", "finance / accounts": "finance manager", "finance user": "finance manager", "account officer": "accountant", "warehouse_manager": "warehouse manager", "store_manager": "store manager", "production_manager": "production manager", "production_supervisor": "production supervisor", "quality_manager": "quality manager", "service_manager": "service manager", "service_agent": "service agent", "trading_manager": "trading manager", "import_officer": "import officer", "export_officer": "export officer" };
function rawRoleFromUser(user = {}) { const pt = normalizeRoleKey(user?.portalType || ""); const rk = normalizeRoleKey(user?.roleKey || ""); if (["system admin", "super admin"].includes(pt) || ["super admin", "system admin"].includes(rk)) return "system admin"; if (pt === "company admin" || rk === "company admin") return "company admin"; return user?.roleName || user?.role || user?.type || user?.portalType || ""; }
function erpKeyFromUser(user = {}) { return String(user?.erpTemplateKey || user?.businessType || "distribution_erp").trim() || "distribution_erp"; }
function uniq(list = []) { return Array.from(new Set(list.filter(Boolean))); }
function expandWildcardModules(keys = [], erpTemplateKey = "distribution_erp") { return keys.includes("*") ? ERP_MODULE_SETS[erpTemplateKey] || ERP_MODULE_SETS.distribution_erp : keys; }
function applyErpScope(keys = [], profile = {}, user = {}) { if (profile.scope === "system") return uniq(keys); const erpAllowed = new Set([...(ERP_MODULE_SETS[erpKeyFromUser(user)] || ERP_MODULE_SETS.distribution_erp), "dashboard"]); return uniq(expandWildcardModules(keys, erpKeyFromUser(user)).filter((key) => erpAllowed.has(key))); }
export function getRolePortalProfile(roleOrUser = "") { const isObj = typeof roleOrUser === "object"; const raw = isObj ? rawRoleFromUser(roleOrUser) : roleOrUser; const normalized = normalizeRoleKey(raw); const alias = ROLE_ALIASES[normalized] || normalized; const base = ROLE_PROFILES[alias] || ROLE_PROFILES[normalized] || ROLE_PROFILES["company admin"]; const moduleKeys = applyErpScope(base.moduleKeys || [], base, isObj ? roleOrUser : {}); return { key: alias || "company admin", ...base, moduleKeys }; }
export function getDefaultPathForRole(roleOrUser = "") { return getRolePortalProfile(roleOrUser).homePath || "/portals"; }
export function isSystemPortalRole(roleOrUser = "") { return getRolePortalProfile(roleOrUser).scope === "system"; }
export function isModuleAllowedForRole(roleOrUser, moduleKey) { const key = String(moduleKey || "").trim(); return Boolean(key && getRolePortalProfile(roleOrUser).moduleKeys.includes(key)); }
export function filterModulesForRole(roleOrUser, modules = RAWYAN_MODULE_CATALOG) { const profile = getRolePortalProfile(roleOrUser); const allowed = new Set(profile.moduleKeys || []); return (modules || []).filter((module) => allowed.has(module.key)); }
export function isPathAllowedForRole(roleOrUser, route) { return Boolean(route?.moduleKey && isModuleAllowedForRole(roleOrUser, route.moduleKey)); }
export function getSafeRouteForUser(user = {}) { return getDefaultPathForRole(user); }
export default ROLE_PROFILES;
