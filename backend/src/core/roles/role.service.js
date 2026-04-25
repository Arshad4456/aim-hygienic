const Role = require("../../models/Role");
const { normalizeKey, permissionsToPlainObject } = require("../permissions/permission.service");

function makeRoleKey(name) { return normalizeKey(name).replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, ""); }
function buildPayload(payload = {}, user = {}) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Role name is required");
  const permissions = permissionsToPlainObject(payload.permissions || {});
  return {
    companyId: String(payload.companyId || user.companyId || "").trim(),
    erpTemplateKey: payload.erpTemplateKey || user.erpTemplateKey || "distribution_erp",
    name,
    key: makeRoleKey(payload.key || name),
    description: payload.description || "",
    portalType: payload.portalType || makeRoleKey(name),
    permissions,
    enabledModules: Array.isArray(payload.enabledModules) ? payload.enabledModules : Object.keys(permissions),
    landingPath: payload.landingPath || "/portals",
    mobileAccess: Boolean(payload.mobileAccess),
    mobileModules: Array.isArray(payload.mobileModules) ? payload.mobileModules : [],
    isSystemRole: Boolean(payload.isSystemRole),
    status: payload.status || "active",
  };
}
async function listRoles(query = {}, user = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  const companyId = String(query.companyId || user.companyId || "").trim();
  if (companyId) filter.$or = [{ companyId }, { companyId: { $in: [null, ""] } }];
  if (query.erpTemplateKey) filter.erpTemplateKey = query.erpTemplateKey;
  return Role.find(filter).sort({ isSystemRole: -1, name: 1 }).lean();
}
async function createRole(payload, user = {}) {
  const data = buildPayload(payload, user);
  const exists = await Role.findOne({ companyId: data.companyId, key: data.key }).lean();
  if (exists) throw new Error("Role already exists for this company");
  return Role.create({ ...data, createdBy: user.uid || user._id });
}
async function updateRole(id, payload, user = {}) {
  const data = buildPayload({ ...payload, name: payload.name || payload.currentName || "Role" }, user);
  delete data.companyId; delete data.key;
  const role = await Role.findByIdAndUpdate(id, { ...data, updatedBy: user.uid || user._id }, { new: true });
  if (!role) throw new Error("Role not found");
  return role;
}
async function deleteRole(id) {
  const role = await Role.findByIdAndUpdate(id, { status: "inactive" }, { new: true });
  if (!role) throw new Error("Role not found");
  return role;
}
module.exports = { listRoles, createRole, updateRole, deleteRole, makeRoleKey };
