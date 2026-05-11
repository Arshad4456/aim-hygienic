const User = require("../../users/models/User");
const {
  getTenantModel,
  queryAcrossTenantModels,
  findTenantDocById,
} = require("./tenantModels");

function toTenantPayload(user) {
  const plain = typeof user?.toObject === "function" ? user.toObject() : { ...(user || {}) };
  delete plain.passwordHash;
  return plain;
}

async function createUserInTenant(payload) {
  const companyId = String(payload?.companyId || "").trim();
  if (!companyId) throw new Error("Company is required for tenant user creation");
  const Model = await getTenantModel(User, companyId, payload?.companyName || "");
  if (!Model) throw new Error("Tenant database not found");
  return Model.create(payload);
}

async function updateUserInTenant(id, payload, companyId, companyName = "") {
  const Model = await getTenantModel(User, companyId, companyName);
  if (!Model) return null;
  return Model.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).select("-passwordHash");
}

async function deleteUserFromTenant(id, companyId, companyName = "") {
  const Model = await getTenantModel(User, companyId, companyName);
  if (!Model) return null;
  return Model.findByIdAndDelete(id);
}

async function syncUserToTenant(user) {
  const payload = typeof user?.toObject === "function" ? user.toObject() : { ...(user || {}) };
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;
  const Model = await getTenantModel(User, companyId, payload.companyName || "");
  if (!Model) return;
  await Model.updateOne({ _id: payload._id }, { $set: { ...payload, syncedAt: new Date() } }, { upsert: true });
}

async function removeUserFromTenant(user) {
  const payload = toTenantPayload(user);
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;
  const Model = await getTenantModel(User, companyId, payload.companyName || "");
  if (!Model) return;
  await Model.deleteOne({ _id: payload._id });
}

async function listTenantUsersByCompany(companyId) {
  if (!String(companyId || "").trim()) return [];
  return queryAcrossTenantModels(User, { companyId: String(companyId).trim() }, { sort: { createdAt: -1 } });
}

async function findTenantUserById(id, companyId = "", companyName = "", options = {}) {
  const select = Object.prototype.hasOwnProperty.call(options, "select") ? options.select : "-passwordHash";
  return findTenantDocById(User, id, companyId, companyName, { select });
}

module.exports = {
  createUserInTenant,
  updateUserInTenant,
  deleteUserFromTenant,
  syncUserToTenant,
  removeUserFromTenant,
  listTenantUsersByCompany,
  findTenantUserById,
};
