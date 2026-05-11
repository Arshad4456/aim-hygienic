import { useMemo } from "react";
import { hasMobilePermission } from "../../../config/permissionActions";
export default function useMobilePermissions(user) {
  const permissions = user?.permissions || {};
  const mobileModules = user?.mobileModules || [];
  return useMemo(() => ({
    permissions,
    mobileModules,
    can: (moduleKey, action = "view") => hasMobilePermission(permissions, moduleKey, action),
    canOpenMobileModule: (moduleKey) => !mobileModules.length || mobileModules.includes(moduleKey),
  }), [permissions, mobileModules]);
}
