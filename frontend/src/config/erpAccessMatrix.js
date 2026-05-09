import { RAWYAN_MODULE_CATALOG, MODULE_BY_KEY } from "./moduleCatalog";

export const ERP_TYPES = [
  { key: "distribution_erp", label: "Distribution ERP", description: "Distributor, territory, route, dispatch, credit, and secondary sales operations." },
  { key: "trading_erp", label: "Trading ERP", description: "Import/export, LC, landed cost, supplier/customer trading and margins." },
  { key: "manufacturing_erp", label: "Manufacturing ERP", description: "BOM, production, raw material, QC, finished goods and costing." },
  { key: "retail_pos_erp", label: "Retail POS ERP", description: "POS billing, cashier sessions, branch inventory, returns and receipts." },
  { key: "service_erp", label: "Service ERP", description: "Tickets, AMC contracts, assets, technicians, spare parts and service billing." },
  { key: "custom_erp", label: "Custom ERP", description: "Custom combination of approved ERP modules." },
];

export const SYSTEM_MODULE_KEYS = [
  "dashboard", "system-admin", "system-admin-companies", "system-admin-users", "subscription-plans", "module-controls", "erp-templates", "reports", "settings",
];

const COMMON_COMPANY_MODULES = [
  "dashboard", "users", "roles", "products", "customers", "suppliers", "warehouses", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications",
];

export const ERP_MODULE_SETS = {
  distribution_erp: [
    ...COMMON_COMPANY_MODULES,
    "territory", "regions", "zones", "areas", "fields",
    "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns",
    "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts",
    "operations", "fleet", "dispatches", "deliveries", "live-tracking",
  ],
  trading_erp: [
    ...COMMON_COMPANY_MODULES,
    "sales-quotations", "primary-sales-orders", "customer-orders", "returns",
    "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "trading",
  ],
  manufacturing_erp: [
    ...COMMON_COMPANY_MODULES,
    "sales-quotations", "primary-sales-orders", "returns",
    "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "manufacturing",
  ],
  retail_pos_erp: [
    "dashboard", "users", "roles", "products", "customers", "warehouses", "inventory", "warehouse", "retail-pos", "customer-orders", "customer-billing", "returns", "goods-receipts", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications",
  ],
  service_erp: [
    "dashboard", "users", "roles", "customers", "products", "inventory", "warehouse", "service", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications",
  ],
  custom_erp: [
    ...COMMON_COMPANY_MODULES,
    "territory", "regions", "zones", "areas", "fields",
    "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns",
    "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts",
    "retail-pos", "manufacturing", "service", "trading", "operations", "fleet", "dispatches", "deliveries", "live-tracking",
  ],
};

export function normalizeRoleKey(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
export function normalizeModuleKey(value = "") {
  return String(value || "").trim().toLowerCase().replace(/_/g, "-");
}
export function normalizeErpType(value = "") {
  const key = String(value || "").trim().toLowerCase().replace(/-/g, "_") || "distribution_erp";
  return ERP_MODULE_SETS[key] ? key : "distribution_erp";
}
function uniq(list = []) { return Array.from(new Set((list || []).filter(Boolean))); }
function rawRoleFromUser(user = {}) {
  if (!user || typeof user !== "object") return user || "";
  const portalType = normalizeRoleKey(user.portalType || "");
  const roleKey = normalizeRoleKey(user.roleKey || "");
  if (["system admin", "super admin", "system admin"].includes(portalType) || ["super admin", "system admin"].includes(roleKey)) return "system admin";
  if (portalType === "company admin" || roleKey === "company admin") return "company admin";
  return user.roleName || user.role || user.type || user.portalType || "";
}

const role = (label, scope, homePath, moduleKeys, options = {}) => ({ label, scope, homePath, moduleKeys, ...options });

export const ROLE_ALIASES = {
  admin: "system admin",
  "super admin": "system admin",
  system_admin: "system admin",
  super_admin: "system admin",
  company_admin: "company admin",
  warehouse_manager: "warehouse manager",
  finance_user: "finance manager",
  "finance / accounts": "finance manager",
  "account officer": "accountant",
  delivery: "driver / delivery",
  driver: "driver / delivery",
  "delivery boy": "driver / delivery",
  orderbooker: "order booker",
  store_manager: "store manager",
  production_manager: "production manager",
  production_supervisor: "production supervisor",
  quality_manager: "quality manager",
  service_manager: "service manager",
  service_agent: "service agent",
  trading_manager: "trading manager",
  import_officer: "import officer",
  export_officer: "export officer",
};

export const ROLE_ACCESS_MATRIX = {
  "system admin": role("System Admin", "system", "/portals/system-admin", SYSTEM_MODULE_KEYS),
  "company admin": role("Company Admin", "company", "/portals", ["*"], { companyAdmin: true }),
  ceo: role("CEO", "company", "/portals", ["dashboard", "reports", "finance", "inventory", "primary-sales-orders", "secondary-sales-orders", "retail-pos", "manufacturing", "service", "trading", "settings"]),
  "purchase manager": role("Purchase Manager", "company", "/portals/procurement", ["dashboard", "suppliers", "products", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "reports", "settings", "notifications"]),
  "finance manager": role("Finance Manager", "company", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "expenses", "loans", "reports", "settings", "notifications"]),
  accountant: role("Accountant", "company", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications"]),
  "sales manager": role("Sales Manager", "company", "/portals/sales/primary-orders", ["dashboard", "products", "customers", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "reports", "settings", "notifications"]),
  "warehouse manager": role("Warehouse Manager", "warehouse", "/portals/warehouse", ["dashboard", "warehouse", "warehouses", "inventory", "goods-receipts", "dispatches", "returns", "manufacturing", "reports", "settings", "notifications"]),
  "dispatch / logistics": role("Dispatch / Logistics", "company", "/portals/operations", ["dashboard", "operations", "fleet", "dispatches", "deliveries", "live-tracking", "warehouse", "inventory", "reports", "settings", "notifications"]),
  "brand manager": role("Brand Manager", "company", "/portals/sales/primary-orders", ["dashboard", "products", "customers", "sales-quotations", "primary-sales-orders", "retail-pos", "returns", "reports", "settings", "notifications"]),
  distributor: role("Distributor", "distributor", "/portals/sales/secondary-orders", ["dashboard", "users", "customers", "secondary-sales-orders", "customer-orders", "customer-billing", "inventory", "goods-receipts", "receipts", "payments", "finance", "returns", "reports", "settings", "notifications", "live-tracking"]),
  "distributor accountant": role("Distributor Accountant", "distributor", "/portals/finance", ["dashboard", "finance", "receipts", "payments", "customer-billing", "reports", "settings"]),
  "distributor store manager": role("Distributor Store Manager", "distributor", "/portals/inventory", ["dashboard", "inventory", "goods-receipts", "returns", "reports", "settings"]),
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

export function resolveRoleKey(roleOrUser = "") {
  const raw = typeof roleOrUser === "object" ? rawRoleFromUser(roleOrUser) : roleOrUser;
  const normalized = normalizeRoleKey(raw);
  return ROLE_ALIASES[normalized] || normalized || "company admin";
}

export function getRolePortalProfile(roleOrUser = "") {
  const roleKey = resolveRoleKey(roleOrUser);
  const base = ROLE_ACCESS_MATRIX[roleKey] || ROLE_ACCESS_MATRIX[normalizeRoleKey(roleKey)] || ROLE_ACCESS_MATRIX["company admin"];
  const erpTemplateKey = normalizeErpType(typeof roleOrUser === "object" ? (roleOrUser.erpTemplateKey || roleOrUser.businessType) : "distribution_erp");
  const erpModules = ERP_MODULE_SETS[erpTemplateKey] || ERP_MODULE_SETS.distribution_erp;
  const expanded = base.moduleKeys.includes("*") ? erpModules : base.moduleKeys;
  const moduleKeys = base.scope === "system" ? uniq(expanded) : uniq(expanded).filter((key) => key === "dashboard" || erpModules.includes(key));
  return { key: roleKey, erpTemplateKey, ...base, moduleKeys };
}

function normalizeVisibleModuleKeys(visibleModules = []) {
  if (!Array.isArray(visibleModules) || !visibleModules.length) return [];
  return visibleModules.map((item) => normalizeModuleKey(typeof item === "string" ? item : item?.key)).filter(Boolean);
}

export function getCompanyPlan(user = {}) {
  return user?.subscription || user?.companySubscription || user?.activePlan || user?.plan || {};
}

export function getPlanAllowedModules(user = {}, visibleModules = []) {
  const plan = getCompanyPlan(user);
  const fromPlan = Array.isArray(plan.allowedModules) ? plan.allowedModules : [];
  const fromUser = Array.isArray(user.enabledModules) ? user.enabledModules : [];
  const fromVisible = normalizeVisibleModuleKeys(visibleModules);
  return uniq([...fromPlan, ...fromUser, ...fromVisible].map(normalizeModuleKey));
}

export function buildAllowedModuleKeys(user = {}, visibleModules = []) {
  const profile = getRolePortalProfile(user || {});
  const roleKeys = profile.moduleKeys || [];
  const planKeys = getPlanAllowedModules(user, visibleModules);
  const restrictByPlan = profile.scope !== "system" && planKeys.length > 0;
  const allowed = restrictByPlan ? roleKeys.filter((key) => key === "dashboard" || key === "settings" || planKeys.includes(key)) : roleKeys;
  return uniq(allowed);
}

export function buildSidebarModules(user = {}, visibleModules = [], catalog = RAWYAN_MODULE_CATALOG) {
  const allowedKeys = new Set(buildAllowedModuleKeys(user, visibleModules));
  return (catalog || [])
    .filter((module) => module?.menu !== false && allowedKeys.has(module.key))
    .map((module) => ({ ...module, path: module.canonicalPath || module.path || "/portals" }))
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}

export function getDefaultPathForUser(user = {}) {
  const profile = getRolePortalProfile(user || {});
  const menu = buildSidebarModules(user, user?.visibleModules || []);
  const desired = profile.homePath || "/portals";
  if (menu.some((item) => item.path === desired || item.canonicalPath === desired)) return desired;
  const targetKey = MODULE_BY_KEY[profile.moduleKeys?.[0]] ? profile.moduleKeys[0] : "dashboard";
  return MODULE_BY_KEY[targetKey]?.path || menu[0]?.path || "/portals";
}

export function isModuleAllowedForUser(user = {}, moduleKey = "", visibleModules = []) {
  return buildAllowedModuleKeys(user, visibleModules).includes(normalizeModuleKey(moduleKey));
}

export function isPathAllowedForUser(user = {}, route = {}, visibleModules = []) {
  const key = route?.moduleKey || route?.module?.key;
  return Boolean(key && isModuleAllowedForUser(user, key, visibleModules));
}

export function getRoleOptionsForErp(erpTemplateKey = "distribution_erp", includeSystem = false) {
  const erp = normalizeErpType(erpTemplateKey);
  return Object.entries(ROLE_ACCESS_MATRIX)
    .filter(([key, profile]) => includeSystem ? true : profile.scope !== "system")
    .filter(([, profile]) => profile.scope === "system" || profile.moduleKeys.includes("*") || profile.moduleKeys.some((moduleKey) => (ERP_MODULE_SETS[erp] || []).includes(moduleKey)))
    .map(([key, profile]) => ({ key, label: profile.label, scope: profile.scope, homePath: profile.homePath }));
}

export default ROLE_ACCESS_MATRIX;
