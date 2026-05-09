const MODULE_ALIASES = {
  "system-admin": ["system-admin", "system_admin", "core"],
  "erp-templates": ["erp-templates", "erp_templates"],
  "sales-quotations": ["sales-quotations", "sales_quotations", "quotations", "sales"],
  "primary-sales-orders": ["primary-sales-orders", "primary-orders", "primary_sales_orders", "primary_orders", "sales"],
  "secondary-sales-orders": ["secondary-sales-orders", "secondary-orders", "secondary_sales_orders", "secondary_orders", "distribution"],
  "customer-billing": ["customer-billing", "customer_billing", "customers", "receipts"],
  "live-tracking": ["live-tracking", "live_tracking"],
  "purchase-requests": ["purchase-requests", "purchase_requests", "purchase-requisitions", "procurement"],
  "supplier-payments": ["supplier-payments", "supplier_payments", "payments", "procurement"],
  "retail-pos": ["retail-pos", "retail_pos", "pos"],
  manufacturing: ["manufacturing", "production", "quality"],
  service: ["service", "service_erp", "tickets", "tasks", "projects"],
  "service-erp": ["service", "service_erp"],
  trading: ["trading", "trading_erp", "import", "export", "shipments"],
  "trading-erp": ["trading", "trading_erp"],
};
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function candidateKeys(moduleKey) {
  const key = normalize(moduleKey);
  const dash = key.replace(/_/g, "-");
  const underscore = key.replace(/-/g, "_");
  return Array.from(new Set([key, dash, underscore, ...(MODULE_ALIASES[key] || []), ...(MODULE_ALIASES[dash] || [])]));
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
function hasPermission(user = {}, moduleKey, action = "view") {
  const permissions = user.permissions || user.rolePermissions || {};
  if (permissions === "*" || permissions["*"] || permissions.superAdmin) return true;
  return candidateKeys(moduleKey).some((key) => actionAllowed(permissions[key], action));
}
function requirePermission(moduleKey, action = "view") {
  return (req, res, next) => {
    if (hasPermission(req.user || {}, moduleKey, action) || ["admin", "system admin", "super admin"].includes(String(req.user?.role || "").toLowerCase())) return next();
    return res.status(403).json({ ok: false, message: "Permission denied" });
  };
}
module.exports = { hasPermission, requirePermission };
