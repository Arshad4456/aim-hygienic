const Product = require("../../../common/products/models/Product");
const {
  getTenantModel,
  queryAcrossTenantModels,
  findTenantDocById,
} = require("./tenantModels");

async function createProductInTenant(payload) {
  const companyId = String(payload?.companyId || "").trim();
  if (!companyId) throw new Error("Company is required for tenant product creation");
  const Model = await getTenantModel(Product, companyId, payload?.companyName || "");
  if (!Model) throw new Error("Tenant database not found");
  return Model.create(payload);
}

async function updateProductInTenant(id, payload, companyId, companyName = "") {
  const Model = await getTenantModel(Product, companyId, companyName);
  if (!Model) return null;
  return Model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
}

async function deleteProductFromTenant(id, companyId, companyName = "") {
  const Model = await getTenantModel(Product, companyId, companyName);
  if (!Model) return null;
  return Model.findByIdAndDelete(id);
}

function toTenantPayload(product) {
  return typeof product?.toObject === "function" ? product.toObject() : { ...(product || {}) };
}

async function syncProductToTenant(product) {
  const payload = toTenantPayload(product);
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;
  const Model = await getTenantModel(Product, companyId, payload.companyName || "");
  if (!Model) return;
  await Model.updateOne({ _id: payload._id }, { $set: { ...payload, syncedAt: new Date() } }, { upsert: true });
}

async function removeProductFromTenant(product) {
  const payload = toTenantPayload(product);
  const companyId = String(payload.companyId || "").trim();
  if (!companyId) return;
  const Model = await getTenantModel(Product, companyId, payload.companyName || "");
  if (!Model) return;
  await Model.deleteOne({ _id: payload._id });
}

async function listTenantProductsByCompany(companyId) {
  if (!String(companyId || "").trim()) return [];
  return queryAcrossTenantModels(Product, { companyId: String(companyId).trim() }, { sort: { createdAt: -1 } });
}

async function findTenantProductById(id, companyId = "", companyName = "") {
  return findTenantDocById(Product, id, companyId, companyName);
}

module.exports = {
  createProductInTenant,
  updateProductInTenant,
  deleteProductFromTenant,
  syncProductToTenant,
  removeProductFromTenant,
  listTenantProductsByCompany,
  findTenantProductById,
};
