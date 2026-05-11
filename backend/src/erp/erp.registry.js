const ERP_REGISTRY = Object.freeze({
  platform: {
    label: "Rawyan SaaS Platform",
    modules: ["auth", "companies", "users", "roles", "permissions", "portal-modules", "erp-types", "subscriptions", "system-admin", "settings", "access", "tenancy", "health"],
  },
  common: {
    label: "Common ERP Services",
    modules: ["dashboard", "reports", "notifications", "messaging", "files", "finance", "inventory", "procurement", "products", "warehouse", "customers", "returns", "operations", "audit-logs", "approvals"],
  },
  distribution: {
    label: "Distribution ERP",
    modules: ["overview", "territory", "sales", "reports"],
  },
  logistics: {
    label: "Logistics / Fleet ERP",
    modules: ["fleet", "live-tracking", "operations"],
  },
  manufacturing: {
    label: "Manufacturing ERP",
    modules: ["bom", "production", "quality-control", "maintenance"],
  },
  "retail-pos": {
    label: "Retail POS ERP",
    modules: ["pos"],
  },
  "service-business": {
    label: "Service Business ERP",
    modules: ["work-orders", "tickets", "contracts", "assets"],
  },
  trading: {
    label: "Trading / Import Export ERP",
    modules: ["import-export"],
  },
});

module.exports = { ERP_REGISTRY };
