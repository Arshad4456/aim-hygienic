"use client";
import { useMemo } from "react";
import { RAWYAN_MODULE_CATALOG } from "../config/moduleCatalog";
import { buildMenuFromPermissions, RAWYAN_DEFAULT_MENU } from "../config/menus";

const LEGACY_KEY_MAP = {
  core: "dashboard",
  erp_templates: "erp-templates",
  sales: "primary-sales-orders",
  distribution: "secondary-sales-orders",
  logistics: "operations",
  live_tracking: "live-tracking",
  messages: "notifications",
};

function normalizeModule(module) {
  if (!module) return null;
  const rawKey = String(module.key || "").replace(/_/g, "-");
  const key = LEGACY_KEY_MAP[rawKey] || rawKey;
  const catalogItem = RAWYAN_MODULE_CATALOG.find((item) => item.key === key || item.key === module.key);
  return {
    key: catalogItem?.key || key,
    name: catalogItem?.name || module.name,
    category: catalogItem?.category || module.category || "Core",
    path: catalogItem?.path || module.path || module.canonicalPath || "/portals",
    canonicalPath: catalogItem?.canonicalPath || catalogItem?.path || module.canonicalPath || module.path || "/portals",
    description: catalogItem?.description || module.description || "",
    order: catalogItem?.order || module.order || 999,
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
    return (menu?.length ? menu : RAWYAN_DEFAULT_MENU).map((item) => ({ ...item, path: item.canonicalPath || item.path || "/portals" }));
  }, [user, visibleModules]);
}

export default useSidebar;
