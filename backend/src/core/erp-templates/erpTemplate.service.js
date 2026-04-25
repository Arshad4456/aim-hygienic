const ErpTemplate = require("./erpTemplate.model");
const { DEFAULT_ERP_TEMPLATES } = require("./erpTemplate.constants");
async function ensureDefaultTemplates() {
  const count = await ErpTemplate.countDocuments();
  if (count > 0) return false;
  await ErpTemplate.insertMany(DEFAULT_ERP_TEMPLATES.map((item) => ({ ...item, workflows: item.key === "distribution_erp" ? { supplyChain: "supplier_company_distributor_customer", salesTypes: ["primary_sales", "secondary_sales"] } : {} })));
  return true;
}
async function listTemplates() {
  await ensureDefaultTemplates();
  return ErpTemplate.find({ status: "active" }).sort({ name: 1 }).lean();
}
async function getTemplate(key) {
  await ensureDefaultTemplates();
  return ErpTemplate.findOne({ key }).lean();
}
async function upsertTemplate(payload) {
  const key = String(payload.key || payload.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!key) throw new Error("Template key is required");
  return ErpTemplate.findOneAndUpdate({ key }, { ...payload, key }, { new: true, upsert: true, setDefaultsOnInsert: true });
}
module.exports = { ensureDefaultTemplates, listTemplates, getTemplate, upsertTemplate };
