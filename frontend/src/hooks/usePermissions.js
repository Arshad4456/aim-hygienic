"use client";
import { useMemo } from "react";
import { hasPermission, getPermissionScope } from "../lib/permissions";
export function usePermissions(user) { const permissions = user?.permissions || user?.rolePermissions || {}; return useMemo(() => ({ permissions, can: (moduleKey, action = "view") => hasPermission(permissions, moduleKey, action), scope: (moduleKey) => getPermissionScope(permissions, moduleKey) }), [permissions]); }
export default usePermissions;
