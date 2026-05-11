import { RAWYAN_MODULE_CATALOG, groupModulesByCategory, sortModules } from "./moduleCatalog";
import { hasPermission } from "@/src/app/lib/permissions";

const DEFAULT_KEYS = [
  "dashboard",
  "companies",
  "roles",
  "users",
  "products",
  "customers",
  "procurement",
  "inventory",
  "warehouse",
  "primary-sales-orders",
  "secondary-sales-orders",
  "finance",
  "retail-pos",
  "manufacturing",
  "service",
  "trading",
  "receipts",
  "payments",
  "reports",
  "settings",
];

export const RAWYAN_DEFAULT_MENU = sortModules(
  RAWYAN_MODULE_CATALOG.filter((module) => module.menu !== false && DEFAULT_KEYS.includes(module.key)),
);

function isModuleVisible(item, permissions = {}) {
  if (!item || item.menu === false) return false;
  if (permissions?.["*"] || permissions?.superAdmin) return true;
  return hasPermission(permissions, item.key, "view");
}

export function buildMenuFromPermissions(permissions = {}, modules = RAWYAN_MODULE_CATALOG) {
  const allowedModules = sortModules((modules || []).filter((item) => isModuleVisible(item, permissions)));
  return allowedModules.length ? allowedModules : RAWYAN_DEFAULT_MENU;
}

export function buildSidebarSections(menu = []) {
  return groupModulesByCategory((menu || []).filter((item) => item.menu !== false));
}

export function buildMobileMenu(menu = []) {
  const preferred = ["dashboard", "primary-sales-orders", "inventory", "finance", "reports"];
  const byKey = Object.fromEntries((menu || []).map((item) => [item.key, item]));
  const selected = preferred.map((key) => byKey[key]).filter(Boolean);
  if (selected.length >= 5) return selected.slice(0, 5);
  const remaining = (menu || []).filter((item) => !selected.find((s) => s.key === item.key));
  return [...selected, ...remaining].slice(0, 5);
}
