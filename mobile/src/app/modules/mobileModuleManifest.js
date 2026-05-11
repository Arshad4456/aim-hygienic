export const MOBILE_ERP_MODULES = {
  platform: ["system-admin", "companies", "users", "auth", "permissions", "company-admin"],
  common: ["dashboard", "notifications", "messages", "reports", "settings", "profile", "files", "finance", "expenses", "inventory", "warehouse", "products", "procurement", "hr-payroll", "operations"],
  distribution: ["dashboard", "territory", "sales-team", "customers", "sales", "sales-orders", "delivery", "payment-collection", "inventory", "warehouse", "reports", "distributor-portal", "brand-manager"],
  logistics: ["fleet", "vehicles", "drivers", "route-planning", "live-tracking", "fuel-management", "maintenance", "operations"],
  manufacturing: ["production", "quality-control", "work-orders", "raw-materials", "finished-goods", "maintenance", "reports"],
  "retail-pos": ["pos", "cash-register", "barcode", "customers", "inventory", "sales-return", "daily-closing", "reports"],
  garment: ["articles", "fabric", "cutting", "stitching", "printing-embroidery", "washing", "finishing", "packing", "quality-control", "hr-payroll", "reports"],
  "service-business": ["clients", "services", "tasks", "work-orders", "tickets", "contracts", "invoicing", "payments", "staff", "hr-payroll", "reports"],
};

export const MOBILE_ROLE_AWARE_COMMON_MODULES = {
  notifications: {
    scopeKeys: ["companyId", "erpType", "role", "module", "eventType", "permission"],
    rule: "Send only to users whose ERP type, role, module permission, and company scope match the event.",
  },
  messages: {
    scopeKeys: ["companyId", "conversationType", "role", "senderScope", "receiverScope"],
    rule: "Do not broadcast admin or manager messages to field users unless the message target explicitly includes them.",
  },
  reports: {
    scopeKeys: ["companyId", "erpType", "role", "branchId", "warehouseId", "territoryId"],
    rule: "Reports must be filtered by the user role and assigned operational scope.",
  },
};
