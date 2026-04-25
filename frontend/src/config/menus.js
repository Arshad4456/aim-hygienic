import { RAWYAN_MODULE_CATALOG } from "./moduleCatalog";
import { hasPermission } from "../lib/permissions";
export const RAWYAN_DEFAULT_MENU = RAWYAN_MODULE_CATALOG.filter((m) => ["dashboard", "roles", "users", "inventory", "warehouse", "secondary-orders", "live-tracking", "reports", "settings"].includes(m.key));
export function buildMenuFromPermissions(permissions = {}, modules = RAWYAN_MODULE_CATALOG) { if (permissions?.["*"]) return modules; return modules.filter((item) => hasPermission(permissions, item.key, "view")); }
