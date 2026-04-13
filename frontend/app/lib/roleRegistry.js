export function normalizeRoleKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, " ");
}

export const ROLE_REGISTRY = {
  "system admin": {
    label: "System Admin",
    dashboardPath: "/dashboards/admin",
    scope: "system",
    aliases: ["admin"],
  },
  "company admin": {
    label: "Company Admin",
    dashboardPath: "/dashboards/admin",
    scope: "company",
    aliases: [],
  },
  "purchase manager": {
    label: "Purchase Manager",
    dashboardPath: "/dashboards/admin/procurement",
    scope: "company",
    aliases: ["brand manager"],
  },
  "warehouse manager": {
    label: "Warehouse Manager",
    dashboardPath: "/dashboards/warehouseManager",
    scope: "company",
    aliases: [],
  },
  "finance / accounts": {
    label: "Finance / Accounts",
    dashboardPath: "/dashboards/admin/finance",
    scope: "company",
    aliases: ["account officer"],
  },
  "dispatch / logistics": {
    label: "Dispatch / Logistics",
    dashboardPath: "/dashboards/admin/logistics",
    scope: "company",
    aliases: ["logistics", "dispatch"],
  },
  supplier: {
    label: "Supplier",
    dashboardPath: "/dashboards/supplier",
    scope: "company",
    aliases: [],
  },
  distributor: {
    label: "Distributor",
    dashboardPath: "/dashboards/distributor",
    scope: "distributor",
    aliases: [],
  },
  "distributor accountant": {
    label: "Distributor Accountant",
    dashboardPath: "/dashboards/distributor/payments",
    scope: "distributor",
    aliases: [],
  },
  "distributor store manager": {
    label: "Distributor Store Manager",
    dashboardPath: "/dashboards/distributor/orders",
    scope: "distributor",
    aliases: [],
  },
  salesman: {
    label: "Salesman",
    dashboardPath: "/dashboards/salesman",
    scope: "distributor",
    aliases: [],
  },
  "order booker": {
    label: "Order Booker",
    dashboardPath: "/dashboards/orderBooker",
    scope: "distributor",
    aliases: ["orderbooker"],
  },
  "driver / delivery": {
    label: "Driver / Delivery",
    dashboardPath: "/dashboards/deliveryBoy",
    scope: "distributor",
    aliases: ["delivery boy", "driver", "delivery"],
  },
  customer: {
    label: "Customer",
    dashboardPath: "/dashboards/customer",
    scope: "distributor",
    aliases: [],
  },
};

export const FINAL_ROLE_OPTIONS = Object.values(ROLE_REGISTRY).map((item) => item.label);

export function resolveRoleDefinition(value = "") {
  const normalized = normalizeRoleKey(value);
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
    dashboardPath: "/dashboards/admin",
    scope: "general",
    aliases: [],
  };
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
