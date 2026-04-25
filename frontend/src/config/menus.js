import { ERP_MODULES } from "./modules";
export function buildMenuFromPermissions(permissions = {}) {
  return ERP_MODULES.filter((module) => {
    const allowed = permissions[module.key] || permissions[module.key?.replace(/_/g, "-")] || [];
    return Array.isArray(allowed) ? allowed.includes("view") : Boolean(allowed);
  });
}
export const RAWYAN_DEFAULT_MENU = ERP_MODULES;
export default RAWYAN_DEFAULT_MENU;
