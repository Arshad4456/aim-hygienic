const express = require("express");
const Company = require("../models/Company");

const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const existing = await Company.findOne().lean();
    if (existing) {
      return res.status(409).json({ ok: false, message: "Only one company is allowed." });
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
router.get("/", async (req, res) => {
  try {
    const items = await Company.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, companies: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load companies" });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  try {
    const item = await Company.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, company: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const body = req.body || {};
    const companyName = String(body.name || "").trim() || "AIM Hygienic (Pvt) Limited";
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
router.delete("/:id", async (_req, res) => {
  return res.status(403).json({ ok: false, message: "Company deletion is disabled." });
});

module.exports = router;