"use client";
import { useMemo } from "react";
import { RAWYAN_MODULE_CATALOG, sortModules } from "../config/moduleCatalog";
import { buildMenuFromPermissions } from "../config/menus";
import { filterModulesForRole, getRolePortalProfile } from "../config/roleAccess";

const LEGACY_KEY_MAP = {
  core: "dashboard",
  erp_templates: "erp-templates",
  sales: "primary-sales-orders",
  "primary-orders": "primary-sales-orders",
  "primary-sales-orders": "primary-sales-orders",
  distribution: "secondary-sales-orders",
  "secondary-orders": "secondary-sales-orders",
  "secondary-sales-orders": "secondary-sales-orders",
  logistics: "operations",
  live_tracking: "live-tracking",
  messages: "notifications",
  pos: "retail-pos",
  production: "manufacturing",
  quality: "manufacturing",
  service_erp: "service",
  tickets: "service",
  tasks: "service",
  projects: "service",
  trading_erp: "trading",
  import: "trading",
  export: "trading",
  shipments: "trading",
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

function intersectAllowed(roleModules = [], visibleModules = []) {
  if (!Array.isArray(visibleModules) || !visibleModules.length) return roleModules;
  const visible = new Set(visibleModules.map((module) => normalizeModule(module)?.key).filter(Boolean));
  return roleModules.filter((module) => visible.has(module.key) || module.key === "dashboard" || module.category === "SaaS Control");
}

export function useSidebar(user, visibleModules = []) {
  return useMemo(() => {
    const profile = getRolePortalProfile(user || {});
    const roleModules = sortModules(filterModulesForRole(profile.key, RAWYAN_MODULE_CATALOG).map(normalizeModule).filter(Boolean));
    const modules = intersectAllowed(roleModules, visibleModules);
    const permissions = user?.permissions || user?.rolePermissions;
    const menu = permissions ? buildMenuFromPermissions(permissions, modules) : modules;
    return (menu?.length ? menu : modules)
      .filter((item) => item.menu !== false)
      .map((item) => ({ ...item, path: item.canonicalPath || item.path || profile.homePath || "/portals" }));
  }, [user, visibleModules]);
}

export default useSidebar;
