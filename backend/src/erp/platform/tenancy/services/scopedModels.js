const mongoose = require("mongoose");
const Company = require("../../companies/models/Company");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

function asText(value) {
  return String(value || "").trim();
}

function normalizeRole(value) {
  return asText(value).toLowerCase();
}

function isSystemLevelAdmin(roleOrUser) {
  const role = typeof roleOrUser === "object" && roleOrUser ? (roleOrUser.role || roleOrUser.roleKey || roleOrUser.portalType) : roleOrUser;
  const normalized = normalizeRole(role);
  const portalType = typeof roleOrUser === "object" && roleOrUser ? normalizeRole(roleOrUser.portalType) : "";
  const roleKey = typeof roleOrUser === "object" && roleOrUser ? normalizeRole(roleOrUser.roleKey) : "";
  return ["admin", "system admin", "super admin", "super_admin", "system_admin"].includes(normalized) || portalType === "system_admin" || roleKey === "super_admin";
}

function scopedCompanyId(req = {}, payload = {}) {
  const requested = asText(payload.companyId || req.body?.companyId || req.query?.companyId || req.user?.companyId);
  if (isSystemLevelAdmin(req.user || {})) return requested;
  return asText(req.user?.companyId);
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = asText(companyId);
  const normalizedCompanyName = asText(companyName);

  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");

  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedModels(req, registry = {}, options = {}) {
  const requestedCompanyId = asText(options.companyId || req.body?.companyId || req.query?.companyId || req.user?.companyId);
  const requestedCompanyName = asText(options.companyName || req.body?.companyName || req.query?.companyName || req.user?.companyName);

  const companyScopeId = isSystemLevelAdmin(req.user || {}) ? requestedCompanyId : asText(req.user?.companyId);
  const companyScopeName = isSystemLevelAdmin(req.user || {}) ? requestedCompanyName : asText(req.user?.companyName);

  if (!companyScopeId) return registry;

  const dbName = await resolveTenantDbName(companyScopeId, companyScopeName);
  if (!dbName) return registry;

  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return Object.fromEntries(
    Object.entries(registry).map(([key, baseModel]) => [key, getModelFromDb(tenantDb, baseModel)])
  );
}

module.exports = {
  asText,
  normalizeRole,
  isSystemLevelAdmin,
  scopedCompanyId,
  resolveTenantDbName,
  getScopedModels,
};
