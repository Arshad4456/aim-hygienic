const mongoose = require("mongoose");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("./tenantDatabases");

function normalize(value) {
  return String(value || "").trim();
}

async function resolveTenantDbName(companyId, fallbackCompanyName = "") {
  const normalizedCompanyId = normalize(companyId);
  const normalizedFallbackName = normalize(fallbackCompanyName);
  if (!normalizedCompanyId && !normalizedFallbackName) return "";
  if (normalizedFallbackName) {
    return toTenantDatabaseName(normalizedFallbackName, normalizedCompanyId || "company");
  }
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name companyId").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  const collectionName = baseModel.collection?.name;
  return db.models[modelName] || db.model(modelName, baseModel.schema, collectionName);
}

async function getTenantDb(companyId, companyName = "") {
  const dbName = await resolveTenantDbName(companyId, companyName);
  if (!dbName) return null;
  return mongoose.connection.useDb(dbName, { useCache: true });
}

async function getTenantModel(baseModel, companyId, companyName = "") {
  const db = await getTenantDb(companyId, companyName);
  if (!db) return null;
  return getModelFromDb(db, baseModel);
}

async function listAllTenantTargets() {
  const companies = await Company.find({ companyId: { $exists: true, $ne: "" } }).select("companyId name").lean();
  const deduped = [];
  const seen = new Set();
  for (const company of companies) {
    const companyId = normalize(company?.companyId);
    if (!companyId || seen.has(companyId)) continue;
    seen.add(companyId);
    deduped.push({ companyId, companyName: normalize(company?.name) });
  }
  return deduped;
}

async function queryAcrossTenantModels(baseModel, query = {}, options = {}) {
  const {
    select,
    sort,
    limit = 0,
    lean = true,
    single = false,
  } = options;

  const requestedCompanyId = normalize(query.companyId);
  const targets = requestedCompanyId
    ? [{ companyId: requestedCompanyId, companyName: normalize(query.companyName) }]
    : await listAllTenantTargets();

  const results = [];
  for (const target of targets) {
    const Model = await getTenantModel(baseModel, target.companyId, target.companyName);
    if (!Model) continue;
    let cursor = single ? Model.findOne(query) : Model.find(query);
    if (select) cursor = cursor.select(select);
    if (sort) cursor = cursor.sort(sort);
    if (limit && !single) cursor = cursor.limit(limit);
    if (lean) cursor = cursor.lean();
    const data = await cursor;
    if (single) {
      if (data) return data;
      continue;
    }
    if (Array.isArray(data) && data.length) {
      results.push(...data);
      if (limit && results.length >= limit) {
        return results.slice(0, limit);
      }
    }
  }

  if (single) return null;
  return results;
}

async function findTenantDocById(baseModel, id, companyId = "", companyName = "", options = {}) {
  const { select, lean = true } = options;
  const targets = companyId
    ? [{ companyId: normalize(companyId), companyName: normalize(companyName) }]
    : await listAllTenantTargets();

  for (const target of targets) {
    const Model = await getTenantModel(baseModel, target.companyId, target.companyName);
    if (!Model) continue;
    let cursor = Model.findById(id);
    if (select) cursor = cursor.select(select);
    if (lean) cursor = cursor.lean();
    const doc = await cursor;
    if (doc) return { doc, companyId: target.companyId, companyName: target.companyName, Model };
  }
  return { doc: null, companyId: "", companyName: "", Model: null };
}

module.exports = {
  resolveTenantDbName,
  getModelFromDb,
  getTenantDb,
  getTenantModel,
  listAllTenantTargets,
  queryAcrossTenantModels,
  findTenantDocById,
};
