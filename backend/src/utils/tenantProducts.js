const mongoose = require("mongoose");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("./tenantDatabases");

async function resolveTenantDbName(companyId, fallbackCompanyName = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  const normalizedFallbackName = String(fallbackCompanyName || "").trim();
  if (!normalizedCompanyId && !normalizedFallbackName) return "";
  if (normalizedFallbackName) return toTenantDatabaseName(normalizedFallbackName, normalizedCompanyId || "company");

  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function toTenantPayload(product) {
  return typeof product?.toObject === "function" ? product.toObject() : { ...(product || {}) };
}

async function syncProductToTenant(product) {
  const payload = toTenantPayload(product);
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;
  const dbName = await resolveTenantDbName(companyId, payload.companyName || "");
  if (!dbName) return;
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  await tenantDb.collection("products").updateOne(
    { _id: payload._id },
    { $set: { ...payload, syncedAt: new Date() } },
    { upsert: true }
  );
}

async function removeProductFromTenant(product) {
  const payload = toTenantPayload(product);
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;
  const dbName = await resolveTenantDbName(companyId, payload.companyName || "");
  if (!dbName) return;
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  await tenantDb.collection("products").deleteOne({ _id: payload._id });
}

async function listTenantProductsByCompany(companyId) {
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) return [];
  const dbName = await resolveTenantDbName(normalizedCompanyId);
  if (!dbName) return [];
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return tenantDb.collection("products").find({}).sort({ createdAt: -1 }).toArray();
}

module.exports = { syncProductToTenant, removeProductFromTenant, listTenantProductsByCompany };