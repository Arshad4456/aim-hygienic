"use client";
import { useMemo } from "react";
import { RAWYAN_MODULE_CATALOG, sortModules } from "../config/moduleCatalog";
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
    icon: catalogItem?.icon || module.icon || "•",
    path: catalogItem?.path || module.path || module.canonicalPath || "/portals",
    canonicalPath: catalogItem?.canonicalPath || catalogItem?.path || module.canonicalPath || module.path || "/portals",
    description: catalogItem?.description || module.description || "",
    order: catalogItem?.order || module.order || 999,
    menu: catalogItem?.menu ?? module.menu ?? true,
    isPlanned: catalogItem?.isPlanned || module.isPlanned || false,
  };
}

export function useSidebar(user, visibleModules = []) {
  return useMemo(() => {
    const permissions = user?.permissions || user?.rolePermissions;
    const modules = sortModules((visibleModules?.length ? visibleModules : RAWYAN_MODULE_CATALOG).map(normalizeModule).filter(Boolean));
    const menu = permissions ? buildMenuFromPermissions(permissions, modules) : RAWYAN_DEFAULT_MENU;
    return (menu?.length ? menu : RAWYAN_DEFAULT_MENU)
      .filter((item) => item.menu !== false)
      .map((item) => ({ ...item, path: item.canonicalPath || item.path || "/portals" }));
  }, [user, visibleModules]);
}

export default useSidebar;
