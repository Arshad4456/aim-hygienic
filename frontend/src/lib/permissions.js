const MODULE_ALIASES = {
  "system-admin": ["system-admin", "system_admin", "core"],
  "erp-templates": ["erp-templates", "erp_templates"],
  "primary-sales-orders": ["primary-sales-orders", "primary-orders", "primary_sales_orders", "primary_orders", "sales"],
  "secondary-sales-orders": ["secondary-sales-orders", "secondary-orders", "secondary_sales_orders", "secondary_orders", "distribution"],
  "customer-orders": ["customer-orders", "customer_orders", "customers"],
  "customer-billing": ["customer-billing", "customer_billing", "customers", "receipts"],
  "live-tracking": ["live-tracking", "live_tracking"],
  notifications: ["notifications", "messages"],
  messages: ["messages", "notifications"],
  "supplier-payments": ["supplier-payments", "supplier_payments", "payments", "procurement"],
  receipts: ["receipts", "finance"],
  payments: ["payments", "finance"],
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function candidateKeys(moduleKey) {
  const key = normalize(moduleKey);
  const normalizedDash = key.replace(/_/g, "-");
  const normalizedUnderscore = key.replace(/-/g, "_");
  return Array.from(new Set([key, normalizedDash, normalizedUnderscore, ...(MODULE_ALIASES[key] || []), ...(MODULE_ALIASES[normalizedDash] || [])]));
}

function actionAllowed(entry, action) {
  const requested = normalize(action || "view");
  if (!entry) return false;
  if (entry === "*") return true;
  if (Array.isArray(entry)) return entry.map(normalize).includes("*") || entry.map(normalize).includes(requested);
  if (typeof entry === "object") {
    if (Array.isArray(entry.actions)) {
      const actions = entry.actions.map(normalize);
      return actions.includes("*") || actions.includes(requested);
    }
    return Boolean(entry[requested] || entry["*"] || (entry.view === true && requested === "view"));
  }
  return Boolean(entry);
}

export function hasPermission(permissions = {}, moduleKey, action = "view") {
  if (!moduleKey) return false;
  if (permissions === "*" || permissions?.["*"] || permissions?.superAdmin) return true;
  return candidateKeys(moduleKey).some((key) => actionAllowed(permissions?.[key], action));
}

export function canViewModule(permissions = {}, moduleKey) {
  return hasPermission(permissions, moduleKey, "view");
}
