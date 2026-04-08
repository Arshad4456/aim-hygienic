const ModuleAccessConfig = require("../models/ModuleAccessConfig");

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

const DEFAULT_MODULE_RULES = [
  {
    key: "order-management.primary",
    moduleKey: "order-management",
    title: "Primary Order",
    description: "Create and review primary orders.",
    allowedRoles: ["admin", "system admin", "company admin", "warehouse manager", "brand manager", "distributor"],
    locked: false,
  },
  {
    key: "order-management.secondary",
    moduleKey: "order-management",
    title: "Secondary Order",
    description: "Create and review secondary orders.",
    allowedRoles: ["admin", "system admin", "company admin", "warehouse manager", "distributor", "order booker", "customer"],
    locked: false,
  },
  {
    key: "order-management.return-stock",
    moduleKey: "order-management",
    title: "Return Stock",
    description: "Create and process return stock requests.",
    allowedRoles: ["admin", "system admin", "company admin", "warehouse manager", "brand manager", "distributor"],
    locked: false,
  },
];

function mergeModuleAccessRules(savedRules = []) {
  const savedByKey = new Map((savedRules || []).map((rule) => [String(rule?.key || ""), rule]));
  return DEFAULT_MODULE_RULES.map((rule) => {
    const saved = savedByKey.get(rule.key);
    if (!saved) return { ...rule };
    return {
      ...rule,
      allowedRoles: Array.isArray(saved.allowedRoles) && saved.allowedRoles.length
        ? saved.allowedRoles.map(normalizeRole).filter(Boolean)
        : [...rule.allowedRoles],
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
  const rules = await loadModuleRulesForCompany(companyId);
  const rule = rules.find((entry) => entry.key === normalizedKey);
  if (!rule) return true;
  const normalizedRole = normalizeRole(role);
  const allowedRoles = Array.isArray(rule.allowedRoles) ? rule.allowedRoles.map(normalizeRole) : [];
  if (!normalizedRole) return true;
  if (!allowedRoles.length) return !rule.locked;
  return allowedRoles.includes(normalizedRole);
}

module.exports = {
  DEFAULT_MODULE_RULES,
  mergeModuleAccessRules,
  normalizeRole,
  loadModuleRulesForCompany,
  isModuleSectionAllowed,
};
