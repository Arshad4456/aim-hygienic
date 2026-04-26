import { RAWYAN_MODULE_CATALOG } from "./moduleCatalog";
import { hasPermission } from "../lib/permissions";

const DEFAULT_KEYS = [
  "dashboard",
  "system-admin",
  "companies",
  "erp-templates",
  "roles",
  "users",
  "territory",
  "products",
  "procurement",
  "purchase-orders",
  "supplier-payments",
  "inventory",
  "warehouse",
  "primary-sales-orders",
  "secondary-sales-orders",
  "customers",
  "customer-billing",
  "finance",
  "expenses",
  "loans",
  "returns",
  "operations",
  "fleet",
  "deliveries",
  "live-tracking",
  "notifications",
  "reports",
  "settings",
];

export const RAWYAN_DEFAULT_MENU = RAWYAN_MODULE_CATALOG.filter((m) => DEFAULT_KEYS.includes(m.key));

export function buildMenuFromPermissions(permissions = {}, modules = RAWYAN_MODULE_CATALOG) {
  if (permissions?.["*"] || permissions?.superAdmin) return modules;
  const visible = modules.filter((item) => hasPermission(permissions, item.key, "view"));
  return visible.length ? visible : RAWYAN_DEFAULT_MENU;
}
