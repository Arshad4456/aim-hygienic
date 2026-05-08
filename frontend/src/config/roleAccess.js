import { RAWYAN_MODULE_CATALOG } from "./moduleCatalog";

export function normalizeRoleKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const SYSTEM_ADMIN_KEYS = [
  "system-admin",
  "system-admin-companies",
  "system-admin-users",
  "subscription-plans",
  "module-controls",
  "erp-templates",
  "reports",
  "settings",
];

const COMPANY_ADMIN_KEYS = [
  "dashboard",
  "companies",
  "roles",
  "users",
  "products",
  "suppliers",
  "customers",
  "territory",
  "warehouses",
  "regions",
  "zones",
  "areas",
  "fields",
  "sales-quotations",
  "primary-sales-orders",
  "secondary-sales-orders",
  "customer-orders",
  "customer-billing",
  "returns",
  "procurement",
  "purchase-requests",
  "purchase-orders",
  "supplier-payments",
  "inventory",
  "warehouse",
  "goods-receipts",
  "finance",
  "receipts",
  "payments",
  "expenses",
  "loans",
  "operations",
  "fleet",
  "dispatches",
  "deliveries",
  "live-tracking",
  "notifications",
  "reports",
  "settings",
];

const ROLE_PROFILES = {
  "system admin": {
    label: "System Admin",
    scope: "system",
    homePath: "/portals/system-admin",
    moduleKeys: SYSTEM_ADMIN_KEYS,
  },
  admin: {
    label: "System Admin",
    scope: "system",
    homePath: "/portals/system-admin",
    moduleKeys: SYSTEM_ADMIN_KEYS,
  },
  "company admin": {
    label: "Company Admin",
    scope: "company",
    homePath: "/portals",
    moduleKeys: COMPANY_ADMIN_KEYS,
  },
  "purchase manager": {
    label: "Purchase Manager",
    scope: "company",
    homePath: "/portals/procurement",
    moduleKeys: ["dashboard", "suppliers", "products", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "reports", "settings"],
  },
  "finance / accounts": {
    label: "Finance / Accounts",
    scope: "company",
    homePath: "/portals/finance",
    moduleKeys: ["dashboard", "finance", "receipts", "payments", "expenses", "loans", "reports", "settings"],
  },
  "dispatch / logistics": {
    label: "Dispatch / Logistics",
    scope: "company",
    homePath: "/portals/operations",
    moduleKeys: ["dashboard", "operations", "fleet", "dispatches", "deliveries", "live-tracking", "warehouse", "inventory", "reports", "settings"],
  },
  "warehouse manager": {
    label: "Warehouse Manager",
    scope: "company",
    homePath: "/portals/warehouse",
    moduleKeys: ["dashboard", "warehouse", "warehouses", "inventory", "goods-receipts", "dispatches", "returns", "reports", "settings"],
  },
  "brand manager": {
    label: "Brand Manager",
    scope: "company",
    homePath: "/portals/sales/primary-orders",
    moduleKeys: ["dashboard", "products", "customers", "sales-quotations", "primary-sales-orders", "returns", "notifications", "reports", "settings"],
  },
  distributor: {
    label: "Distributor",
    scope: "distributor",
    homePath: "/portals/sales/secondary-orders",
    moduleKeys: ["dashboard", "users", "customers", "secondary-sales-orders", "customer-orders", "customer-billing", "inventory", "goods-receipts", "receipts", "payments", "finance", "returns", "notifications", "reports", "settings"],
  },
  "distributor accountant": {
    label: "Distributor Accountant",
    scope: "distributor",
    homePath: "/portals/finance",
    moduleKeys: ["dashboard", "finance", "receipts", "payments", "customer-billing", "reports", "settings"],
  },
  "distributor store manager": {
    label: "Distributor Store Manager",
    scope: "distributor",
    homePath: "/portals/inventory",
    moduleKeys: ["dashboard", "inventory", "goods-receipts", "returns", "reports", "settings"],
  },
  salesman: {
    label: "Salesman",
    scope: "field",
    homePath: "/portals/sales/secondary-orders",
    moduleKeys: ["dashboard", "secondary-sales-orders", "customers", "receipts", "deliveries", "live-tracking", "settings"],
  },
  "order booker": {
    label: "Order Booker",
    scope: "field",
    homePath: "/portals/sales/secondary-orders",
    moduleKeys: ["dashboard", "secondary-sales-orders", "customers", "receipts", "live-tracking", "settings"],
  },
  "driver / delivery": {
    label: "Driver / Delivery",
    scope: "field",
    homePath: "/portals/deliveries",
    moduleKeys: ["dashboard", "deliveries", "dispatches", "live-tracking", "customer-billing", "settings"],
  },
  supplier: {
    label: "Supplier",
    scope: "supplier",
    homePath: "/portals/procurement/purchase-orders",
    moduleKeys: ["dashboard", "procurement", "purchase-requests", "purchase-orders", "notifications", "settings"],
  },
  customer: {
    label: "Customer",
    scope: "customer",
    homePath: "/portals/customer/billing",
    moduleKeys: ["dashboard", "customer-orders", "customer-billing", "returns", "settings"],
  },
};

const ROLE_ALIASES = {
  "super admin": "system admin",
  "system_admin": "system admin",
  "super_admin": "system admin",
  "company_admin": "company admin",
  "delivery boy": "driver / delivery",
  driver: "driver / delivery",
  delivery: "driver / delivery",
  orderbooker: "order booker",
  logistics: "dispatch / logistics",
  dispatch: "dispatch / logistics",
  "finance manager": "finance / accounts",
  accountant: "finance / accounts",
  "account officer": "finance / accounts",
  "finance user": "finance / accounts",
  auditor: "finance / accounts",
};

function rawRoleFromUser(user = {}) {
  const portalType = normalizeRoleKey(user?.portalType || "");
  const roleKey = normalizeRoleKey(user?.roleKey || "");
  if (["system admin", "system_admin", "super admin", "super_admin"].includes(portalType) || ["super admin", "super_admin", "system admin", "system_admin"].includes(roleKey)) return "system admin";
  if (["company admin", "company_admin"].includes(portalType) || ["company admin", "company_admin"].includes(roleKey)) return "company admin";
  return user?.roleName || user?.role || user?.type || user?.portalType || "";
}

export function getRolePortalProfile(roleOrUser = "") {
  const raw = typeof roleOrUser === "object" ? rawRoleFromUser(roleOrUser) : roleOrUser;
  const normalized = normalizeRoleKey(raw);
  const alias = ROLE_ALIASES[normalized] || normalized;
  const profile = ROLE_PROFILES[alias] || ROLE_PROFILES[normalized] || ROLE_PROFILES["company admin"];
  return { key: alias || "company admin", ...profile, moduleKeys: [...new Set(profile.moduleKeys || [])] };
}

export function getDefaultPathForRole(roleOrUser = "") {
  return getRolePortalProfile(roleOrUser).homePath || "/portals";
}

export function isSystemPortalRole(roleOrUser = "") {
  return getRolePortalProfile(roleOrUser).scope === "system";
}

export function isModuleAllowedForRole(roleOrUser, moduleKey) {
  const key = String(moduleKey || "").trim();
  if (!key) return false;
  return getRolePortalProfile(roleOrUser).moduleKeys.includes(key);
}

export function filterModulesForRole(roleOrUser, modules = RAWYAN_MODULE_CATALOG) {
  const profile = getRolePortalProfile(roleOrUser);
  const allowed = new Set(profile.moduleKeys || []);
  return (modules || []).filter((module) => allowed.has(module.key));
}

export function isPathAllowedForRole(roleOrUser, route) {
  if (!route?.moduleKey) return false;
  return isModuleAllowedForRole(roleOrUser, route.moduleKey);
}

export function getSafeRouteForUser(user = {}) {
  return getDefaultPathForRole(user);
}

export default ROLE_PROFILES;
