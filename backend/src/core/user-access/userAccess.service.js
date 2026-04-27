const User = require("../../models/User");
const Role = require("../../models/Role");
const Company = require("../../models/Company");
const { findTenantDocById, listAllTenantTargets } = require("../../utils/tenantModels");
const { listTenantUsersByCompany, updateUserInTenant, createUserInTenant } = require("../../utils/tenantUsers");
const { hashPassword } = require("../../utils/passwordHash");
const { normalizeKey, permissionsToPlainObject } = require("../permissions/permission.service");

function text(value) { return String(value || "").trim(); }
function lower(value) { return text(value).toLowerCase(); }
function roleText(user) { return lower(user?.role || user?.roleName || user?.portalType); }
function isSystemAdmin(user) { return ["admin", "system admin", "super admin"].includes(roleText(user)) || lower(user?.portalType) === "system_admin" || lower(user?.roleKey) === "super_admin"; }
function isCompanyAdmin(user) { return roleText(user) === "company admin" || user?.portalType === "company_admin"; }
function isDistributor(user) { return roleText(user) === "distributor" || user?.portalType === "distributor"; }
function sanitizeUser(user = {}) { const plain = typeof user.toObject === "function" ? user.toObject() : { ...user }; delete plain.passwordHash; delete plain.password; return plain; }
function escapeRegex(value) { return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function makeUserId(prefix = "USR") { return `${prefix}-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`; }

function canSeeUser(target, actor = {}) {
  if (!target) return false;
  if (isSystemAdmin(actor)) return true;
  const actorCompany = text(actor.companyId);
  if (actorCompany && text(target.companyId) && actorCompany !== text(target.companyId)) return false;
  if (isDistributor(actor)) {
    const role = roleText(target);
    if (!["salesman", "order booker", "orderbooker", "customer"].includes(role)) return false;
    const distributorId = text(actor.distributorId || actor.userId || actor.uid);
    if (distributorId && text(target.distributorId) && distributorId !== text(target.distributorId)) return false;
  }
  return Boolean(actorCompany || isCompanyAdmin(actor) || isDistributor(actor));
}

function canCreateRole(roleName, actor = {}) {
  const role = roleText({ role: roleName });
  if (isSystemAdmin(actor)) return true;
  if (isCompanyAdmin(actor)) return !["admin", "system admin", "super admin"].includes(role);
  if (isDistributor(actor)) return ["salesman", "order booker", "orderbooker", "customer"].includes(role);
  return false;
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
  if (roleFilter) rows = rows.filter((user) => roleText(user) === roleFilter || lower(user.roleKey) === roleFilter);
  if (statusFilter) rows = rows.filter((user) => lower(user.status || "active") === statusFilter);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    rows = rows.filter((user) => rx.test(user.fullName || "") || rx.test(user.username || "") || rx.test(user.mobile || user.mobileNumber || "") || rx.test(user.userId || "") || rx.test(user.companyName || ""));
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

async function resolveCompany(companyId = "") {
  const clean = text(companyId);
  if (!clean) return null;
  return Company.findOne({ companyId: clean }).lean();
}

async function assertNoDuplicateIdentity({ username, mobile, companyId }) {
  const normalizedUsername = lower(username);
  const normalizedMobile = text(mobile);
  const duplicateRoot = await User.findOne({
    $or: [
      ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
      ...(normalizedMobile ? [{ mobile: normalizedMobile }, { mobileNumber: normalizedMobile }] : []),
    ],
  }).lean().catch(() => null);
  if (duplicateRoot) throw new Error("A user with this username/mobile already exists");

  if (companyId) {
    const tenantUsers = await listTenantUsersByCompany(companyId).catch(() => []);
    const exists = tenantUsers.some((user) => (normalizedUsername && lower(user.username) === normalizedUsername) || (normalizedMobile && [text(user.mobile), text(user.mobileNumber)].includes(normalizedMobile)));
    if (exists) throw new Error("A company user with this username/mobile already exists");
  }
}

async function createUser(payload = {}, actor = {}) {
  const isRootAdmin = isSystemAdmin(actor);
  const fullName = text(payload.fullName || payload.name);
  const username = lower(payload.username || payload.mobile || payload.email);
  const mobile = text(payload.mobile || payload.mobileNumber || payload.phoneNumber);
  const email = lower(payload.email);
  const password = text(payload.password || payload.initialPassword);
  if (!fullName) throw new Error("Full name is required");
  if (!username && !mobile) throw new Error("Username or mobile is required");
  if (!password || password.length < 4) throw new Error("Initial password is required and must be at least 4 characters");

  let companyId = text(payload.companyId);
  let companyName = text(payload.companyName);
  if (!isRootAdmin) {
    companyId = text(actor.companyId);
    companyName = text(actor.companyName);
  }

  const role = payload.roleId ? await resolveRole(payload.roleId, actor) : null;
  const roleName = text(payload.role || role?.name || (companyId ? "Company User" : "System Admin"));
  if (!canCreateRole(roleName, actor)) throw new Error("You cannot create this role from your portal");

  if (companyId && !companyName) {
    const company = await resolveCompany(companyId);
    companyName = text(company?.name || companyId);
  }

  await assertNoDuplicateIdentity({ username, mobile, companyId });

  const roleAccess = role ? accessPayloadFromRole(role, payload) : {
    role: roleName,
    roleKey: normalizeKey(roleName),
    portalType: text(payload.portalType || (companyId ? "company_user" : "system_admin")),
    landingPath: text(payload.landingPath || (companyId ? "/portals" : "/portals/system-admin")),
    permissions: payload.permissions ? permissionsToPlainObject(payload.permissions) : (companyId ? {} : { "*": { actions: ["*"], scope: "all" } }),
    enabledModules: Array.isArray(payload.enabledModules) ? payload.enabledModules : (companyId ? [] : ["*"]),
    mobileAccess: Boolean(payload.mobileAccess),
    mobileModules: Array.isArray(payload.mobileModules) ? payload.mobileModules : [],
    erpTemplateKey: text(payload.erpTemplateKey || actor.erpTemplateKey || "distribution_erp"),
  };

  const document = {
    fullName,
    username: username || mobile,
    mobile,
    mobileNumber: mobile,
    phoneNumber: text(payload.phoneNumber || mobile),
    email,
    passwordHash: await hashPassword(password),
    status: payload.status === "inactive" || payload.status === "deactive" ? payload.status : "active",
    companyId,
    companyName,
    companyBranchId: text(payload.companyBranchId || payload.branchId),
    branchId: text(payload.branchId || payload.companyBranchId),
    branchNameOrNumber: text(payload.branchNameOrNumber || payload.branchName),
    warehouseId: text(payload.warehouseId),
    warehouseName: text(payload.warehouseName),
    regionId: text(payload.regionId),
    regionName: text(payload.regionName),
    zoneId: text(payload.zoneId),
    zoneName: text(payload.zoneName),
    territoryId: text(payload.territoryId || payload.areaId),
    territoryName: text(payload.territoryName || payload.areaName),
    distributorId: text(payload.distributorId || (isDistributor(actor) ? actor.distributorId || actor.userId || actor.uid : "")),
    distributorName: text(payload.distributorName || (isDistributor(actor) ? actor.fullName || actor.username : "")),
    userId: text(payload.userId) || makeUserId(roleAccess.roleKey || "USR"),
    ...roleAccess,
  };

  const created = companyId ? await createUserInTenant(document) : await User.create(document);
  return sanitizeUser(created);
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

module.exports = { listUsers, getUser, createUser, updateUserAccess, assignRole, setStatus };
