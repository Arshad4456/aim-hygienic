"use client";
import { useMemo } from "react";
import { RAWYAN_MODULE_CATALOG } from "../config/moduleCatalog";
import { buildMenuFromPermissions, RAWYAN_DEFAULT_MENU } from "../config/menus";
export function useSidebar(user, visibleModules = []) { return useMemo(() => { const permissions = user?.permissions || user?.rolePermissions; const modules = visibleModules?.length ? visibleModules : RAWYAN_MODULE_CATALOG; if (!permissions) return RAWYAN_DEFAULT_MENU; return buildMenuFromPermissions(permissions, modules); }, [user, visibleModules]); }
export default useSidebar;
