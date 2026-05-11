const { buildCompanyAccessContext } = require("../../access/permissions/companyAccessGuard");
const { listVisibleModules } = require("../../permissions/services/permission.service");

function text(value) { return String(value || "").trim(); }
function lower(value) { return text(value).toLowerCase(); }
function isSystemAdmin(user = {}) { return ["admin", "system admin", "super admin"].includes(lower(user.role)) || lower(user.portalType).includes("system") || lower(user.roleKey).includes("super"); }
function isCompanyAdmin(user = {}) { return lower(user.role) === "company admin" || lower(user.portalType) === "company_admin" || lower(user.roleKey) === "company_admin"; }
function safeCompany(company = {}) {
  return {
    _id: company._id,
    companyId: company.companyId,
    name: company.name,
    slug: company.slug,
    email: company.email,
    phone1: company.phone1,
    phone2: company.phone2,
    mainOfficeAddress: company.mainOfficeAddress,
    status: company.status,
    erpTemplateKey: company.erpTemplateKey || company.businessType,
    businessType: company.businessType,
    systemName: company.systemName,
    logoUrl: company.logoUrl,
    stampUrl: company.stampUrl,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    activatedAt: company.activatedAt,
    suspendedAt: company.suspendedAt,
    suspensionReason: company.suspensionReason,
  };
}

async function getControlCenter(actor = {}) {
  const companyId = text(actor.companyId);
  if (!companyId) throw new Error("Company context is required");
  if (!isCompanyAdmin(actor) && !isSystemAdmin(actor)) throw new Error("Company Admin access is required");
  const context = await buildCompanyAccessContext(companyId);
  const visibleModules = await listVisibleModules({ ...actor, subscription: context.subscription, enabledModules: context.allowedModules, erpTemplateKey: context.erpTemplateKey }).catch(() => []);
  const allowedVisibleKeys = new Set((visibleModules || []).map((m) => m.key));
  return {
    company: safeCompany(context.company),
    subscription: context.subscription,
    erpTemplateKey: context.erpTemplateKey,
    usage: context.usage,
    limits: context.limits,
    percent: context.percent,
    allowedModules: context.allowedModules,
    enabledModules: context.effectiveModuleKeys,
    visibleModules: context.portalModules.filter((m) => context.allowedModules.includes("*") || context.allowedModules.includes(m.key)).map((m) => ({ ...m, visibleToCurrentUser: allowedVisibleKeys.has(m.key) })),
    usersPreview: context.tenantUsers.slice(0, 8).map((u) => ({ _id: u._id, userId: u.userId, fullName: u.fullName, username: u.username, role: u.role, roleKey: u.roleKey, status: u.status, mobileAccess: Boolean(u.mobileAccess), branchNameOrNumber: u.branchNameOrNumber, warehouseName: u.warehouseName })),
    branchesPreview: context.branches.slice(0, 8),
    warehousesPreview: context.warehouses.slice(0, 8),
  };
}

module.exports = { getControlCenter };
