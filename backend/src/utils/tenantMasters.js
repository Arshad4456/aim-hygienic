const mongoose = require("mongoose");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("./tenantDatabases");

const ALLOWED_COLLECTIONS = new Set(["warehouses", "regions", "zones", "areas", "fields", "vehicles"]);

function assertCollection(collectionName) {
  if (!ALLOWED_COLLECTIONS.has(collectionName)) {
    throw new Error(`Unsupported tenant collection: ${collectionName}`);
  }
}

async function resolveCompanyName(companyId, fallbackName = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) return String(fallbackName || "").trim();
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  if (company?.name) return String(company.name).trim();
  const normalizedFallback = String(fallbackName || "").trim();
  return normalizedFallback || normalizedCompanyId;
}

async function getTenantCollection(companyId, companyName, collectionName) {
  assertCollection(collectionName);
  const resolvedName = await resolveCompanyName(companyId, companyName);
  const dbName = toTenantDatabaseName(resolvedName);
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return tenantDb.collection(collectionName);
}

function sanitizeDoc(doc = {}) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete plain.__v;
  return plain;
}

async function syncMasterToTenant({ companyId, companyName, collectionName, doc }) {
  try {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId || !doc?._id) return;
    const collection = await getTenantCollection(normalizedCompanyId, companyName, collectionName);
    const payload = {
      ...sanitizeDoc(doc),
      companyId: normalizedCompanyId,
      companyName: await resolveCompanyName(normalizedCompanyId, companyName),
      updatedAt: new Date(),
    };
    await collection.updateOne({ _id: payload._id }, { $set: payload, $setOnInsert: { createdAt: payload.createdAt || new Date() } }, { upsert: true });
  } catch (_e) {
    // Keep primary DB operation successful even if tenant sync fails.
  }
}

async function removeMasterFromTenant({ companyId, companyName, collectionName, id }) {
  try {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId || !id) return;
    const collection = await getTenantCollection(normalizedCompanyId, companyName, collectionName);
    await collection.deleteOne({ _id: typeof id === "string" ? new mongoose.Types.ObjectId(id) : id });
  } catch (_e) {
    // Best-effort cleanup; avoid breaking primary delete/update flows.
  }
}

async function listTenantMasterByCompany(companyId, collectionName) {
  try {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) return [];
    const collection = await getTenantCollection(normalizedCompanyId, "", collectionName);
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  } catch (_e) {
    return [];
  }
}

module.exports = {
  syncMasterToTenant,
  removeMasterFromTenant,
  listTenantMasterByCompany,
};