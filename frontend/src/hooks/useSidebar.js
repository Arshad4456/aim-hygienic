"use client";
import { useMemo } from "react";
import { buildMenuFromPermissions, RAWYAN_DEFAULT_MENU } from "../config/menus";
export function useSidebar(user) {
  return useMemo(() => { const permissions = user?.permissions || user?.rolePermissions; if (!permissions) return RAWYAN_DEFAULT_MENU; return buildMenuFromPermissions(permissions); }, [user]);
}
export default useSidebar;
