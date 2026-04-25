import { RAWYAN_MODULE_CATALOG } from "./moduleCatalog";
import { hasPermission } from "../lib/permissions";

export const RAWYAN_DEFAULT_MENU = RAWYAN_MODULE_CATALOG.filter((m) => ["dashboard", "companies", "erp-templates", "roles", "users", "territory", "products", "procurement", "inventory", "warehouse", "primary-sales-orders", "secondary-sales-orders", "customers", "finance", "live-tracking", "reports", "settings"].includes(m.key));

export function buildMenuFromPermissions(permissions = {}, modules = RAWYAN_MODULE_CATALOG) {
  if (permissions?.["*"] || permissions?.superAdmin) return modules;
  const visible = modules.filter((item) => hasPermission(permissions, item.key, "view"));
  return visible.length ? visible : RAWYAN_DEFAULT_MENU;
}
