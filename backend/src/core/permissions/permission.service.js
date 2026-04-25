const Role = require("../../models/Role");
const PortalModule = require("../../models/PortalModule");
const { DEFAULT_ROLE_PERMISSIONS, ADMIN_ROLES } = require("./permission.constants");

function normalizeKey(value) { return String(value || "").trim().toLowerCase(); }
function normalizeRoleName(value) { return normalizeKey(value).replace(/_/g, " "); }
function inferPortalType(role) { const r = normalizeRoleName(role); if (["admin", "system admin", "super admin"].includes(r)) return "system_admin"; if (r === "company admin") return "company_admin"; return r.replace(/\s+/g, "_") || "company_user"; }
function normalizeEntry(entry) { if (!entry) return { actions: [], scope: "company" }; if (Array.isArray(entry)) return { actions: entry, scope: "company" }; return { actions: Array.isArray(entry.actions) ? entry.actions : [], scope: entry.scope || "company" }; }
function permissionsToPlainObject(permissions) { if (!permissions) return {}; const source = permissions instanceof Map ? Object.fromEntries(permissions.entries()) : permissions; return Object.entries(source).reduce((acc, [k, v]) => { acc[normalizeKey(k)] = normalizeEntry(v); return acc; }, {}); }
function fallbackPermissions(role) { return permissionsToPlainObject(DEFAULT_ROLE_PERMISSIONS[normalizeRoleName(role)] || { dashboard: { actions: ["view"], scope: "own" } }); }

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
  const rolePermissions = role ? permissionsToPlainObject(role.permissions) : {};
  const permissions = Object.keys(rolePermissions).length ? rolePermissions : fallbackPermissions(user?.role);
  const isAdmin = ADMIN_ROLES.has(normalizeRoleName(user?.role));
  return {
    roleId: role?._id || user?.roleId || null,
    roleName: role?.name || user?.role || "User",
    roleKey: role?.key || normalizeKey(user?.role),
    portalType: user?.portalType || role?.portalType || inferPortalType(user?.role),
    permissions,
    enabledModules: role?.enabledModules?.length ? role.enabledModules : isAdmin ? ["*"] : Object.keys(permissions).filter((k) => k !== "*"),
    mobileAccess: Boolean(role?.mobileAccess || user?.mobileAccess),
    mobileModules: role?.mobileModules || user?.mobileModules || [],
    landingPath: role?.landingPath || user?.landingPath || "/portals",
  };
}

function hasPermission(permissions, moduleKey, action = "view") {
  const map = permissionsToPlainObject(permissions);
  const wildcard = map["*"];
  if (wildcard?.actions?.includes("*") || wildcard?.actions?.includes(action)) return true;
  const entry = map[normalizeKey(moduleKey)];
  if (!entry) return false;
  return entry.actions.includes("*") || entry.actions.map(normalizeKey).includes(normalizeKey(action));
}

async function listVisibleModules(user) {
  const profile = await getUserPermissionProfile(user);
  const modules = await PortalModule.find({ status: "active", webEnabled: true }).sort({ order: 1, name: 1 }).lean().catch(() => []);
  return modules.filter((m) => profile.enabledModules.includes("*") || hasPermission(profile.permissions, m.key, "view"));
}

module.exports = { normalizeKey, normalizeRoleName, inferPortalType, permissionsToPlainObject, getUserPermissionProfile, hasPermission, listVisibleModules };
