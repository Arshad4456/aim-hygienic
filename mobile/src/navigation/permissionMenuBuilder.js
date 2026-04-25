import { MOBILE_MODULES } from "../config/mobileModuleCatalog";
import { hasMobilePermission } from "../config/permissionActions";
export function buildMobileMenu(user = {}, modules = MOBILE_MODULES) { const permissions = user.permissions || {}; if (permissions["*"]) return modules; const allowed = user.mobileModules?.length ? modules.filter((m) => user.mobileModules.includes(m.key)) : modules; return allowed.filter((m) => hasMobilePermission(permissions, m.key, "view") || hasMobilePermission(permissions, m.key, "track")); }
export default buildMobileMenu;
