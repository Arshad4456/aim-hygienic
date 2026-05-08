const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "reject", "export", "print", "assign", "track"];
const ADMIN_ROLES = new Set(["admin", "system admin", "super admin", "company admin"]);

const DEFAULT_ROLE_PERMISSIONS = {
  admin: { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "system admin": { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "super admin": { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "company admin": { "*": { actions: PERMISSION_ACTIONS, scope: "company" } },
  ceo: {
    dashboard: { actions: ["view"], scope: "company" }, reports: { actions: ["view", "export", "print"], scope: "company" }, finance: { actions: ["view", "export"], scope: "company" },
    inventory: { actions: ["view", "export"], scope: "company" }, sales: { actions: ["view", "export"], scope: "company" }, "live-tracking": { actions: ["view", "track"], scope: "company" }, notifications: { actions: ["view", "create"], scope: "company" }
  },

  "purchase manager": { dashboard: { actions: ["view"], scope: "company" }, procurement: { actions: ["view", "create", "edit", "approve", "print"], scope: "company" }, "purchase-requests": { actions: ["view", "create", "edit", "approve", "print"], scope: "company" }, "purchase-orders": { actions: ["view", "create", "edit", "approve", "print"], scope: "company" }, "goods-receipts": { actions: ["view", "create", "edit", "approve", "print"], scope: "company" }, "supplier-payments": { actions: ["view", "create", "approve", "print"], scope: "company" }, reports: { actions: ["view", "export"], scope: "company" }, notifications: { actions: ["view", "create"], scope: "company" } },
  "finance manager": { dashboard: { actions: ["view"], scope: "company" }, finance: { actions: ["view", "create", "edit", "approve", "export", "print"], scope: "company" }, receipts: { actions: ["view", "create", "edit", "print"], scope: "company" }, payments: { actions: ["view", "create", "edit", "approve", "print"], scope: "company" }, reports: { actions: ["view", "export"], scope: "company" }, notifications: { actions: ["view", "create"], scope: "company" } },
  accountant: { dashboard: { actions: ["view"], scope: "company" }, finance: { actions: ["view", "create", "edit", "print"], scope: "company" }, receipts: { actions: ["view", "create", "print"], scope: "company" }, payments: { actions: ["view", "create", "print"], scope: "company" } },
  distributor: { dashboard: { actions: ["view"], scope: "own" }, "sales-quotations": { actions: ["view", "create", "print"], scope: "own" }, "primary-sales-orders": { actions: ["view", "create", "print"], scope: "own" }, "secondary-sales-orders": { actions: ["view", "create", "edit", "print"], scope: "own" }, inventory: { actions: ["view"], scope: "own" }, customers: { actions: ["view", "create", "edit"], scope: "own" }, receipts: { actions: ["view", "create", "print"], scope: "own" }, reports: { actions: ["view", "export"], scope: "own" }, "live-tracking": { actions: ["view", "track"], scope: "own" }, notifications: { actions: ["view"], scope: "own" } },
  salesman: { dashboard: { actions: ["view"], scope: "own" }, customers: { actions: ["view", "create", "edit"], scope: "own" }, "secondary-sales-orders": { actions: ["view", "create"], scope: "own" }, receipts: { actions: ["view", "create", "print"], scope: "own" }, deliveries: { actions: ["view"], scope: "own" }, "live-tracking": { actions: ["track"], scope: "own" }, notifications: { actions: ["view"], scope: "own" } },
  "order booker": { dashboard: { actions: ["view"], scope: "own" }, customers: { actions: ["view", "create", "edit"], scope: "own" }, "secondary-sales-orders": { actions: ["view", "create"], scope: "own" }, receipts: { actions: ["view", "create"], scope: "own" }, "live-tracking": { actions: ["track"], scope: "own" }, notifications: { actions: ["view"], scope: "own" } },
  "warehouse manager": { dashboard: { actions: ["view"], scope: "warehouse" }, warehouse: { actions: ["view", "create", "edit", "approve", "print"], scope: "warehouse" }, inventory: { actions: ["view", "create", "edit", "approve", "export"], scope: "warehouse" }, dispatches: { actions: ["view", "create", "edit", "approve", "print"], scope: "warehouse" }, "goods-receipts": { actions: ["view", "create", "edit", "approve", "print"], scope: "warehouse" }, notifications: { actions: ["view"], scope: "warehouse" } },
  "delivery boy": { dashboard: { actions: ["view"], scope: "own" }, deliveries: { actions: ["view", "edit", "print"], scope: "own" }, dispatches: { actions: ["view"], scope: "own" }, "live-tracking": { actions: ["track"], scope: "own" }, notifications: { actions: ["view"], scope: "own" } },
  customer: { dashboard: { actions: ["view"], scope: "own" }, "customer-orders": { actions: ["view", "create", "print"], scope: "own" }, receipts: { actions: ["view", "print"], scope: "own" }, returns: { actions: ["view", "create"], scope: "own" }, notifications: { actions: ["view"], scope: "own" } },
  supplier: { dashboard: { actions: ["view"], scope: "own" }, procurement: { actions: ["view", "create", "print"], scope: "own" }, "purchase-orders": { actions: ["view", "print"], scope: "own" }, messages: { actions: ["view", "create"], scope: "own" }, notifications: { actions: ["view", "create"], scope: "own" } },
  "brand manager": { dashboard: { actions: ["view"], scope: "company" }, "sales-quotations": { actions: ["view", "create", "approve", "print"], scope: "company" }, "primary-sales-orders": { actions: ["view", "create", "print"], scope: "company" }, returns: { actions: ["view", "create"], scope: "company" }, messages: { actions: ["view", "create"], scope: "company" }, notifications: { actions: ["view", "create"], scope: "company" } }
};

const DEFAULT_ROLE_BLUEPRINTS = [
  { name: "Super Admin", key: "super_admin", portalType: "system_admin", scope: "all", permissions: DEFAULT_ROLE_PERMISSIONS["super admin"], landingPath: "/portals", isSystemRole: true },
  { name: "Company Admin", key: "company_admin", portalType: "company_admin", scope: "company", permissions: DEFAULT_ROLE_PERMISSIONS["company admin"], landingPath: "/portals", isSystemRole: true },
  { name: "CEO", key: "ceo", portalType: "ceo", scope: "company", permissions: DEFAULT_ROLE_PERMISSIONS.ceo, landingPath: "/portals", isSystemRole: true },

  { name: "Purchase Manager", key: "purchase_manager", portalType: "purchase_manager", scope: "company", permissions: DEFAULT_ROLE_PERMISSIONS["purchase manager"], landingPath: "/portals/procurement", isSystemRole: true },
  { name: "Finance Manager", key: "finance_manager", portalType: "finance_manager", scope: "company", permissions: DEFAULT_ROLE_PERMISSIONS["finance manager"], landingPath: "/portals/finance", isSystemRole: true },
  { name: "Accountant", key: "accountant", portalType: "accountant", scope: "company", permissions: DEFAULT_ROLE_PERMISSIONS.accountant, landingPath: "/portals/finance", isSystemRole: true },
  { name: "Distributor", key: "distributor", portalType: "distributor", scope: "own", permissions: DEFAULT_ROLE_PERMISSIONS.distributor, landingPath: "/portals", mobileAccess: true, isSystemRole: true },
  { name: "Salesman", key: "salesman", portalType: "salesman", scope: "own", permissions: DEFAULT_ROLE_PERMISSIONS.salesman, landingPath: "/portals", mobileAccess: true, isSystemRole: true },
  { name: "Order Booker", key: "order_booker", portalType: "order_booker", scope: "own", permissions: DEFAULT_ROLE_PERMISSIONS["order booker"], landingPath: "/portals", mobileAccess: true, isSystemRole: true },
  { name: "Warehouse Manager", key: "warehouse_manager", portalType: "warehouse_manager", scope: "warehouse", permissions: DEFAULT_ROLE_PERMISSIONS["warehouse manager"], landingPath: "/portals/warehouse", mobileAccess: true, isSystemRole: true },
  { name: "Delivery Boy", key: "delivery_boy", portalType: "delivery_boy", scope: "own", permissions: DEFAULT_ROLE_PERMISSIONS["delivery boy"], landingPath: "/portals/deliveries", mobileAccess: true, isSystemRole: true },
  { name: "Customer", key: "customer", portalType: "customer", scope: "own", permissions: DEFAULT_ROLE_PERMISSIONS.customer, landingPath: "/portals/customers", isSystemRole: true },
  { name: "Supplier", key: "supplier", portalType: "supplier", scope: "own", permissions: DEFAULT_ROLE_PERMISSIONS.supplier, landingPath: "/portals/procurement", isSystemRole: true },
  { name: "Brand Manager", key: "brand_manager", portalType: "brand_manager", scope: "company", permissions: DEFAULT_ROLE_PERMISSIONS["brand manager"], landingPath: "/portals/sales/primary-orders", isSystemRole: true }
];

module.exports = { PERMISSION_ACTIONS, ADMIN_ROLES, DEFAULT_ROLE_PERMISSIONS, DEFAULT_ROLE_BLUEPRINTS };
