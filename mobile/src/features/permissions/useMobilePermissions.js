import { useMemo } from "react";
import { hasMobilePermission } from "../../config/permissionActions";
export default function useMobilePermissions(user) { const permissions = user?.permissions || {}; return useMemo(() => ({ permissions, can: (moduleKey, action = "view") => hasMobilePermission(permissions, moduleKey, action) }), [permissions]); }
