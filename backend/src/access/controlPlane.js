const CORE_ROLES = Object.freeze({
  SUPER_ADMIN: "superAdmin",
  SYSTEM_ADMIN: "systemAdmin",
  EXECUTIVE: "executive",
  SALES_MANAGER: "salesManager",
  SALES_OPS: "salesOps",
  WAREHOUSE_MANAGER: "warehouseManager",
  INVENTORY_CONTROLLER: "inventoryController",
  FINANCE_OFFICER: "financeOfficer",
  CASHIER: "cashier",
  HR_OFFICER: "hrOfficer",
  PROCUREMENT_MANAGER: "procurementManager",
  LOGISTICS_COORDINATOR: "logisticsCoordinator",
  QUALITY_MANAGER: "qualityManager",
  DISTRIBUTOR: "distributor",
  ORDER_BOOKER: "orderBooker",
  SALESMAN: "salesman",
  DELIVERY_EXECUTIVE: "deliveryExecutive",
  CUSTOMER_SUPPORT: "customerSupport",
  AUDITOR: "auditor",
});

const LEGACY_ROLE_MAP = Object.freeze({
  admin: CORE_ROLES.SYSTEM_ADMIN,
  ceo: CORE_ROLES.EXECUTIVE,
  "managing director": CORE_ROLES.EXECUTIVE,
  "national sale manager": CORE_ROLES.SALES_MANAGER,
  "regional sale manager": CORE_ROLES.SALES_MANAGER,
  "zone sale manager": CORE_ROLES.SALES_MANAGER,
  "territory sale manager": CORE_ROLES.SALES_MANAGER,
  "field sale manager": CORE_ROLES.SALES_MANAGER,
  "warehouse manager": CORE_ROLES.WAREHOUSE_MANAGER,
  "account officer": CORE_ROLES.FINANCE_OFFICER,
  cashier: CORE_ROLES.CASHIER,
  "hr assistant": CORE_ROLES.HR_OFFICER,
  distributor: CORE_ROLES.DISTRIBUTOR,
  "order booker": CORE_ROLES.ORDER_BOOKER,
  salesman: CORE_ROLES.SALESMAN,
  "delivery boy": CORE_ROLES.DELIVERY_EXECUTIVE,
  "brand manager": CORE_ROLES.SALES_OPS,
  kpo: CORE_ROLES.SALES_OPS,
});

const PERMISSIONS_BY_ROLE = Object.freeze({
  [CORE_ROLES.SUPER_ADMIN]: ["*"],
  [CORE_ROLES.SYSTEM_ADMIN]: ["*"],
  [CORE_ROLES.EXECUTIVE]: ["dashboard.view", "reports.view", "reports.export", "users.view"],
  [CORE_ROLES.SALES_MANAGER]: ["dashboard.view", "orders.view", "orders.create", "orders.edit", "reports.view"],
  [CORE_ROLES.SALES_OPS]: ["dashboard.view", "orders.view", "inventory.view", "reports.view", "reports.export"],
  [CORE_ROLES.WAREHOUSE_MANAGER]: ["dashboard.view", "inventory.view", "inventory.adjust", "orders.view", "orders.approve"],
  [CORE_ROLES.INVENTORY_CONTROLLER]: ["inventory.view", "inventory.adjust", "reports.view"],
  [CORE_ROLES.FINANCE_OFFICER]: ["payments.view", "payments.post", "receipts.view", "receipts.approve", "reports.view"],
  [CORE_ROLES.CASHIER]: ["payments.view", "payments.post", "receipts.view"],
  [CORE_ROLES.HR_OFFICER]: ["users.view", "users.manage"],
  [CORE_ROLES.LOGISTICS_COORDINATOR]: ["vehicles.view", "vehicles.assign", "liveTracking.view"],
  [CORE_ROLES.DISTRIBUTOR]: ["orders.view", "orders.create", "payments.view", "receipts.view"],
  [CORE_ROLES.ORDER_BOOKER]: ["orders.view", "orders.create"],
  [CORE_ROLES.SALESMAN]: ["orders.view", "orders.create"],
  [CORE_ROLES.DELIVERY_EXECUTIVE]: ["orders.view", "liveTracking.view"],
  [CORE_ROLES.CUSTOMER_SUPPORT]: ["orders.view", "users.view"],
  [CORE_ROLES.AUDITOR]: ["reports.view", "reports.export", "audit.view"],
});

function normalizeRoleCode(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return LEGACY_ROLE_MAP[normalized] || normalized || null;
}

function getPermissionsForRole(roleCode) {
  return PERMISSIONS_BY_ROLE[normalizeRoleCode(roleCode)] || [];
}

function hasPermission(roleCode, permission) {
  const permissions = getPermissionsForRole(roleCode);
  return permissions.includes("*") || permissions.includes(permission);
}

module.exports = {
  CORE_ROLES,
  LEGACY_ROLE_MAP,
  PERMISSIONS_BY_ROLE,
  normalizeRoleCode,
  getPermissionsForRole,
  hasPermission,
};
