"use client";
import { useMemo } from "react";
import { RAWYAN_MODULE_CATALOG } from "../config/moduleCatalog";
import { buildMenuFromPermissions, RAWYAN_DEFAULT_MENU } from "../config/menus";
import { normalizeMenuForWorkingScreens } from "../config/workingPortalRoutes";

function normalizeModule(module) {
  if (!module) return null;
  return {
    key: module.key,
    name: module.name,
    category: module.category || "Core",
    path: module.path || module.canonicalPath || "/portals",
    canonicalPath: module.canonicalPath || module.path || "/portals",
    description: module.description || "",
    order: module.order || 999,
  };
}

export function useSidebar(user, visibleModules = []) {
  return useMemo(() => {
    const permissions = user?.permissions || user?.rolePermissions;
    const modules = (visibleModules?.length ? visibleModules : RAWYAN_MODULE_CATALOG)
      .map(normalizeModule)
      .filter(Boolean)
      .sort((a, b) => (a.order || 999) - (b.order || 999));

    const menu = permissions ? buildMenuFromPermissions(permissions, modules) : RAWYAN_DEFAULT_MENU;
    return normalizeMenuForWorkingScreens(menu?.length ? menu : RAWYAN_DEFAULT_MENU, user || {});
  }, [user, visibleModules]);
}

export default useSidebar;
