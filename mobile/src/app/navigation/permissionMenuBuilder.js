import { MOBILE_MODULES } from "../config/mobileModuleCatalog";
import { hasMobilePermission } from "../config/permissionActions";
function normalizeList(value) { return Array.isArray(value) ? value : []; }
export function buildMobileMenu(user = {}, modules = MOBILE_MODULES) {
  const permissions = user.permissions || {};
  if (permissions["*"]) return modules;
  const allowedKeys = normalizeList(user.mobileModules);
  const mobileAllowed = allowedKeys.length ? modules.filter((m) => allowedKeys.includes(m.key)) : modules;
  return mobileAllowed.filter((m) => hasMobilePermission(permissions, m.key, "view") || hasMobilePermission(permissions, m.key, "create") || hasMobilePermission(permissions, m.key, "track"));
}
export default buildMobileMenu;
