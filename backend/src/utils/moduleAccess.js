const ModuleAccessConfig = require("../models/ModuleAccessConfig");

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function rule(key, moduleKey, title, description, allowedRoles = []) {
  return { key, moduleKey, title, description, allowedRoles: allowedRoles.map(normalizeRole).filter(Boolean), locked: false };
}

const DEFAULT_MODULE_RULES = [
  rule("dashboard.overview", "dashboard", "Dashboard Overview", "Open the main dashboard overview.", ["admin", "system admin", "company admin", "ceo", "managing director", "warehouse manager", "account officer", "distributor", "brand manager"]),
  rule("dashboard.operations", "dashboard", "Operations Command Center", "Access operations command center.", ["admin", "system admin", "company admin", "ceo", "managing director"]),
  rule("dashboard.sales-kpi", "dashboard", "Sales KPI", "View sales KPI dashboards.", ["admin", "system admin", "company admin", "ceo", "managing director", "warehouse manager", "brand manager", "distributor"]),

  rule("hr.overview", "hr-role-management", "HR & Role Management", "Open HR and role management module.", ["admin", "system admin", "company admin", "distributor"]),
  rule("hr.users.add", "hr-role-management", "Add User", "Create users for the company or distributor team.", ["admin", "system admin", "company admin", "distributor"]),
  rule("hr.users.list", "hr-role-management", "User List", "View and manage company users.", ["admin", "system admin", "company admin", "distributor"]),
  rule("hr.module-access", "hr-role-management", "Module Access Control", "Manage module and section access rules.", ["admin", "system admin", "company admin"]),

  rule("products.add", "products-management", "Add Product", "Create new product records.", ["admin", "system admin", "company admin"]),
  rule("products.list", "products-management", "Product List", "View product records.", ["admin", "system admin", "company admin", "warehouse manager", "brand manager", "distributor"]),
  rule("products.barcodes", "products-management", "Product Barcodes", "View and print product barcodes.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("products.price-change", "products-management", "Price Change", "Update or review product pricing.", ["admin", "system admin", "company admin", "brand manager"]),

  rule("warehouse-inventory.overview", "warehouse-inventory", "Warehouse & Inventory Overview", "Open warehouse and inventory module overview.", ["admin", "system admin", "company admin", "warehouse manager", "distributor"]),
  rule("warehouse-inventory.warehouse-master", "warehouse-inventory", "Warehouse Master", "View warehouse master records.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("warehouse-inventory.ledger", "warehouse-inventory", "Inventory Ledger", "Open inventory ledger and movement history.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("warehouse-inventory.transfers", "warehouse-inventory", "Stock Transfers", "Manage stock transfers between warehouses.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("warehouse-inventory.summary", "warehouse-inventory", "Stock Summary", "View stock summary analytics.", ["admin", "system admin", "company admin", "warehouse manager", "distributor"]),
  rule("warehouse-inventory.low-stock", "warehouse-inventory", "Low Stock Alerts", "Review low stock alerts.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("warehouse-inventory.near-expiry", "warehouse-inventory", "Near Expiry Products", "Review near expiry stock.", ["admin", "system admin", "company admin", "warehouse manager"]),

  rule("territory-assets.warehouses.add", "territory-assets", "Add Warehouse", "Create warehouse master records.", ["admin", "system admin", "company admin"]),
  rule("territory-assets.warehouses.list", "territory-assets", "Warehouse List", "View warehouse master list.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("territory-assets.regions.add", "territory-assets", "Add Region", "Create region records.", ["admin", "system admin", "company admin"]),
  rule("territory-assets.regions.list", "territory-assets", "Region List", "View region records.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("territory-assets.zones.add", "territory-assets", "Add Zone", "Create zone records.", ["admin", "system admin", "company admin"]),
  rule("territory-assets.zones.list", "territory-assets", "Zone List", "View zone records.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("territory-assets.territories.add", "territory-assets", "Add Territory", "Create territory records.", ["admin", "system admin", "company admin"]),
  rule("territory-assets.territories.list", "territory-assets", "Territory List", "View territory records.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("territory-assets.fields.add", "territory-assets", "Add Field", "Create field records.", ["admin", "system admin", "company admin"]),
  rule("territory-assets.fields.list", "territory-assets", "Field List", "View field records.", ["admin", "system admin", "company admin", "warehouse manager"]),

  rule("order-management.overview", "order-management", "Order Management Overview", "Open order management module.", ["admin", "system admin", "company admin", "warehouse manager", "brand manager", "distributor", "order booker", "customer", "supplier"]),
  rule("order-management.primary", "order-management", "Primary Order", "Create and review primary orders.", ["admin", "system admin", "company admin", "warehouse manager", "brand manager", "distributor", "supplier"]),
  rule("order-management.secondary", "order-management", "Secondary Order", "Create and review secondary orders.", ["admin", "system admin", "company admin", "warehouse manager", "distributor", "order booker", "customer", "salesman", "delivery boy"]),
  rule("order-management.return-stock", "order-management", "Return Stock", "Create and process return stock requests.", ["admin", "system admin", "company admin", "warehouse manager", "brand manager", "distributor"]),

  rule("vehicle-management.overview", "vehicle-management", "Vehicle Management Overview", "Open vehicle management dashboard.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("vehicle-management.add", "vehicle-management", "Add Vehicle", "Create vehicle records.", ["admin", "system admin", "company admin"]),
  rule("vehicle-management.list", "vehicle-management", "Vehicle List", "View vehicle records.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("vehicle-management.fuel", "vehicle-management", "Fuel Management", "Manage fuel records and meter readings.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("vehicle-management.maintenance", "vehicle-management", "Vehicle Maintenance", "Manage maintenance records.", ["admin", "system admin", "company admin", "warehouse manager"]),

  rule("account-management.accounts", "account-management", "Account Detail", "Manage company accounts.", ["admin", "system admin", "company admin", "account officer", "cashier"]),
  rule("account-management.loans", "account-management", "Loan Detail", "Manage received and given loans.", ["admin", "system admin", "company admin", "account officer"]),
  rule("account-management.payments", "account-management", "Payment Management", "Manage payment records and settlements.", ["admin", "system admin", "company admin", "warehouse manager", "distributor", "account officer"]),

  rule("finance.overview", "finance-accounts", "Finance & Accounts Overview", "Open finance and accounts module.", ["admin", "system admin", "company admin", "account officer", "cashier"]),
  rule("finance.invoices", "finance-accounts", "Invoices", "View order invoices.", ["admin", "system admin", "company admin", "account officer", "distributor", "supplier"]),
  rule("finance.receipts", "finance-accounts", "Receipts", "View and process receipts.", ["admin", "system admin", "company admin", "account officer", "cashier", "distributor", "order booker", "customer", "supplier"]),
  rule("finance.aging", "finance-accounts", "Aging Report", "View aging report.", ["admin", "system admin", "company admin", "account officer"]),

  rule("expense.overview", "expense-management", "Expense Overview", "Open expense management module.", ["admin", "system admin", "company admin", "account officer", "cashier", "distributor"]),
  rule("expense.personal", "expense-management", "AIM Personal Expense", "Manage company personal expenses.", ["admin", "system admin", "company admin", "account officer", "cashier"]),
  rule("expense.daily", "expense-management", "Daily Expense", "Manage daily expenses.", ["admin", "system admin", "company admin", "account officer", "cashier"]),
  rule("expense.distributor", "expense-management", "Distributor Expense", "Manage distributor expenses.", ["admin", "system admin", "company admin", "distributor", "account officer"]),

  rule("procurement.overview", "procurement", "Procurement Overview", "Open procurement and supplier module.", ["admin", "system admin", "company admin", "supplier"]),
  rule("procurement.suppliers", "procurement", "Supplier Master", "View supplier records.", ["admin", "system admin", "company admin"]),
  rule("procurement.purchase-orders", "procurement", "Purchase Orders", "View supplier purchase orders.", ["admin", "system admin", "company admin", "supplier"]),
  rule("procurement.grn", "procurement", "Goods Receipt (GRN)", "Manage goods receipts.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("procurement.payments", "procurement", "Supplier Payments", "Manage supplier payments.", ["admin", "system admin", "company admin", "account officer"]),

  rule("logistics.overview", "distribution-logistics", "Distribution & Logistics Overview", "Open logistics module.", ["admin", "system admin", "company admin", "warehouse manager", "distributor"]),
  rule("logistics.routes", "distribution-logistics", "Route Planning", "Manage route planning.", ["admin", "system admin", "company admin", "warehouse manager"]),
  rule("logistics.dispatch", "distribution-logistics", "Dispatch & Delivery", "Manage dispatch and delivery flow.", ["admin", "system admin", "company admin", "warehouse manager", "distributor", "supplier", "salesman", "delivery boy"]),

  rule("quality.overview", "quality-compliance", "Quality & Compliance Overview", "Open quality module.", ["admin", "system admin", "company admin"]),
  rule("quality.raw-material", "quality-compliance", "Raw Material QC", "Review raw material quality control.", ["admin", "system admin", "company admin"]),
  rule("quality.production", "quality-compliance", "Production QC", "Review production quality control.", ["admin", "system admin", "company admin"]),
  rule("quality.finished-goods", "quality-compliance", "Finished Goods QC", "Review finished goods quality control.", ["admin", "system admin", "company admin"]),
  rule("quality.final-release", "quality-compliance", "Final Release QC", "Review final release quality control.", ["admin", "system admin", "company admin"]),

  rule("messages", "communications", "Messages", "Open messages and notifications.", ["admin", "system admin", "company admin", "distributor", "brand manager", "order booker", "customer", "supplier"]),
  rule("live-tracking", "communications", "User Live Tracking", "Open live tracking.", ["admin", "system admin", "company admin", "distributor"]),
  rule("reports", "analytics", "Reports", "Open reports module.", ["admin", "system admin", "company admin", "warehouse manager", "distributor"]),
  rule("settings", "settings", "Settings", "Open dashboard settings.", ["admin", "system admin", "company admin", "distributor", "brand manager", "customer"]),
];

function mergeModuleAccessRules(savedRules = []) {
  const savedByKey = new Map((savedRules || []).map((entry) => [String(entry?.key || ""), entry]));
  return DEFAULT_MODULE_RULES.map((defaultRule) => {
    const saved = savedByKey.get(defaultRule.key);
    if (!saved) return { ...defaultRule };
    return {
      ...defaultRule,
      allowedRoles: Array.isArray(saved.allowedRoles) && saved.allowedRoles.length
        ? saved.allowedRoles.map(normalizeRole).filter(Boolean)
        : [...defaultRule.allowedRoles],
      locked: Boolean(saved.locked),
    };
  });
}

async function loadModuleRulesForCompany(companyId = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) return mergeModuleAccessRules([]);
  const config = await ModuleAccessConfig.findOne({ companyId: normalizedCompanyId }).lean();
  return mergeModuleAccessRules(config?.rules || []);
}

async function isModuleSectionAllowed({ companyId = "", role = "", key = "" }) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return true;
  const rules = await loadModuleRulesForCompany(companyId);
  const rule = rules.find((entry) => entry.key === normalizedKey);
  if (!rule) return true;
  const normalizedRole = normalizeRole(role);
  const allowedRoles = Array.isArray(rule.allowedRoles) ? rule.allowedRoles.map(normalizeRole) : [];
  if (!normalizedRole) return true;
  if (!allowedRoles.length) return !rule.locked;
  return allowedRoles.includes(normalizedRole);
}

function resolveModuleCompanyId(req) {
  return String(req.user?.companyId || req.body?.companyId || req.query?.companyId || "").trim();
}

function createModuleAccessGuard(keyOrResolver, message = "This module section is locked for your role") {
  return async (req, res, next) => {
    try {
      const key = typeof keyOrResolver === "function" ? keyOrResolver(req) : keyOrResolver;
      if (!key) return next();
      const allowed = await isModuleSectionAllowed({
        companyId: resolveModuleCompanyId(req),
        role: req.user?.role,
        key,
      });
      if (!allowed) return res.status(403).json({ ok: false, message });
      return next();
    } catch (_error) {
      return res.status(500).json({ ok: false, message: "Failed to verify module access" });
    }
  };
}

module.exports = {
  DEFAULT_MODULE_RULES,
  mergeModuleAccessRules,
  normalizeRole,
  loadModuleRulesForCompany,
  isModuleSectionAllowed,
  createModuleAccessGuard,
};
