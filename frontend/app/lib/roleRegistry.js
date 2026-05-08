export function normalizeRoleKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, " ");
}


function rawRoleFromUser(value = "") {
  if (!value || typeof value !== "object") return value;
  const portalType = normalizeRoleKey(value.portalType || "");
  const roleKey = normalizeRoleKey(value.roleKey || "");
  if (["system admin", "super admin"].includes(portalType) || ["super admin", "system admin"].includes(roleKey)) return "system admin";
  if (portalType === "company admin" || roleKey === "company admin") return "company admin";
  return value.roleName || value.role || value.type || value.portalType || "";
}

export const ROLE_REGISTRY = {
  "system admin": {
    label: "System Admin",
    dashboardPath: "/portals/system-admin",
    scope: "system",
    aliases: ["admin", "super admin", "system_admin", "super_admin"],
  },
  "company admin": {
    label: "Company Admin",
    dashboardPath: "/portals",
    scope: "company",
    aliases: ["company_admin"],
  },
  "purchase manager": {
    label: "Purchase Manager",
    dashboardPath: "/portals/procurement",
    scope: "company",
    aliases: [],
  },
  "brand manager": {
    label: "Brand Manager",
    dashboardPath: "/portals/sales/primary-orders",
    scope: "company",
    aliases: [],
  },
  "warehouse manager": {
    label: "Warehouse Manager",
    dashboardPath: "/portals/warehouse",
    scope: "company",
    aliases: [],
  },
  "finance / accounts": {
    label: "Finance / Accounts",
    dashboardPath: "/portals/finance",
    scope: "company",
    aliases: ["finance manager", "account officer", "accountant", "auditor", "finance user"],
  },
  "dispatch / logistics": {
    label: "Dispatch / Logistics",
    dashboardPath: "/portals/operations",
    scope: "company",
    aliases: ["logistics", "dispatch"],
  },
  supplier: {
    label: "Supplier",
    dashboardPath: "/portals/procurement/purchase-orders",
    scope: "company",
    aliases: [],
  },
  distributor: {
    label: "Distributor",
    dashboardPath: "/portals/sales/secondary-orders",
    scope: "distributor",
    aliases: [],
  },
  "distributor accountant": {
    label: "Distributor Accountant",
    dashboardPath: "/portals/finance",
    scope: "distributor",
    aliases: ["distributor finance", "accountant"],
  },
  "distributor store manager": {
    label: "Distributor Store Manager",
    dashboardPath: "/portals/inventory",
    scope: "distributor",
    aliases: ["distributor storekeeper", "store manager"],
  },
  salesman: {
    label: "Salesman",
    dashboardPath: "/portals/sales/secondary-orders",
    scope: "distributor",
    aliases: [],
  },
  "order booker": {
    label: "Order Booker",
    dashboardPath: "/portals/sales/secondary-orders",
    scope: "distributor",
    aliases: ["orderbooker"],
  },
  "driver / delivery": {
    label: "Driver / Delivery",
    dashboardPath: "/portals/deliveries",
    scope: "distributor",
    aliases: ["delivery boy", "driver", "delivery"],
  },
  customer: {
    label: "Customer",
    dashboardPath: "/portals/customer/billing",
    scope: "distributor",
    aliases: [],
  },
};

export const FINAL_ROLE_OPTIONS = Object.values(ROLE_REGISTRY).map((item) => item.label);

export function resolveRoleDefinition(value = "") {
  const normalized = normalizeRoleKey(rawRoleFromUser(value));
  const direct = ROLE_REGISTRY[normalized];
  if (direct) return { key: normalized, ...direct };

  for (const [key, definition] of Object.entries(ROLE_REGISTRY)) {
    if ((definition.aliases || []).some((alias) => normalizeRoleKey(alias) === normalized)) {
      return { key, ...definition };
    }
  }

  return {
    key: normalized,
    label: String(value || "User").trim() || "User",
    dashboardPath: "/portals",
    scope: "general",
    aliases: [],
  };
}

export function getDashboardPathForUser(value = "") {
  return resolveRoleDefinition(value).dashboardPath || "/portals";
}

export function isSystemRole(value = "") {
  return resolveRoleDefinition(value).scope === "system";
}

export function isCompanyRole(value = "") {
  return resolveRoleDefinition(value).scope === "company";
}

export function isDistributorRole(value = "") {
  return resolveRoleDefinition(value).scope === "distributor";
}
