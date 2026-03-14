import { MODULE_CATALOG, getModuleMeta } from "./moduleCatalog";
import { normalizeRoleCode, getRoleMeta } from "./roleCatalog";

const ROLE_MODULES = {
  super_admin: [],
  admin: Object.keys(MODULE_CATALOG),
  ceo: [],
  managing_director: [],
  warehouse_manager: ["territory_assets", "order_management", "payment_management"],
  account_officer: ["finance_accounts", "payment_management", "expense_management"],
  hr_assistant: ["hr_role_management"],
  cashier: ["finance_accounts", "payment_management"],
  kpo: [],
  brand_manager: ["order_management"],
  national_sale_manager: [],
  regional_sale_manager: [],
  zone_sale_manager: [],
  territory_sale_manager: [],
  distributor: ["order_management", "payment_management", "expense_management", "finance_accounts"],
  field_sale_manager: [],
  order_booker: ["order_management", "finance_accounts"],
  salesman: ["order_management", "vehicle_management"],
  delivery_boy: ["order_management"],
  customer: ["order_management", "finance_accounts"],
};

const ROLE_HOME = {
  super_admin: "/dashboards/superadmin",
  admin: "/dashboards/admin",
};

const LEGACY_ALIASES = {
  manageDirector: "managing_director",
  warehouseManager: "warehouse_manager",
  accountOfficer: "account_officer",
  hrAssistant: "hr_assistant",
  brandManager: "brand_manager",
  nationalSM: "national_sale_manager",
  regionalSM: "regional_sale_manager",
  zoneSM: "zone_sale_manager",
  territorySM: "territory_sale_manager",
  fieldSM: "field_sale_manager",
  orderBooker: "order_booker",
  deliveryBoy: "delivery_boy",
};

function buildRuntimeModuleLink(moduleCode) {
  const meta = getModuleMeta(moduleCode);
  return { title: meta.label, href: `/runtime-dashboard/${moduleCode}`, moduleCode };
}

export function getRoleNavigationLinks(role) {
  const code = normalizeRoleCode(LEGACY_ALIASES[role] || role);
  const meta = getRoleMeta(code);
  const links = [];
  links.push({ title: "Dashboard", href: ROLE_HOME[code] || `/dashboards/${role}` });
  for (const moduleCode of ROLE_MODULES[code] || []) links.push(buildRuntimeModuleLink(moduleCode));
  if (!["admin", "super_admin"].includes(code)) {
    links.push({ title: "Runtime Dashboard", href: "/runtime-dashboard" });
  }
  return links;
}

export function getAdminNavigationLinks() {
  const platformLinks = [
    { title: "Dashboard", href: "/dashboards/admin" },
    { title: "Runtime Dashboard", href: "/runtime-dashboard" },
    { title: "Super Admin Home", href: "/dashboards/superadmin" },
    { title: "Runtime Preview", href: "/dashboards/superadmin/runtime-preview" },
    { title: "Companies", href: "/platform-admin/companies" },
    { title: "Setup Templates", href: "/platform-admin/setup-templates" },
    { title: "Plans & Subscriptions", href: "/platform-admin/plans" },
    { title: "Platform Analytics", href: "/platform-admin/analytics" },
    { title: "Audit Logs", href: "/platform-admin/audit-logs" },
  ];
  return [...platformLinks, ...Object.keys(MODULE_CATALOG).map(buildRuntimeModuleLink)];
}

export function getAllRoleNavigationMaps() {
  const map = {};
  for (const code of Object.keys(ROLE_MODULES)) map[code] = getRoleNavigationLinks(code);
  Object.entries(LEGACY_ALIASES).forEach(([legacy, canonical]) => { map[legacy] = getRoleNavigationLinks(canonical); });
  return map;
}
