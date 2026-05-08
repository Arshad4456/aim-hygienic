const Role = require("../../models/Role");
const User = require("../../models/User");
const PortalModule = require("../../models/PortalModule");
const { normalizeKey, permissionsToPlainObject } = require("../permissions/permission.service");
const { getDefaultRoleBlueprints } = require("../permissions/permission.constants");
const { ensureDefaultModules } = require("../portal-modules/portalModule.service");

function makeRoleKey(name) {
  return normalizeKey(name).replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, "");
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function getPermissionModuleKeys(permissions = {}) {
  return Object.keys(permissionsToPlainObject(permissions)).filter((key) => key && key !== "*");
}

function buildPayload(payload = {}, user = {}) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Role name is required");
  const permissions = permissionsToPlainObject(payload.permissions || {});
  const permissionKeys = getPermissionModuleKeys(permissions);
  return {
    companyId: String(payload.companyId ?? user.companyId ?? "").trim(),
    erpTemplateKey: String(payload.erpTemplateKey || user.erpTemplateKey || "distribution_erp").trim(),
    name,
    key: makeRoleKey(payload.key || name),
    description: String(payload.description || "").trim(),
    portalType: String(payload.portalType || makeRoleKey(name) || "company_user").trim(),
    permissions,
    enabledModules: normalizeList(payload.enabledModules).length ? normalizeList(payload.enabledModules) : permissionKeys,
    landingPath: String(payload.landingPath || "/portals").trim(),
    mobileAccess: Boolean(payload.mobileAccess),
    mobileModules: normalizeList(payload.mobileModules),
    isSystemRole: Boolean(payload.isSystemRole),
    status: payload.status === "inactive" ? "inactive" : "active",
  };
}

function systemRoleCompanyFilter(companyId) {
  return companyId ? [{ companyId }, { companyId: { $in: [null, ""] } }] : [{}];
}

async function listRoles(query = {}, user = {}) {
  await seedDefaultRoles({ companyId: query.companyId || user.companyId || "", erpTemplateKey: query.erpTemplateKey || user.erpTemplateKey || "distribution_erp" }).catch(() => null);
  const filter = {};
  if (query.status) filter.status = query.status;
  const companyId = String(query.companyId || user.companyId || "").trim();
  if (companyId) filter.$or = systemRoleCompanyFilter(companyId);
  if (query.erpTemplateKey) filter.erpTemplateKey = query.erpTemplateKey;
  const roles = await Role.find(filter).sort({ isSystemRole: -1, name: 1 }).lean();
  if (String(query.withUserCount || "").toLowerCase() !== "true") return roles;
  const counts = await User.aggregate([{ $match: companyId ? { companyId } : {} }, { $group: { _id: "$roleId", total: { $sum: 1 } } }]).catch(() => []);
  const byRoleId = Object.fromEntries(counts.map((row) => [String(row._id || ""), row.total]));
  return roles.map((role) => ({ ...role, userCount: byRoleId[String(role._id)] || 0 }));
}

async function listRoleOptions(query = {}, user = {}) {
  const roles = await listRoles(query, user);
  return roles.map((role) => ({
    _id: role._id,
    id: role._id,
    name: role.name,
    key: role.key,
    portalType: role.portalType,
    landingPath: role.landingPath,
    companyId: role.companyId || "",
    erpTemplateKey: role.erpTemplateKey || "distribution_erp",
    mobileAccess: Boolean(role.mobileAccess),
    mobileModules: role.mobileModules || [],
    permissions: role.permissions || {},
    enabledModules: role.enabledModules || [],
    status: role.status,
    isSystemRole: Boolean(role.isSystemRole),
  }));
}

async function createRole(payload, user = {}) {
  const data = buildPayload(payload, user);
  const exists = await Role.findOne({ companyId: data.companyId, key: data.key }).lean();
  if (exists) throw new Error("Role already exists for this company");
  return Role.create({ ...data, createdBy: user.uid || user._id });
}

async function updateRole(id, payload, user = {}) {
  const existing = await Role.findById(id);
  if (!existing) throw new Error("Role not found");
  const data = buildPayload({ ...existing.toObject(), ...payload, name: payload.name || existing.name }, user);
  delete data.companyId;
  if (existing.isSystemRole && payload.key && payload.key !== existing.key) delete data.key;
  if (!existing.isSystemRole) existing.key = data.key;
  existing.name = data.name;
  existing.description = data.description;
  existing.erpTemplateKey = data.erpTemplateKey;
  existing.portalType = data.portalType;
  existing.permissions = data.permissions;
  existing.enabledModules = data.enabledModules;
  existing.landingPath = data.landingPath;
  existing.mobileAccess = data.mobileAccess;
  existing.mobileModules = data.mobileModules;
  existing.status = data.status;
  existing.updatedBy = user.uid || user._id;
  return existing.save();
}

async function deleteRole(id) {
  const role = await Role.findById(id);
  if (!role) throw new Error("Role not found");
  if (role.isSystemRole) throw new Error("System roles cannot be deleted. Set them inactive instead.");
  const userCount = await User.countDocuments({ roleId: role._id }).catch(() => 0);
  if (userCount) throw new Error("Role is assigned to users and cannot be deleted");
  await role.deleteOne();
  return role;
}

async function seedDefaultRoles(options = {}) {
  await ensureDefaultModules().catch(() => null);
  const modules = await PortalModule.find({ status: "active" }).select("key mobileEnabled").lean().catch(() => []);
  const validModuleKeys = new Set(modules.map((m) => m.key));
  const mobileKeys = new Set(modules.filter((m) => m.mobileEnabled).map((m) => m.key));
  const companyId = String(options.companyId || "").trim();
  const erpTemplateKey = String(options.erpTemplateKey || "distribution_erp").trim();
  const rows = [];
  for (const blueprint of getDefaultRoleBlueprints(erpTemplateKey, !companyId)) {
    const permissions = permissionsToPlainObject(blueprint.permissions || {});
    const blueprintModules = Array.isArray(blueprint.enabledModules) ? blueprint.enabledModules : [];
    const enabledModules = blueprintModules.length
      ? blueprintModules.filter((key) => validModuleKeys.has(key) || key === "dashboard" || key === "*")
      : Object.keys(permissions).includes("*")
        ? ["*"]
        : Object.keys(permissions).filter((key) => validModuleKeys.has(key) || key === "dashboard");
    const mobileModules = blueprint.mobileAccess
      ? (Array.isArray(blueprint.mobileModules) && blueprint.mobileModules.length ? blueprint.mobileModules : enabledModules).filter((key) => mobileKeys.has(key) || ["dashboard", "customers", "secondary-sales-orders", "receipts", "deliveries", "live-tracking", "retail-pos", "manufacturing", "service", "trading"].includes(key))
      : [];
    const data = {
      companyId: companyId || "",
      erpTemplateKey,
      name: blueprint.name,
      key: blueprint.key,
      description: blueprint.description || `${blueprint.name} default Rawyan ERP role`,
      portalType: blueprint.portalType,
      permissions,
      enabledModules,
      landingPath: blueprint.landingPath || "/portals",
      mobileAccess: Boolean(blueprint.mobileAccess),
      mobileModules,
      isSystemRole: true,
      status: "active",
    };
    const { companyId: seedCompanyId, key: seedKey, ...seedUpdates } = data;
    const role = await Role.findOneAndUpdate(
      { companyId: seedCompanyId, key: seedKey },
      {
        $set: seedUpdates,
        $setOnInsert: { companyId: seedCompanyId, key: seedKey },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    rows.push(role);
  }
  return rows;
}

module.exports = { listRoles, listRoleOptions, createRole, updateRole, deleteRole, seedDefaultRoles, buildPayload, makeRoleKey };
