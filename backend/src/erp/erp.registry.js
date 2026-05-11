const ERP_TYPES = Object.freeze({
  DISTRIBUTION: "distribution",
  MANUFACTURING: "manufacturing",
  RETAIL_POS: "retail-pos",
  GARMENT: "garment",
  SERVICE_BUSINESS: "service-business",
  LOGISTICS: "logistics",
  TRADING: "trading",
});

const COMPANY_STATUSES = Object.freeze([
  "trial",
  "active",
  "inactive",
  "suspended",
  "cancelled",
  "expired",
  "pending_setup",
]);

const ERP_DEFINITIONS = Object.freeze({
  [ERP_TYPES.DISTRIBUTION]: {
    label: "Distribution ERP",
    modules: ["dashboard", "territory", "customers", "sales-team", "route-planning", "inventory", "procurement", "sales", "delivery", "payments", "returns", "targets", "commissions", "vehicle-management", "live-tracking", "reports"],
    roles: ["company-admin", "general-manager", "sales-manager", "territory-manager", "area-sales-officer", "warehouse-manager", "purchase-manager", "accounts-manager", "delivery-rider", "driver"],
    territoryFlow: ["country", "province_state", "region", "zone", "area", "territory", "route", "market", "customer_retailer"],
  },
  [ERP_TYPES.MANUFACTURING]: {
    label: "Manufacturing ERP",
    modules: ["dashboard", "bom", "raw-materials", "production-planning", "work-orders", "machine-management", "quality-control", "maintenance", "inventory", "purchases", "sales", "costing", "hr-payroll", "reports"],
    roles: ["company-admin", "factory-manager", "production-manager", "inventory-manager", "purchase-manager", "quality-manager", "machine-operator", "maintenance-manager", "accounts-manager", "hr-manager"],
  },
  [ERP_TYPES.RETAIL_POS]: {
    label: "Retail POS ERP",
    modules: ["dashboard", "pos", "products", "barcode", "customers", "inventory", "purchases", "sales-return", "cash-register", "shift-management", "discounts", "tax", "daily-closing", "hr-payroll", "reports"],
    roles: ["company-admin", "branch-manager", "store-manager", "cashier", "inventory-manager", "purchase-manager", "accounts-manager", "hr-manager"],
  },
  [ERP_TYPES.GARMENT]: {
    label: "Garment ERP",
    modules: ["dashboard", "articles", "fabric", "accessories", "pattern", "cutting", "stitching", "printing-embroidery", "washing", "finishing", "packing", "quality-control", "order-management", "inventory", "dispatch", "costing", "hr-payroll", "reports"],
    roles: ["company-admin", "merchandiser", "production-manager", "cutting-manager", "stitching-manager", "printing-manager", "quality-manager", "packing-manager", "inventory-manager", "accounts-manager", "hr-manager"],
  },
  [ERP_TYPES.SERVICE_BUSINESS]: {
    label: "Service Business ERP",
    modules: ["dashboard", "clients", "leads", "quotations", "contracts", "projects", "tasks", "work-orders", "tickets", "appointments", "services", "invoicing", "payments", "expenses", "staff", "hr-payroll", "reports"],
    roles: ["company-admin", "operations-manager", "project-manager", "support-agent", "sales-executive", "accountant", "hr-manager", "technician"],
  },
  [ERP_TYPES.LOGISTICS]: {
    label: "Logistics & Fleet ERP",
    modules: ["dashboard", "vehicles", "drivers", "routes", "trips", "deliveries", "live-tracking", "fuel-management", "maintenance", "documents", "expenses", "proof-of-delivery", "reports"],
    roles: ["company-admin", "fleet-manager", "dispatch-manager", "driver", "maintenance-manager", "accounts-manager"],
  },
  [ERP_TYPES.TRADING]: {
    label: "Trading ERP",
    modules: ["dashboard", "imports", "exports", "letter-of-credit", "landed-cost", "shipments", "inventory", "purchases", "sales", "finance", "reports"],
    roles: ["company-admin", "import-manager", "export-manager", "purchase-manager", "sales-manager", "warehouse-manager", "accounts-manager"],
  },
});

function normalizeErpType(value) {
  const key = String(value || "").trim().toLowerCase().replace(/_/g, "-");
  return ERP_DEFINITIONS[key] ? key : ERP_TYPES.DISTRIBUTION;
}

function getErpDefinition(value) {
  return ERP_DEFINITIONS[normalizeErpType(value)];
}

module.exports = { ERP_TYPES, COMPANY_STATUSES, ERP_DEFINITIONS, normalizeErpType, getErpDefinition };
