const service = require("./systemAdmin.service");

async function seedDefaults(req, res) {
  try {
    const result = await service.seedSaasDefaults();
    return res.json({ ok: true, message: "Rawyan ERP SaaS defaults seeded", result });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to seed SaaS defaults" });
  }
}

async function overview(req, res) {
  try {
    const result = await service.getOverview();
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load system admin overview" });
  }
}

async function companies(req, res) {
  try {
    const companies = await service.listCompanies();
    return res.json({ ok: true, companies });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load companies" });
  }
}

async function updateCompanyControl(req, res) {
  try {
    const company = await service.updateCompanyControl(req.params.companyId, req.body || {}, req.user?.uid || null);
    return res.json({ ok: true, company });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to update company control" });
  }
}

async function upsertPlan(req, res) {
  try {
    const plan = await service.upsertPlan(req.body || {}, req.user?.uid || null);
    return res.json({ ok: true, plan });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to save subscription plan" });
  }
}

async function companyLimits(req, res) {
  try {
    const result = await service.getCompanyLimits(req.params.companyId);
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to load company limits" });
  }
}

module.exports = { seedDefaults, overview, companies, updateCompanyControl, upsertPlan, companyLimits };
