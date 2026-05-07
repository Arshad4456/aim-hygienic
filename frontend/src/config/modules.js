import { RAWYAN_MODULE_CATALOG, MODULE_BY_KEY } from "./moduleCatalog";

const LEGACY_MODULE_KEY_MAP = {
  core: "dashboard",
  erp_templates: "erp-templates",
  sales: "primary-sales-orders",
  distribution: "secondary-sales-orders",
  logistics: "operations",
  live_tracking: "live-tracking",
  messages: "notifications",
};

export const ERP_MODULES = RAWYAN_MODULE_CATALOG
  .filter((module) => module.menu !== false)
  .map((module) => ({
    key: module.key,
    name: module.name,
    path: module.path,
    category: module.category,
    description: module.description,
    icon: module.icon,
    webEnabled: true,
    mobileEnabled: ["warehouse", "primary-sales-orders", "secondary-sales-orders", "customers", "deliveries", "live-tracking", "notifications", "reports"].includes(module.key),
  }));

export function normalizeModuleKey(key = "") {
  const normalized = String(key || "").replace(/_/g, "-");
  return LEGACY_MODULE_KEY_MAP[normalized] || normalized;
}

export function getModuleByKey(key) {
  return MODULE_BY_KEY[normalizeModuleKey(key)] || ERP_MODULES.find((module) => module.key === key);
}

export default ERP_MODULES;
