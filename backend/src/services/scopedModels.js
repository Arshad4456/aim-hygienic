const mongoose = require("mongoose");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

function asText(value) {
  return String(value || "").trim();
}

function normalizeRole(value) {
  return asText(value).toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
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

  const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? requestedCompanyId : asText(req.user?.companyId);
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role) ? requestedCompanyName : asText(req.user?.companyName);

  if (!scopedCompanyId) return registry;

  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
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
  getScopedModels,
};