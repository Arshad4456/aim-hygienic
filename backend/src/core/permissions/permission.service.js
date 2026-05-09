const Role = require("../../models/Role");
const PortalModule = require("../../models/PortalModule");
const { DEFAULT_ROLE_PERMISSIONS, ADMIN_ROLES } = require("./permission.constants");
const { ERP_MODULE_SETS, normalizeErpType, getAllowedModulesForRole, getLandingPathForRole } = require("../access/erpAccessMatrix");

const MODULE_ALIASES = {
  "erp-templates": ["erp_templates"],
  "primary-sales-orders": ["primary-orders", "primary_sales_orders", "primary_orders"],
  "primary-orders": ["primary-sales-orders", "primary_sales_orders", "primary_orders"],
  "secondary-sales-orders": ["secondary-orders", "secondary_sales_orders", "secondary_orders"],
  "secondary-orders": ["secondary-sales-orders", "secondary_sales_orders", "secondary_orders"],
  "customer-orders": ["customer_orders"],
  "live-tracking": ["live_tracking"],
  service: ["service_erp", "tickets", "tasks", "projects"],
  trading: ["trading_erp", "import", "export", "shipments"],
};
function normalizeKey(value) { return String(value || "").trim().toLowerCase(); }
function normalizeRoleName(value) { return normalizeKey(value).replace(/_/g, " "); }
function inferPortalType(role) { const r = normalizeRoleName(role); if (["admin", "system admin", "super admin"].includes(r)) return "system_admin"; if (r === "company admin") return "company_admin"; return r.replace(/\s+/g, "_") || "company_user"; }
function normalizeEntry(entry) { if (!entry) return { actions: [], scope: "company" }; if (entry === "*") return { actions: ["*"], scope: "all" }; if (Array.isArray(entry)) return { actions: entry, scope: "company" }; return { actions: Array.isArray(entry.actions) ? entry.actions : [], scope: entry.scope || "company" }; }
function permissionsToPlainObject(permissions) { if (!permissions) return {}; const source = permissions instanceof Map ? Object.fromEntries(permissions.entries()) : permissions; return Object.entries(source).reduce((acc, [k, v]) => { acc[normalizeKey(k)] = normalizeEntry(v); return acc; }, {}); }
function fallbackPermissions(role) { return permissionsToPlainObject(DEFAULT_ROLE_PERMISSIONS[normalizeRoleName(role)] || { dashboard: { actions: ["view"], scope: "own" } }); }
function candidateKeys(moduleKey) { const key = normalizeKey(moduleKey); const dash = key.replace(/_/g, "-"); const under = key.replace(/-/g, "_"); return Array.from(new Set([key, dash, under, ...(MODULE_ALIASES[key] || []), ...(MODULE_ALIASES[dash] || [])])); }

async function findRoleForUser(user) {
  if (!user) return null;
  if (user.roleId) { const byId = await Role.findById(user.roleId).lean().catch(() => null); if (byId) return byId; }
  const companyId = String(user.companyId || "").trim();
  const key = normalizeKey(user.roleKey || user.role);
  const name = normalizeRoleName(user.role);
  const q = { status: "active", $or: [{ key }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] };
  if (companyId) q.$and = [{ $or: [{ companyId }, { companyId: { $in: [null, ""] } }] }];
  return Role.findOne(q).sort({ companyId: -1, isSystemRole: -1 }).lean().catch(() => null);
}

async function getUserPermissionProfile(user) {
  const role = await findRoleForUser(user);
  const userPermissions = permissionsToPlainObject(user?.permissions || {});
  const rolePermissions = role ? permissionsToPlainObject(role.permissions) : {};
  const permissions = Object.keys(userPermissions).length ? userPermissions : Object.keys(rolePermissions).length ? rolePermissions : fallbackPermissions(user?.role);
  const isAdmin = ADMIN_ROLES.has(normalizeRoleName(user?.role));
  return {
    roleId: role?._id || user?.roleId || null,
    roleName: role?.name || user?.role || "User",
    roleKey: role?.key || normalizeKey(user?.role),
    portalType: user?.portalType || role?.portalType || inferPortalType(user?.role),
    permissions,
    enabledModules: Array.isArray(user?.enabledModules) && user.enabledModules.length ? user.enabledModules : role?.enabledModules?.length ? role.enabledModules : isAdmin ? ["*"] : getAllowedModulesForRole(user?.role, user?.erpTemplateKey || user?.businessType),
    mobileAccess: Boolean(user?.mobileAccess || role?.mobileAccess),
    mobileModules: Array.isArray(user?.mobileModules) && user.mobileModules.length ? user.mobileModules : role?.mobileModules || [],
    landingPath: user?.landingPath || role?.landingPath || getLandingPathForRole(user?.role, user?.erpTemplateKey || user?.businessType),
  };
}

function hasPermission(permissions, moduleKey, action = "view") {
  const map = permissionsToPlainObject(permissions);
  const requested = normalizeKey(action);
  const wildcard = map["*"];
  if (wildcard?.actions?.includes("*") || wildcard?.actions?.map(normalizeKey).includes(requested)) return true;
  return candidateKeys(moduleKey).some((key) => {
    const entry = map[key];
    if (!entry) return false;
    const actions = (entry.actions || []).map(normalizeKey);
    return actions.includes("*") || actions.includes(requested);
  });
}

function isSystemUser(user = {}, profile = {}) {
  const role = normalizeRoleName(profile.roleName || user.role || user.portalType || user.roleKey);
  return ["admin", "system admin", "super admin"].includes(role) || normalizeKey(profile.portalType || user.portalType).includes("system");
}

async function listVisibleModules(user) {
  const profile = await getUserPermissionProfile(user);
  const modules = await PortalModule.find({ status: "active", webEnabled: true }).sort({ order: 1, name: 1 }).lean().catch(() => []);
  const erpKey = normalizeErpType(user?.erpTemplateKey || user?.businessType || profile?.erpTemplateKey || "distribution_erp");
  const subscriptionAllowed = Array.isArray(user?.subscription?.allowedModules) ? user.subscription.allowedModules : [];
  const companyAllowed = Array.isArray(user?.enabledModules) ? user.enabledModules : [];
  const allowedByPlan = Array.from(new Set([...subscriptionAllowed, ...companyAllowed].filter(Boolean)));
  const erpAllowed = isSystemUser(user, profile) ? null : new Set([...(ERP_MODULE_SETS[erpKey] || ERP_MODULE_SETS.distribution_erp || []), "dashboard", "settings"]);
  const planAllowed = !isSystemUser(user, profile) && allowedByPlan.length ? new Set([...allowedByPlan, "dashboard", "settings"]) : null;
  return modules.filter((m) => {
    if (erpAllowed && !erpAllowed.has(m.key)) return false;
    if (planAllowed && !planAllowed.has(m.key)) return false;
    return profile.enabledModules.includes("*") || profile.enabledModules.includes(m.key) || hasPermission(profile.permissions, m.key, "view");
  });
}
module.exports = { normalizeKey, normalizeRoleName, inferPortalType, permissionsToPlainObject, getUserPermissionProfile, hasPermission, listVisibleModules, candidateKeys };
