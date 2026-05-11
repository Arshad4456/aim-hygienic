const Company = require("../../models/Company");
const CompanyBranch = require("../../models/CompanyBranch");
const CompanySubscription = require("../subscriptions/companySubscription.model");
const ModuleAccessConfig = require("../../models/ModuleAccessConfig");
const PortalModule = require("../../models/PortalModule");
const { listTenantUsersByCompany } = require("../../utils/tenantUsers");
const { listTenantMasterByCompany } = require("../../utils/tenantMasters");
const { ERP_MODULE_SETS, normalizeErpType, getAllowedModulesForRole, resolveRoleKey } = require("./erpAccessMatrix");

const ALWAYS_ALLOWED_MODULES = new Set(["dashboard", "company-control", "settings", "notifications"]);
const SYSTEM_ROLES = new Set(["admin", "system admin", "super admin", "system_admin", "super_admin"]);

function text(value) { return String(value || "").trim(); }
function lower(value) { return text(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " "); }
function normalizeModule(value = "") { return text(value).toLowerCase().replace(/_/g, "-"); }
function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function unique(list = []) { return Array.from(new Set((list || []).filter(Boolean).map((item) => normalizeModule(item)))); }
function isSystemUser(user = {}) { return SYSTEM_ROLES.has(lower(user.role)) || SYSTEM_ROLES.has(lower(user.roleKey)) || lower(user.portalType).includes("system"); }
function isCompanyAdmin(user = {}) { return resolveRoleKey(user.role || user.roleKey || user.portalType) === "company admin" || lower(user.portalType) === "company admin"; }
function isExpired(value) { if (!value) return false; const time = new Date(value).getTime(); return Number.isFinite(time) && time < Date.now(); }
function isActiveStatus(status = "active") { const value = lower(status || "active"); return !value || ["active", "trial"].includes(value); }
function withDefaults(modules = []) { return unique([...(modules || []), ...Array.from(ALWAYS_ALLOWED_MODULES)]); }

function getSubscription(company = {}, subscriptionDoc = null) {
  const source = subscriptionDoc || company.subscription || {};
  return {
    planKey: source.planKey || company.subscription?.planKey || "starter",
    planName: source.name || source.planName || source.planKey || company.subscription?.planKey || "Starter",
    status: source.status || company.subscription?.status || company.status || "active",
    userLimit: number(source.userLimit ?? company.subscription?.userLimit, 0),
    branchLimit: number(source.branchLimit ?? company.subscription?.branchLimit, 0),
    warehouseLimit: number(source.warehouseLimit ?? company.subscription?.warehouseLimit, 0),
    moduleLimit: number(source.moduleLimit ?? company.subscription?.moduleLimit, 0),
    mobileUserLimit: number(source.mobileUserLimit ?? company.subscription?.mobileUserLimit, 0),
    allowedModules: Array.isArray(source.allowedModules) ? source.allowedModules : company.enabledModules || [],
    expiresAt: source.expiresAt || company.subscription?.expiresAt || null,
    startsAt: source.startsAt || company.subscription?.startsAt || null,
    notes: source.notes || company.subscription?.notes || "",
  };
}

async function buildCompanyAccessContext(companyId = "") {
  const cleanCompanyId = text(companyId);
  if (!cleanCompanyId) throw new Error("companyId is required");
  const [company, subscriptionDoc, moduleAccess, portalModules, tenantUsers, branches, tenantWarehouses] = await Promise.all([
    Company.findOne({ companyId: cleanCompanyId }).lean(),
    CompanySubscription.findOne({ companyId: cleanCompanyId }).lean().catch(() => null),
    ModuleAccessConfig.findOne({ companyId: cleanCompanyId }).lean().catch(() => null),
    PortalModule.find({ status: "active", webEnabled: true }).select("key name category path allowedErpTemplates webEnabled mobileEnabled status order").sort({ order: 1 }).lean().catch(() => []),
    listTenantUsersByCompany(cleanCompanyId).catch(() => []),
    CompanyBranch.find({ companyId: cleanCompanyId }).lean().catch(() => []),
    listTenantMasterByCompany(cleanCompanyId, "warehouses").catch(() => []),
  ]);
  if (!company) throw new Error("Company not found");
  const subscription = getSubscription(company, subscriptionDoc);
  const erpTemplateKey = normalizeErpType(company.erpTemplateKey || company.businessType || "distribution_erp");
  const modulesFromAccess = Array.isArray(moduleAccess?.modules) ? moduleAccess.modules : [];
  const planModules = subscription.allowedModules?.length ? subscription.allowedModules : company.enabledModules || [];
  const allowedModules = withDefaults(modulesFromAccess.length ? modulesFromAccess : planModules);
  const allActiveModuleKeys = portalModules.map((m) => normalizeModule(m.key));
  const effectiveModuleKeys = allowedModules.includes("*") ? allActiveModuleKeys : allowedModules;
  const activeUsers = tenantUsers.filter((u) => isActiveStatus(u.status)).length;
  const mobileUsers = tenantUsers.filter((u) => Boolean(u.mobileAccess)).length;
  const usage = {
    users: tenantUsers.length,
    activeUsers,
    inactiveUsers: Math.max(0, tenantUsers.length - activeUsers),
    mobileUsers,
    branches: branches.length,
    warehouses: tenantWarehouses.length,
    modules: allowedModules.includes("*") ? allActiveModuleKeys.length : effectiveModuleKeys.length,
  };
  const limits = {
    users: subscription.userLimit,
    branches: subscription.branchLimit,
    warehouses: subscription.warehouseLimit,
    modules: subscription.moduleLimit,
    mobileUsers: subscription.mobileUserLimit,
  };
  const percent = Object.fromEntries(Object.entries(limits).map(([key, limit]) => [key, limit ? Math.min(100, Math.round((Number(usage[key] || 0) / Number(limit)) * 100)) : 0]));
  return { company, subscription, moduleAccess, portalModules, erpTemplateKey, allowedModules, effectiveModuleKeys, usage, limits, percent, tenantUsers, branches, warehouses: tenantWarehouses };
}

function assertCompanySubscriptionActive(context = {}) {
  const companyStatus = context.company?.status || "active";
  const subscriptionStatus = context.subscription?.status || companyStatus;
  if (!isActiveStatus(companyStatus)) throw new Error(`Company is ${companyStatus}. Contact Rawyan ERP system admin.`);
  if (!isActiveStatus(subscriptionStatus)) throw new Error(`Subscription is ${subscriptionStatus}. Upgrade or reactivate the plan.`);
  if (isExpired(context.subscription?.expiresAt)) throw new Error("Subscription has expired. Upgrade or renew the company plan.");
}

function assertCompanyModuleAllowed(context = {}, user = {}, moduleKey = "dashboard") {
  const key = normalizeModule(moduleKey);
  if (!key || ALWAYS_ALLOWED_MODULES.has(key)) return true;
  const erpModules = new Set([...(ERP_MODULE_SETS[context.erpTemplateKey] || ERP_MODULE_SETS.distribution_erp || []), ...ALWAYS_ALLOWED_MODULES]);
  if (!erpModules.has(key)) throw new Error(`${key} is not part of ${context.erpTemplateKey}`);
  if (!context.allowedModules.includes("*") && !context.allowedModules.includes(key)) throw new Error(`${key} is not included in the company's active plan/modules.`);
  if (isCompanyAdmin(user)) return true;
  const roleModules = getAllowedModulesForRole(user.role || user.roleKey || user.portalType, context.erpTemplateKey).map(normalizeModule);
  const userModules = Array.isArray(user.enabledModules) ? user.enabledModules.map(normalizeModule) : [];
  if (roleModules.includes("*") || roleModules.includes(key) || userModules.includes("*") || userModules.includes(key)) return true;
  throw new Error(`${key} is not allowed for this user role.`);
}

async function assertCompanyLimit(companyId, limitKey, nextCount = null) {
  const context = await buildCompanyAccessContext(companyId);
  assertCompanySubscriptionActive(context);
  const current = number(context.usage[limitKey], 0);
  const limit = number(context.limits[limitKey], 0);
  const target = nextCount === null ? current + 1 : number(nextCount, current + 1);
  if (limit && target > limit) throw new Error(`${limitKey} limit reached for active plan (${current}/${limit}). Please upgrade the plan.`);
  return context;
}

function requireCompanyModule(moduleKey, action = "view") {
  return async (req, res, next) => {
    const resolvedModuleKey = typeof moduleKey === "function" ? moduleKey(req) : moduleKey;
    try {
      if (!req.user) return res.status(401).json({ ok: false, message: "Authentication required" });
      if (isSystemUser(req.user)) return next();
      const companyId = text(req.user.companyId || req.body?.companyId || req.query?.companyId);
      if (!companyId) return res.status(403).json({ ok: false, message: "Company context is required for this module." });
      const context = await buildCompanyAccessContext(companyId);
      assertCompanySubscriptionActive(context);
      assertCompanyModuleAllowed(context, req.user, resolvedModuleKey);
      req.companyAccess = context;
      return next();
    } catch (error) {
      const message = error.message || `Module access denied for ${moduleKey}`;
      const status = /expired|plan|subscription|limit/i.test(message) ? 402 : 403;
      return res.status(status).json({ ok: false, message, moduleKey: resolvedModuleKey, action });
    }
  };
}

module.exports = {
  buildCompanyAccessContext,
  assertCompanySubscriptionActive,
  assertCompanyModuleAllowed,
  assertCompanyLimit,
  requireCompanyModule,
  isSystemUser,
  isCompanyAdmin,
  normalizeModule,
};
