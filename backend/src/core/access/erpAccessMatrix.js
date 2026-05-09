const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "reject", "export", "print", "assign", "track"];
const COMMON_COMPANY_MODULES = ["dashboard", "roles", "users", "products", "customers", "suppliers", "warehouses", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications"];
const SYSTEM_MODULE_KEYS = ["dashboard", "system-admin", "system-admin-companies", "system-admin-users", "subscription-plans", "module-controls", "erp-templates", "reports", "settings"];
const ERP_MODULE_SETS = {
  distribution_erp: [...COMMON_COMPANY_MODULES, "territory", "regions", "zones", "areas", "fields", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "operations", "fleet", "dispatches", "deliveries", "live-tracking"],
  trading_erp: [...COMMON_COMPANY_MODULES, "sales-quotations", "primary-sales-orders", "customer-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "trading"],
  manufacturing_erp: [...COMMON_COMPANY_MODULES, "sales-quotations", "primary-sales-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "manufacturing"],
  retail_pos_erp: ["dashboard", "users", "roles", "products", "customers", "warehouses", "inventory", "warehouse", "retail-pos", "customer-orders", "customer-billing", "returns", "goods-receipts", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications"],
  service_erp: ["dashboard", "users", "roles", "customers", "products", "inventory", "warehouse", "service", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications"],
  custom_erp: [...COMMON_COMPANY_MODULES, "territory", "regions", "zones", "areas", "fields", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "retail-pos", "manufacturing", "service", "trading", "operations", "fleet", "dispatches", "deliveries", "live-tracking"],
};
const ERP_TYPES = Object.keys(ERP_MODULE_SETS);
const ROLE_ALIASES = { admin: "system admin", "super admin": "system admin", system_admin: "system admin", super_admin: "system admin", company_admin: "company admin", warehouse_manager: "warehouse manager", "finance / accounts": "finance manager", "account officer": "accountant", driver: "driver / delivery", delivery: "driver / delivery", "delivery boy": "driver / delivery", orderbooker: "order booker", store_manager: "store manager", production_manager: "production manager", production_supervisor: "production supervisor", quality_manager: "quality manager", service_manager: "service manager", service_agent: "service agent", trading_manager: "trading manager", import_officer: "import officer", export_officer: "export officer" };
function normalizeRole(value = "") { return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " "); }
function normalizeModule(value = "") { return String(value || "").trim().toLowerCase().replace(/_/g, "-"); }
function normalizeErpType(value = "") { const key = String(value || "").trim().toLowerCase().replace(/-/g, "_") || "distribution_erp"; return ERP_MODULE_SETS[key] ? key : "distribution_erp"; }
function uniq(list = []) { return Array.from(new Set((list || []).filter(Boolean))); }
const role = (label, scope, landingPath, modules) => ({ label, scope, landingPath, modules });
const ROLE_ACCESS_MATRIX = {
  "system admin": role("System Admin", "system", "/portals/system-admin", SYSTEM_MODULE_KEYS),
  "company admin": role("Company Admin", "company", "/portals", ["*"]),
  ceo: role("CEO", "company", "/portals", ["dashboard", "reports", "finance", "inventory", "primary-sales-orders", "secondary-sales-orders", "retail-pos", "manufacturing", "service", "trading", "settings"]),
  "purchase manager": role("Purchase Manager", "company", "/portals/procurement", ["dashboard", "suppliers", "products", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "reports", "settings", "notifications"]),
  "finance manager": role("Finance Manager", "company", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "expenses", "loans", "reports", "settings", "notifications"]),
  accountant: role("Accountant", "company", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications"]),
  "sales manager": role("Sales Manager", "company", "/portals/sales/primary-orders", ["dashboard", "products", "customers", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "reports", "settings", "notifications"]),
  "warehouse manager": role("Warehouse Manager", "warehouse", "/portals/warehouse", ["dashboard", "warehouse", "warehouses", "inventory", "goods-receipts", "dispatches", "returns", "manufacturing", "reports", "settings", "notifications"]),
  distributor: role("Distributor", "distributor", "/portals/sales/secondary-orders", ["dashboard", "users", "customers", "secondary-sales-orders", "customer-orders", "customer-billing", "inventory", "goods-receipts", "receipts", "payments", "finance", "returns", "reports", "settings", "notifications", "live-tracking"]),
  salesman: role("Salesman", "own", "/portals/sales/secondary-orders", ["dashboard", "secondary-sales-orders", "customers", "receipts", "deliveries", "live-tracking", "settings"]),
  "order booker": role("Order Booker", "own", "/portals/sales/secondary-orders", ["dashboard", "secondary-sales-orders", "customers", "receipts", "live-tracking", "settings"]),
  "driver / delivery": role("Driver / Delivery", "own", "/portals/deliveries", ["dashboard", "deliveries", "dispatches", "live-tracking", "customer-billing", "settings"]),
  supplier: role("Supplier", "own", "/portals/procurement/purchase-orders", ["dashboard", "procurement", "purchase-requests", "purchase-orders", "notifications", "settings"]),
  customer: role("Customer", "own", "/portals/customer/billing", ["dashboard", "customer-orders", "customer-billing", "returns", "settings"]),
  "store manager": role("Store Manager", "company", "/portals/retail-pos", ["dashboard", "retail-pos", "products", "customers", "inventory", "warehouse", "finance", "receipts", "returns", "reports", "settings", "notifications"]),
  cashier: role("Cashier", "own", "/portals/retail-pos", ["dashboard", "retail-pos", "customers", "receipts", "returns", "settings"]),
  "production manager": role("Production Manager", "company", "/portals/manufacturing", ["dashboard", "manufacturing", "products", "inventory", "warehouse", "goods-receipts", "procurement", "purchase-requests", "reports", "settings", "notifications"]),
  "production supervisor": role("Production Supervisor", "warehouse", "/portals/manufacturing", ["dashboard", "manufacturing", "inventory", "warehouse", "reports", "settings"]),
  "quality manager": role("Quality Manager", "company", "/portals/manufacturing", ["dashboard", "manufacturing", "inventory", "reports", "settings", "notifications"]),
  "service manager": role("Service Manager", "company", "/portals/service", ["dashboard", "service", "customers", "products", "inventory", "finance", "receipts", "reports", "settings", "notifications"]),
  "service agent": role("Service Agent", "own", "/portals/service", ["dashboard", "service", "customers", "inventory", "receipts", "settings"]),
  technician: role("Technician", "own", "/portals/service", ["dashboard", "service", "inventory", "settings"]),
  "trading manager": role("Trading Manager", "company", "/portals/trading", ["dashboard", "trading", "products", "customers", "suppliers", "procurement", "purchase-orders", "primary-sales-orders", "inventory", "warehouse", "finance", "reports", "settings", "notifications"]),
  "import officer": role("Import Officer", "company", "/portals/trading", ["dashboard", "trading", "suppliers", "procurement", "purchase-orders", "inventory", "warehouse", "finance", "reports", "settings"]),
  "export officer": role("Export Officer", "company", "/portals/trading", ["dashboard", "trading", "customers", "primary-sales-orders", "inventory", "finance", "reports", "settings"]),
};
function resolveRoleKey(value = "") { const normalized = normalizeRole(value); return ROLE_ALIASES[normalized] || normalized || "company admin"; }
function getRoleAccess(roleName = "", erpTemplateKey = "distribution_erp") { const key = resolveRoleKey(roleName); const erp = normalizeErpType(erpTemplateKey); const profile = ROLE_ACCESS_MATRIX[key] || ROLE_ACCESS_MATRIX["company admin"]; const erpModules = ERP_MODULE_SETS[erp] || ERP_MODULE_SETS.distribution_erp; const modules = profile.scope === "system" ? profile.modules : (profile.modules.includes("*") ? erpModules : profile.modules.filter((m) => m === "dashboard" || erpModules.includes(m))); return { key, ...profile, erpTemplateKey: erp, modules: uniq(modules) }; }
function getAllowedModulesForRole(roleName, erpTemplateKey) { return getRoleAccess(roleName, erpTemplateKey).modules; }
function getLandingPathForRole(roleName, erpTemplateKey) { return getRoleAccess(roleName, erpTemplateKey).landingPath || "/portals"; }
module.exports = { PERMISSION_ACTIONS, ERP_TYPES, SYSTEM_MODULE_KEYS, ERP_MODULE_SETS, ROLE_ACCESS_MATRIX, ROLE_ALIASES, normalizeRole, normalizeModule, normalizeErpType, resolveRoleKey, getRoleAccess, getAllowedModulesForRole, getLandingPathForRole };
