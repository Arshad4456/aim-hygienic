const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "reject", "export", "print", "assign", "track"];
const ADMIN_ROLES = new Set(["admin", "system admin", "super admin", "company admin"]);

const COMMON_COMPANY_MODULES = ["dashboard", "roles", "users", "products", "customers", "suppliers", "warehouses", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "reports", "settings", "notifications"];
const ERP_MODULE_SETS = {
  distribution_erp: [...COMMON_COMPANY_MODULES, "companies", "territory", "regions", "zones", "areas", "fields", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "operations", "fleet", "dispatches", "deliveries", "live-tracking"],
  trading_erp: [...COMMON_COMPANY_MODULES, "sales-quotations", "primary-sales-orders", "customer-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "trading"],
  manufacturing_erp: [...COMMON_COMPANY_MODULES, "sales-quotations", "primary-sales-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "manufacturing"],
  retail_pos_erp: [...COMMON_COMPANY_MODULES, "retail-pos", "customer-orders", "customer-billing", "returns", "goods-receipts"],
  service_erp: ["dashboard", "roles", "users", "customers", "products", "inventory", "finance", "receipts", "payments", "expenses", "service", "reports", "settings", "notifications"],
  custom_erp: [...COMMON_COMPANY_MODULES, "companies", "territory", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "procurement", "purchase-requests", "purchase-orders", "goods-receipts", "retail-pos", "manufacturing", "service", "trading", "operations", "fleet", "dispatches", "deliveries", "live-tracking"],
};

function uniq(list = []) { return Array.from(new Set((list || []).filter(Boolean))); }
function allow(modules = [], actions = PERMISSION_ACTIONS, scope = "company") { return Object.fromEntries(uniq(modules).map((key) => [key, { actions, scope }])); }
function viewOnly(modules = [], scope = "company") { return allow(modules, ["view", "export", "print"], scope); }

const DEFAULT_ROLE_PERMISSIONS = {
  admin: { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "system admin": { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "super admin": { "*": { actions: PERMISSION_ACTIONS, scope: "all" } },
  "company admin": allow(ERP_MODULE_SETS.distribution_erp),
  ceo: viewOnly(["dashboard", "reports", "finance", "inventory", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "manufacturing", "retail-pos", "service", "trading", "live-tracking", "notifications"]),
  "purchase manager": allow(["dashboard", "suppliers", "products", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  "finance manager": allow(["dashboard", "finance", "receipts", "payments", "expenses", "loans", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  accountant: allow(["dashboard", "finance", "receipts", "payments", "expenses", "reports", "notifications"], ["view", "create", "edit", "export", "print"]),
  "sales manager": allow(["dashboard", "customers", "products", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  distributor: allow(["dashboard", "users", "customers", "secondary-sales-orders", "customer-orders", "customer-billing", "inventory", "goods-receipts", "receipts", "payments", "finance", "returns", "reports", "live-tracking", "notifications"], ["view", "create", "edit", "export", "print"], "own"),
  salesman: allow(["dashboard", "secondary-sales-orders", "customers", "receipts", "deliveries", "live-tracking", "notifications"], ["view", "create", "edit", "track", "print"], "own"),
  "order booker": allow(["dashboard", "secondary-sales-orders", "customers", "receipts", "live-tracking", "notifications"], ["view", "create", "edit", "track", "print"], "own"),
  "warehouse manager": allow(["dashboard", "warehouse", "warehouses", "inventory", "goods-receipts", "dispatches", "returns", "manufacturing", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"], "warehouse"),
  "delivery boy": allow(["dashboard", "deliveries", "dispatches", "live-tracking", "customer-billing", "notifications"], ["view", "edit", "track", "print"], "own"),
  customer: allow(["dashboard", "customer-orders", "customer-billing", "returns", "receipts", "notifications"], ["view", "create", "print"], "own"),
  supplier: allow(["dashboard", "procurement", "purchase-requests", "purchase-orders", "notifications"], ["view", "create", "print"], "own"),
  "brand manager": allow(["dashboard", "products", "customers", "sales-quotations", "primary-sales-orders", "retail-pos", "returns", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  "store manager": allow(["dashboard", "retail-pos", "products", "customers", "inventory", "warehouse", "finance", "receipts", "returns", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  cashier: allow(["dashboard", "retail-pos", "customers", "receipts", "returns", "notifications"], ["view", "create", "edit", "print"], "own"),
  "production manager": allow(["dashboard", "manufacturing", "products", "inventory", "warehouse", "goods-receipts", "procurement", "purchase-requests", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  "production supervisor": allow(["dashboard", "manufacturing", "inventory", "warehouse", "reports", "notifications"], ["view", "create", "edit", "print"], "warehouse"),
  "quality manager": allow(["dashboard", "manufacturing", "inventory", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  "service manager": allow(["dashboard", "service", "customers", "products", "inventory", "finance", "receipts", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  "service agent": allow(["dashboard", "service", "customers", "inventory", "receipts", "notifications"], ["view", "create", "edit", "print"], "own"),
  technician: allow(["dashboard", "service", "inventory", "notifications"], ["view", "edit", "print"], "own"),
  "trading manager": allow(["dashboard", "trading", "products", "customers", "suppliers", "procurement", "purchase-orders", "primary-sales-orders", "inventory", "warehouse", "finance", "reports", "notifications"], ["view", "create", "edit", "approve", "export", "print"]),
  "import officer": allow(["dashboard", "trading", "suppliers", "procurement", "purchase-orders", "inventory", "warehouse", "finance", "reports", "notifications"], ["view", "create", "edit", "export", "print"]),
  "export officer": allow(["dashboard", "trading", "customers", "primary-sales-orders", "inventory", "finance", "reports", "notifications"], ["view", "create", "edit", "export", "print"]),
};

function role(name, key, portalType, permissions, landingPath = "/portals", options = {}) {
  const enabledModules = options.enabledModules || Object.keys(permissions || {}).filter((k) => k !== "*");
  return { name, key, portalType, permissions, landingPath, enabledModules, mobileAccess: Boolean(options.mobileAccess), mobileModules: options.mobileModules || [], isSystemRole: true, erpTemplates: options.erpTemplates || ["common"] };
}

const DEFAULT_ROLE_BLUEPRINTS = [
  role("Super Admin", "super_admin", "system_admin", DEFAULT_ROLE_PERMISSIONS["super admin"], "/portals/system-admin", { erpTemplates: ["common"] }),
  ...Object.entries(ERP_MODULE_SETS).map(([erpTemplateKey, modules]) => role("Company Admin", "company_admin", "company_admin", allow(modules), "/portals", { erpTemplates: [erpTemplateKey], enabledModules: modules })),
  role("CEO", "ceo", "ceo", DEFAULT_ROLE_PERMISSIONS.ceo, "/portals", { erpTemplates: ["distribution_erp", "trading_erp", "manufacturing_erp", "retail_pos_erp", "service_erp", "custom_erp"] }),
  role("Purchase Manager", "purchase_manager", "purchase_manager", DEFAULT_ROLE_PERMISSIONS["purchase manager"], "/portals/procurement", { erpTemplates: ["distribution_erp", "trading_erp", "manufacturing_erp", "custom_erp"] }),
  role("Finance Manager", "finance_manager", "finance_manager", DEFAULT_ROLE_PERMISSIONS["finance manager"], "/portals/finance", { erpTemplates: ["distribution_erp", "trading_erp", "manufacturing_erp", "retail_pos_erp", "service_erp", "custom_erp"] }),
  role("Accountant", "accountant", "accountant", DEFAULT_ROLE_PERMISSIONS.accountant, "/portals/finance", { erpTemplates: ["distribution_erp", "trading_erp", "manufacturing_erp", "retail_pos_erp", "service_erp", "custom_erp"] }),
  role("Sales Manager", "sales_manager", "sales_manager", DEFAULT_ROLE_PERMISSIONS["sales manager"], "/portals/sales/primary-orders", { erpTemplates: ["distribution_erp", "trading_erp", "custom_erp"] }),
  role("Distributor", "distributor", "distributor", DEFAULT_ROLE_PERMISSIONS.distributor, "/portals/sales/secondary-orders", { erpTemplates: ["distribution_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "customers", "secondary-sales-orders", "receipts", "deliveries", "live-tracking"] }),
  role("Salesman", "salesman", "salesman", DEFAULT_ROLE_PERMISSIONS.salesman, "/portals/sales/secondary-orders", { erpTemplates: ["distribution_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "customers", "secondary-sales-orders", "receipts", "live-tracking"] }),
  role("Order Booker", "order_booker", "order_booker", DEFAULT_ROLE_PERMISSIONS["order booker"], "/portals/sales/secondary-orders", { erpTemplates: ["distribution_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "customers", "secondary-sales-orders", "receipts", "live-tracking"] }),
  role("Warehouse Manager", "warehouse_manager", "warehouse_manager", DEFAULT_ROLE_PERMISSIONS["warehouse manager"], "/portals/warehouse", { erpTemplates: ["distribution_erp", "trading_erp", "manufacturing_erp", "retail_pos_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "warehouse", "inventory", "goods-receipts", "dispatches"] }),
  role("Delivery Boy", "delivery_boy", "delivery_boy", DEFAULT_ROLE_PERMISSIONS["delivery boy"], "/portals/deliveries", { erpTemplates: ["distribution_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "deliveries", "dispatches", "live-tracking"] }),
  role("Customer", "customer", "customer", DEFAULT_ROLE_PERMISSIONS.customer, "/portals/customer/billing", { erpTemplates: ["distribution_erp", "trading_erp", "retail_pos_erp", "service_erp", "custom_erp"] }),
  role("Supplier", "supplier", "supplier", DEFAULT_ROLE_PERMISSIONS.supplier, "/portals/procurement/purchase-orders", { erpTemplates: ["distribution_erp", "trading_erp", "manufacturing_erp", "custom_erp"] }),
  role("Brand Manager", "brand_manager", "brand_manager", DEFAULT_ROLE_PERMISSIONS["brand manager"], "/portals/sales/primary-orders", { erpTemplates: ["distribution_erp", "retail_pos_erp", "custom_erp"] }),
  role("Store Manager", "store_manager", "store_manager", DEFAULT_ROLE_PERMISSIONS["store manager"], "/portals/retail-pos", { erpTemplates: ["retail_pos_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "retail-pos", "inventory", "customers"] }),
  role("Cashier", "cashier", "cashier", DEFAULT_ROLE_PERMISSIONS.cashier, "/portals/retail-pos", { erpTemplates: ["retail_pos_erp", "custom_erp"] }),
  role("Production Manager", "production_manager", "production_manager", DEFAULT_ROLE_PERMISSIONS["production manager"], "/portals/manufacturing", { erpTemplates: ["manufacturing_erp", "custom_erp"] }),
  role("Production Supervisor", "production_supervisor", "production_supervisor", DEFAULT_ROLE_PERMISSIONS["production supervisor"], "/portals/manufacturing", { erpTemplates: ["manufacturing_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "manufacturing", "inventory", "warehouse"] }),
  role("Quality Manager", "quality_manager", "quality_manager", DEFAULT_ROLE_PERMISSIONS["quality manager"], "/portals/manufacturing", { erpTemplates: ["manufacturing_erp", "custom_erp"] }),
  role("Service Manager", "service_manager", "service_manager", DEFAULT_ROLE_PERMISSIONS["service manager"], "/portals/service", { erpTemplates: ["service_erp", "custom_erp"] }),
  role("Service Agent", "service_agent", "service_agent", DEFAULT_ROLE_PERMISSIONS["service agent"], "/portals/service", { erpTemplates: ["service_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "service", "customers"] }),
  role("Technician", "technician", "technician", DEFAULT_ROLE_PERMISSIONS.technician, "/portals/service", { erpTemplates: ["service_erp", "custom_erp"], mobileAccess: true, mobileModules: ["dashboard", "service"] }),
  role("Trading Manager", "trading_manager", "trading_manager", DEFAULT_ROLE_PERMISSIONS["trading manager"], "/portals/trading", { erpTemplates: ["trading_erp", "custom_erp"] }),
  role("Import Officer", "import_officer", "import_officer", DEFAULT_ROLE_PERMISSIONS["import officer"], "/portals/trading", { erpTemplates: ["trading_erp", "custom_erp"] }),
  role("Export Officer", "export_officer", "export_officer", DEFAULT_ROLE_PERMISSIONS["export officer"], "/portals/trading", { erpTemplates: ["trading_erp", "custom_erp"] }),
];

function getDefaultRoleBlueprints(erpTemplateKey = "distribution_erp", includeCommon = true) {
  const erp = String(erpTemplateKey || "distribution_erp").trim();
  return DEFAULT_ROLE_BLUEPRINTS.filter((bp) => (includeCommon && bp.erpTemplates?.includes("common")) || bp.erpTemplates?.includes(erp));
}

module.exports = { PERMISSION_ACTIONS, ADMIN_ROLES, DEFAULT_ROLE_PERMISSIONS, DEFAULT_ROLE_BLUEPRINTS, ERP_MODULE_SETS, getDefaultRoleBlueprints };
