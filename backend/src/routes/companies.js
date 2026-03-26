const express = require("express");
const Company = require("../models/Company");
const { requireAuth, requireRole } = require("../utils/auth");
const { ensureDatabaseExists, toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

// CREATE
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    if (!isSystemAdmin(req.user?.role)) {
      return res.status(403).json({ ok: false, message: "Only system admin can add companies." });
    }
    const companyName = String(body.name || "").trim() || "AIM Hygienic (Pvt) Limited";
    const doc = await Company.create({
      companyId: String(body.companyId || "").trim(),
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
      return res.status(409).json({ ok: false, message: "Company ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create company" });
  }
});

// LIST
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const isCompanyAdmin = normalizeRole(req.user?.role) === "company admin";
    const query = {};
    if (isCompanyAdmin) {
      const scopedCompanyId = String(req.user?.companyId || "").trim();
      if (!scopedCompanyId) return res.json({ ok: true, companies: [] });
      query.companyId = scopedCompanyId;
    }
    const items = await Company.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, companies: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load companies" });
  }
});

// GET ONE
router.get("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const item = await Company.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    if (normalizeRole(req.user?.role) === "company admin" && String(req.user?.companyId || "").trim() !== String(item.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    return res.json({ ok: true, company: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

// UPDATE
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const companyName = String(body.name || "").trim() || "AIM Hygienic (Pvt) Limited";
    const current = await Company.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ ok: false, message: "Not found" });
    if (normalizeRole(req.user?.role) === "company admin" && String(req.user?.companyId || "").trim() !== String(current.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    const updated = await Company.findByIdAndUpdate(
      req.params.id,
      {
        companyId: String(body.companyId || "").trim(),
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
      return res.status(409).json({ ok: false, message: "Company ID already exists" });
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