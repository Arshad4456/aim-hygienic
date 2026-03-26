const mongoose = require("mongoose");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("./tenantDatabases");

async function resolveTenantDbName(companyId, fallbackCompanyName = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  const normalizedFallbackName = String(fallbackCompanyName || "").trim();

  if (!normalizedCompanyId && !normalizedFallbackName) return "";

  if (normalizedFallbackName) {
    return toTenantDatabaseName(normalizedFallbackName, normalizedCompanyId || "company");
  }

  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function toTenantPayload(user) {
  const plain = typeof user?.toObject === "function" ? user.toObject() : { ...(user || {}) };
  delete plain.passwordHash;
  return plain;
}

async function syncUserToTenant(user) {
  const payload = toTenantPayload(user);
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;

  const dbName = await resolveTenantDbName(companyId, payload.companyName || "");
  if (!dbName) return;

  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  await tenantDb.collection("users").updateOne(
    { _id: payload._id },
    { $set: { ...payload, syncedAt: new Date() } },
    { upsert: true }
  );
}

async function removeUserFromTenant(user) {
  const payload = toTenantPayload(user);
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;

  const dbName = await resolveTenantDbName(companyId, payload.companyName || "");
  if (!dbName) return;

  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  await tenantDb.collection("users").deleteOne({ _id: payload._id });
}

async function listTenantUsersByCompany(companyId) {
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) return [];
  const dbName = await resolveTenantDbName(normalizedCompanyId);
  if (!dbName) return [];

  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return tenantDb.collection("users").find({}).sort({ createdAt: -1 }).toArray();
}

module.exports = { syncUserToTenant, removeUserFromTenant, listTenantUsersByCompany };