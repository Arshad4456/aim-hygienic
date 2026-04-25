const User = require("../../models/User");
const Role = require("../../models/Role");
const { getTenantModel, listAllTenantTargets, findTenantDocById } = require("../../utils/tenantModels");
const { listTenantUsersByCompany, updateUserInTenant } = require("../../utils/tenantUsers");
const { normalizeKey, permissionsToPlainObject } = require("../permissions/permission.service");

function text(value) { return String(value || "").trim(); }
function lower(value) { return text(value).toLowerCase(); }
function roleText(user) { return lower(user?.role || user?.roleName || user?.portalType); }
function isSystemAdmin(user) { return ["admin", "system admin", "super admin"].includes(roleText(user)); }
function isCompanyAdmin(user) { return roleText(user) === "company admin" || user?.portalType === "company_admin"; }
function isDistributor(user) { return roleText(user) === "distributor" || user?.portalType === "distributor"; }
function sanitizeUser(user = {}) { const plain = typeof user.toObject === "function" ? user.toObject() : { ...user }; delete plain.passwordHash; delete plain.password; return plain; }
function escapeRegex(value) { return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function canSeeUser(target, actor = {}) {
  if (!target) return false;
  if (isSystemAdmin(actor)) return true;
  const actorCompany = text(actor.companyId);
  if (actorCompany && text(target.companyId) && actorCompany !== text(target.companyId)) return false;
  if (isDistributor(actor)) {
    const role = roleText(target);
    if (!["salesman", "order booker", "orderbooker", "customer"].includes(role)) return false;
    const territoryId = text(actor.territoryId);
    const territoryName = lower(actor.territoryName || actor.areaName);
    if (territoryId && text(target.territoryId) && territoryId !== text(target.territoryId)) return false;
    if (territoryName && lower(target.territoryName || target.areaName) && territoryName !== lower(target.territoryName || target.areaName)) return false;
  }
  return Boolean(actorCompany || isCompanyAdmin(actor) || isDistributor(actor));
}

async function findUserWithModel(id, actor = {}) {
  const companyId = text(actor.companyId);
  if (companyId) {
    const tenant = await findTenantDocById(User, id, companyId, actor.companyName || "", { select: "-passwordHash", lean: false });
    if (tenant?.doc) return { user: tenant.doc, Model: tenant.Model, isTenant: true, companyId: tenant.companyId, companyName: tenant.companyName };
  }
  const root = await User.findById(id).select("-passwordHash");
  if (root) return { user: root, Model: User, isTenant: false, companyId: text(root.companyId), companyName: text(root.companyName) };
  const tenant = await findTenantDocById(User, id, "", "", { select: "-passwordHash", lean: false });
  if (tenant?.doc) return { user: tenant.doc, Model: tenant.Model, isTenant: true, companyId: tenant.companyId, companyName: tenant.companyName };
  return { user: null, Model: null, isTenant: false };
}

async function listUsers(query = {}, actor = {}) {
  const roleFilter = lower(query.role);
  const statusFilter = lower(query.status);
  const search = text(query.search);
  const companyId = text(query.companyId || actor.companyId);
  let rows = [];

  if (companyId) rows = await listTenantUsersByCompany(companyId);
  else if (isSystemAdmin(actor)) {
    const rootUsers = await User.find({}).select("-passwordHash").sort({ createdAt: -1 }).lean();
    rows.push(...rootUsers);
    for (const target of await listAllTenantTargets()) rows.push(...await listTenantUsersByCompany(target.companyId));
  }

  rows = rows.map(sanitizeUser).filter((user) => canSeeUser(user, actor));
  if (roleFilter) rows = rows.filter((user) => roleText(user) === roleFilter);
  if (statusFilter) rows = rows.filter((user) => lower(user.status || "active") === statusFilter);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    rows = rows.filter((user) => rx.test(user.fullName || "") || rx.test(user.username || "") || rx.test(user.mobile || user.mobileNumber || "") || rx.test(user.userId || ""));
  }
  const seen = new Set();
  return rows.filter((user) => { const key = String(user._id || user.userId || user.mobile); if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function getUser(id, actor = {}) {
  const found = await findUserWithModel(id, actor);
  if (!found.user) throw new Error("User not found");
  const plain = sanitizeUser(found.user);
  if (!canSeeUser(plain, actor)) throw new Error("Forbidden");
  return plain;
}

async function resolveRole(roleId, actor = {}) {
  const role = await Role.findById(roleId).lean();
  if (!role) throw new Error("Role not found");
  const actorCompany = text(actor.companyId);
  if (!isSystemAdmin(actor) && role.companyId && actorCompany && text(role.companyId) !== actorCompany) throw new Error("Role does not belong to this company");
  return role;
}

function accessPayloadFromRole(role, overrides = {}) {
  const permissions = overrides.permissions ? permissionsToPlainObject(overrides.permissions) : permissionsToPlainObject(role.permissions || {});
  const enabledModules = Array.isArray(overrides.enabledModules) ? overrides.enabledModules : role.enabledModules || Object.keys(permissions);
  const mobileModules = Array.isArray(overrides.mobileModules) ? overrides.mobileModules : role.mobileModules || [];
  return {
    roleId: role._id,
    role: role.name,
    roleKey: role.key || normalizeKey(role.name),
    portalType: overrides.portalType || role.portalType || normalizeKey(role.name),
    landingPath: overrides.landingPath || role.landingPath || "/portals",
    permissions,
    enabledModules,
    mobileAccess: typeof overrides.mobileAccess === "boolean" ? overrides.mobileAccess : Boolean(role.mobileAccess),
    mobileModules,
    erpTemplateKey: role.erpTemplateKey || overrides.erpTemplateKey,
  };
}

async function updateUserAccess(id, payload = {}, actor = {}) {
  const found = await findUserWithModel(id, actor);
  if (!found.user) throw new Error("User not found");
  const plain = sanitizeUser(found.user);
  if (!canSeeUser(plain, actor)) throw new Error("Forbidden");
  const update = {};
  if (payload.roleId) Object.assign(update, accessPayloadFromRole(await resolveRole(payload.roleId, actor), payload));
  else {
    if (payload.permissions) update.permissions = permissionsToPlainObject(payload.permissions);
    if (Array.isArray(payload.enabledModules)) update.enabledModules = payload.enabledModules;
    if (typeof payload.mobileAccess === "boolean") update.mobileAccess = payload.mobileAccess;
    if (Array.isArray(payload.mobileModules)) update.mobileModules = payload.mobileModules;
    if (payload.portalType) update.portalType = payload.portalType;
    if (payload.landingPath) update.landingPath = payload.landingPath;
  }
  if (payload.status) update.status = payload.status;
  if (!Object.keys(update).length) throw new Error("No access changes provided");
  const updated = found.isTenant
    ? await updateUserInTenant(id, { $set: update }, found.companyId, found.companyName)
    : await User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).select("-passwordHash");
  return sanitizeUser(updated);
}

async function assignRole(id, roleId, actor = {}) { return updateUserAccess(id, { roleId }, actor); }
async function setStatus(id, status, actor = {}) { return updateUserAccess(id, { status }, actor); }

module.exports = { listUsers, getUser, updateUserAccess, assignRole, setStatus };
