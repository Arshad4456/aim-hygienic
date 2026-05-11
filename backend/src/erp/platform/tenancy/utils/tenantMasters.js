const mongoose = require("mongoose");
const Company = require("../../companies/models/Company");
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
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) return null;
  const resolvedName = await resolveCompanyName(normalizedCompanyId, companyName);
  const dbName = toTenantDatabaseName(resolvedName, normalizedCompanyId || "company");
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return tenantDb.collection(collectionName);
}

function sanitizeDoc(doc = {}) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete plain.__v;
  return plain;
}

async function createMasterInTenant({ companyId, companyName, collectionName, payload }) {
  const collection = await getTenantCollection(companyId, companyName, collectionName);
  if (!collection) throw new Error("Tenant collection not found");
  const document = {
    _id: new mongoose.Types.ObjectId(),
    ...sanitizeDoc(payload),
    companyId: String(companyId || "").trim(),
    companyName: await resolveCompanyName(companyId, companyName),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await collection.insertOne(document);
  return document;
}

async function updateMasterInTenant({ companyId, companyName, collectionName, id, payload }) {
  const collection = await getTenantCollection(companyId, companyName, collectionName);
  if (!collection) return null;
  const _id = typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
  const nextPayload = {
    ...sanitizeDoc(payload),
    companyId: String(companyId || "").trim(),
    companyName: await resolveCompanyName(companyId, companyName),
    updatedAt: new Date(),
  };
  await collection.updateOne({ _id }, { $set: nextPayload });
  return collection.findOne({ _id });
}

async function deleteMasterFromTenant({ companyId, companyName, collectionName, id }) {
  const collection = await getTenantCollection(companyId, companyName, collectionName);
  if (!collection) return null;
  const _id = typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
  const existing = await collection.findOne({ _id });
  if (!existing) return null;
  await collection.deleteOne({ _id });
  return existing;
}

async function findTenantMasterById(companyId, collectionName, id, companyName = "") {
  const collection = await getTenantCollection(companyId, companyName, collectionName);
  if (!collection) return null;
  const _id = typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
  return collection.findOne({ _id });
}

async function syncMasterToTenant({ companyId, companyName, collectionName, doc }) {
  try {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId || !doc?._id) return;
    const collection = await getTenantCollection(normalizedCompanyId, companyName, collectionName);
    if (!collection) return;
    const payload = {
      ...sanitizeDoc(doc),
      companyId: normalizedCompanyId,
      companyName: await resolveCompanyName(normalizedCompanyId, companyName),
      updatedAt: new Date(),
    };
    const { _id, ...rest } = payload;
    await collection.replaceOne({ _id }, { _id, ...rest, createdAt: payload.createdAt || new Date() }, { upsert: true });
  } catch (_e) {
    console.error("[tenantMasters] sync failed", _e?.message || _e);
  }
}

async function removeMasterFromTenant({ companyId, companyName, collectionName, id }) {
  try {
    const collection = await getTenantCollection(companyId, companyName, collectionName);
    if (!collection) return;
    await collection.deleteOne({ _id: typeof id === "string" ? new mongoose.Types.ObjectId(id) : id });
  } catch (_e) {
    console.error("[tenantMasters] remove failed", _e?.message || _e);
  }
}

async function listTenantMasterByCompany(companyId, collectionName) {
  try {
    const collection = await getTenantCollection(companyId, "", collectionName);
    if (!collection) return [];
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  } catch (_e) {
    console.error("[tenantMasters] list failed", _e?.message || _e);
    return [];
  }
}

module.exports = {
  createMasterInTenant,
  updateMasterInTenant,
  deleteMasterFromTenant,
  findTenantMasterById,
  syncMasterToTenant,
  removeMasterFromTenant,
  listTenantMasterByCompany,
};
