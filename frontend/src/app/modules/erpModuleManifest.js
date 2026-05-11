export const ERP_FRONTEND_MODULES = {
  distribution: [
    "dashboard", "branches", "warehouses", "products", "categories", "units", "suppliers", "customers",
    "territory", "sales-team", "route-planning", "market-visits", "sales", "sales-orders", "invoices",
    "delivery", "delivery-challans", "purchase-orders", "goods-receiving", "inventory", "stock-transfers",
    "returns", "payments", "payment-collection", "expenses", "targets", "commissions", "vehicle-management",
    "driver-management", "live-tracking", "fuel-management", "hr-payroll", "reports", "notifications"
  ],
  manufacturing: [
    "dashboard", "bom", "raw-materials", "finished-goods", "production-planning", "material-requirement-planning",
    "work-orders", "routing", "machine-management", "labor-management", "production", "production-issue",
    "production-receive", "wastage", "quality-control", "maintenance", "inventory", "purchases", "sales",
    "costing", "hr-payroll", "reports", "notifications"
  ],
  "retail-pos": [
    "dashboard", "pos", "products", "barcode", "customers", "suppliers", "purchases", "inventory",
    "stock-adjustment", "sales-return", "cash-register", "shift-management", "discounts", "tax", "multi-branch",
    "daily-closing", "expenses", "hr-payroll", "reports", "notifications"
  ],
  garment: [
    "dashboard", "customers", "article-management", "size-chart", "color-chart", "fabric", "accessories", "pattern",
    "cutting", "stitching", "printing-embroidery", "washing", "finishing", "packing", "quality-control",
    "order-management", "production-planning", "inventory", "purchases", "dispatch", "costing", "hr-payroll",
    "reports", "notifications"
  ],
  "service-business": [
    "dashboard", "clients", "leads", "quotations", "contracts", "projects", "tasks", "work-orders",
    "support-tickets", "appointments", "services", "invoicing", "payments", "expenses", "staff",
    "hr-payroll", "reports", "notifications"
  ],
  logistics: [
    "dashboard", "fleet", "vehicles", "drivers", "routes", "trips", "deliveries", "live-tracking",
    "route-planning", "fuel-management", "maintenance", "vehicle-documents", "driver-documents", "expenses",
    "proof-of-delivery", "incidents", "reports", "notifications"
  ],
  "trading-import": [
    "dashboard", "suppliers", "customers", "proforma-invoices", "purchase-orders", "lc-management",
    "shipment-tracking", "container-tracking", "landed-costing", "inventory", "sales", "multi-currency",
    "payments", "documents", "reports", "notifications"
  ]
};

export const ROLE_AWARE_COMMON_MODULES = {
  dashboard: "Dashboard content is generated from companyId, erpType, role, permissions, branch/warehouse/territory scope.",
  notifications: "Notifications are filtered by event type, ERP type, module, user role, and permission scope.",
  messages: "Messages are routed only to the role group or assigned user scope that owns the work.",
  reports: "Reports are shown by ERP type, module access, role scope, and assigned territory/warehouse/branch.",
  settings: "Settings are separated between system admin, company admin, and allowed user preferences."
};

export function getFrontendModulesForErp(erpType = "distribution") {
  return ERP_FRONTEND_MODULES[erpType] || ERP_FRONTEND_MODULES.distribution;
}

export default ERP_FRONTEND_MODULES;
