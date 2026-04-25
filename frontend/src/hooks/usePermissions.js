"use client";
import { useMemo } from "react";
import { hasPermission } from "../config/permissions";
export function usePermissions(user) {
  const permissions = user?.permissions || user?.rolePermissions || {};
  return useMemo(() => ({ permissions, can: (moduleKey, action = "view") => hasPermission(permissions, moduleKey, action) }), [permissions]);
}
export default usePermissions;
