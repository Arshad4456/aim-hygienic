const express = require("express");
const Company = require("../models/Company");
const { requireAuth, requireRole } = require("../../auth/utils/auth");
const { ensureDatabaseExists, toTenantDatabaseName } = require("../../tenancy/utils/tenantDatabases");
const { APP_BRAND } = require("../../../../config/brand");

const router = express.Router();

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function duplicateKeyMessage(error) {
  const duplicateField = Object.keys(error?.keyPattern || {})[0] || Object.keys(error?.keyValue || {})[0];
  if (!duplicateField) return "Duplicate value already exists";
  if (duplicateField === "companyId") return "Company ID already exists";
  if (duplicateField === "name") return "Company name already exists";
  if (duplicateField === "slug") return "Company slug already exists";
  return `${duplicateField} already exists`;
}

async function buildUniqueCompanySlug(baseValue, excludeId = null) {
  const baseSlug = toTenantDatabaseName(baseValue, "company");
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Company.findOne(query).select("_id").lean();
    if (!exists) return candidate;
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

// CREATE
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    if (!isSystemAdmin(req.user?.role)) {
      return res.status(403).json({ ok: false, message: "Only system admin can add companies." });
    }
    const companyId = String(body.companyId || "").trim();
    if (!companyId) {
      return res.status(400).json({ ok: false, message: "Company ID is required." });
    }
    const companyName = String(body.name || "").trim() || APP_BRAND.name;
    const exists = await Company.findOne({ companyId }).lean();
    if (exists) {
      return res.status(409).json({ ok: false, message: "Company ID already exists" });
    }
    const slug = await buildUniqueCompanySlug(companyId || companyName);
    const doc = await Company.create({
      companyId,
      slug,
      name: companyName,

      phone1: String(body.phone1 || "").trim(),
      phone2: String(body.phone2 || "").trim(),
      email: String(body.email || "").trim(),
      mainOfficeAddress: String(body.mainOfficeAddress || "").trim(),

      createdBy: req.user?.uid,
    });

    await Promise.all([
      ensureDatabaseExists("system-admin"),
      ensureDatabaseExists(toTenantDatabaseName(companyName, String(body.companyId || "").trim() || "company")),
    ]);

    return res.status(201).json({ ok: true, company: doc });
  } catch (e) {
    // duplicate code
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: duplicateKeyMessage(e) });
    }
    return res.status(500).json({ ok: false, message: "Failed to create company" });
  }
});

// LIST
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    if (!isSystemAdmin(req.user?.role)) {
      return res.status(403).json({ ok: false, message: "Only system admin can access companies." });
    }
    const items = await Company.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, companies: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load companies" });
  }
});

// GET ONE
router.get("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    if (!isSystemAdmin(req.user?.role)) {
      return res.status(403).json({ ok: false, message: "Only system admin can access companies." });
    }
    const item = await Company.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, company: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

// UPDATE
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    if (!isSystemAdmin(req.user?.role)) {
      return res.status(403).json({ ok: false, message: "Only system admin can update companies." });
    }
    const body = req.body || {};
    const companyId = String(body.companyId || "").trim();
    if (!companyId) {
      return res.status(400).json({ ok: false, message: "Company ID is required." });
    }
    const companyName = String(body.name || "").trim() || APP_BRAND.name;
    const current = await Company.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ ok: false, message: "Not found" });
    const duplicate = await Company.findOne({ companyId, _id: { $ne: req.params.id } }).lean();
    if (duplicate) {
      return res.status(409).json({ ok: false, message: "Company ID already exists" });
    }
    const slug = await buildUniqueCompanySlug(companyId || companyName, req.params.id);

    const updated = await Company.findByIdAndUpdate(
      req.params.id,
      {
        companyId,
        slug,
        name: companyName,

        phone1: String(body.phone1 || "").trim(),
        phone2: String(body.phone2 || "").trim(),
        email: String(body.email || "").trim(),
        mainOfficeAddress: String(body.mainOfficeAddress || "").trim(),
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, company: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: duplicateKeyMessage(e) });
    }
    return res.status(500).json({ ok: false, message: "Failed to update company" });
  }
});

// DELETE
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  if (!isSystemAdmin(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Only system admin can delete companies." });
  }
  const deleted = await Company.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
  return res.json({ ok: true, deletedId: req.params.id });
});

module.exports = router;