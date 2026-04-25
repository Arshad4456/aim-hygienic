const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "reject", "export", "print", "assign", "track"];
const ADMIN_ROLES = new Set(["admin", "system admin", "super admin", "company admin"]);

const DEFAULT_ROLE_PERMISSIONS = {
  admin: { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "system admin": { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "super admin": { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "company admin": { "*": { actions: PERMISSION_ACTIONS, scope: "company" } },
  ceo: { dashboard: { actions: ["view"], scope: "company" }, reports: { actions: ["view", "export", "print"], scope: "company" }, finance: { actions: ["view", "export"], scope: "company" }, "live-tracking": { actions: ["view", "track"], scope: "company" } },
  distributor: { dashboard: { actions: ["view"], scope: "own" }, "primary-orders": { actions: ["view", "create", "print"], scope: "own" }, "secondary-orders": { actions: ["view", "create", "edit", "print"], scope: "own" }, inventory: { actions: ["view"], scope: "own" }, receipts: { actions: ["view", "create", "print"], scope: "own" }, reports: { actions: ["view", "export"], scope: "own" }, "live-tracking": { actions: ["view", "track"], scope: "own" } },
  salesman: { dashboard: { actions: ["view"], scope: "own" }, customers: { actions: ["view", "create", "edit"], scope: "own" }, "secondary-orders": { actions: ["view", "create"], scope: "own" }, receipts: { actions: ["view", "create", "print"], scope: "own" }, "live-tracking": { actions: ["track"], scope: "own" } },
  "order booker": { dashboard: { actions: ["view"], scope: "own" }, customers: { actions: ["view", "create", "edit"], scope: "own" }, "secondary-orders": { actions: ["view", "create"], scope: "own" }, receipts: { actions: ["view", "create"], scope: "own" }, "live-tracking": { actions: ["track"], scope: "own" } },
  "warehouse manager": { dashboard: { actions: ["view"], scope: "warehouse" }, warehouse: { actions: ["view", "create", "edit", "approve", "print"], scope: "warehouse" }, inventory: { actions: ["view", "create", "edit", "approve", "export"], scope: "warehouse" }, dispatches: { actions: ["view", "create", "edit", "approve", "print"], scope: "warehouse" } },
  "delivery boy": { dashboard: { actions: ["view"], scope: "own" }, deliveries: { actions: ["view", "edit", "print"], scope: "own" }, "live-tracking": { actions: ["track"], scope: "own" } },
  customer: { dashboard: { actions: ["view"], scope: "own" }, "customer-orders": { actions: ["view", "create", "print"], scope: "own" }, receipts: { actions: ["view", "print"], scope: "own" } },
  supplier: { dashboard: { actions: ["view"], scope: "own" }, procurement: { actions: ["view", "create", "print"], scope: "own" }, messages: { actions: ["view", "create"], scope: "own" } },
};

module.exports = { PERMISSION_ACTIONS, ADMIN_ROLES, DEFAULT_ROLE_PERMISSIONS };
