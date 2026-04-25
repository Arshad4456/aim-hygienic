export function normalizeRoleKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, " ");
}

export const ROLE_REGISTRY = {
  "system admin": {
    label: "System Admin",
    dashboardPath: "/portals/admin",
    scope: "system",
    aliases: ["admin"],
  },
  "company admin": {
    label: "Company Admin",
    dashboardPath: "/portals/admin",
    scope: "company",
    aliases: [],
  },
  "purchase manager": {
    label: "Purchase Manager",
    dashboardPath: "/portals/admin/procurement",
    scope: "company",
    aliases: [],
  },
  "brand manager": {
    label: "Brand Manager",
    dashboardPath: "/portals/brandManager",
    scope: "company",
    aliases: [],
  },
  "warehouse manager": {
    label: "Warehouse Manager",
    dashboardPath: "/portals/warehouseManager",
    scope: "company",
    aliases: [],
  },
  "finance / accounts": {
    label: "Finance / Accounts",
    dashboardPath: "/portals/admin/finance",
    scope: "company",
    aliases: [],
  },
  "dispatch / logistics": {
    label: "Dispatch / Logistics",
    dashboardPath: "/portals/admin/logistics",
    scope: "company",
    aliases: ["logistics", "dispatch"],
  },
  supplier: {
    label: "Supplier",
    dashboardPath: "/portals/supplier",
    scope: "company",
    aliases: [],
  },
  distributor: {
    label: "Distributor",
    dashboardPath: "/portals/distributor",
    scope: "distributor",
    aliases: [],
  },
  "distributor accountant": {
    label: "Distributor Accountant",
    dashboardPath: "/portals/distributor/accounts",
    scope: "distributor",
    aliases: ["distributor finance", "accountant"],
  },
  "distributor store manager": {
    label: "Distributor Store Manager",
    dashboardPath: "/portals/distributor/inventory",
    scope: "distributor",
    aliases: ["distributor storekeeper", "store manager"],
  },
  salesman: {
    label: "Salesman",
    dashboardPath: "/portals/salesman",
    scope: "distributor",
    aliases: [],
  },
  "order booker": {
    label: "Order Booker",
    dashboardPath: "/portals/orderBooker",
    scope: "distributor",
    aliases: ["orderbooker"],
  },
  "driver / delivery": {
    label: "Driver / Delivery",
    dashboardPath: "/portals/deliveryBoy",
    scope: "distributor",
    aliases: ["delivery boy", "driver", "delivery"],
  },
  customer: {
    label: "Customer",
    dashboardPath: "/portals/customer",
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
    dashboardPath: "/portals/admin",
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
