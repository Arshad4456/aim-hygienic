const express = require("express");
const Region = require("../models/Region");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Region.create({
      regionId: String(body.regionId || "").trim(),
      name: String(body.name || "").trim(),
      companyId: String(body.companyId || "").trim(),
      companyName: String(body.companyName || "").trim(),
      gpsLatitude: String(body.gpsLatitude || "").trim(),
      gpsLongitude: String(body.gpsLongitude || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, region: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Region ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create region" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = String(req.query.companyId);
    const items = await Region.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, regions: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load regions" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Region.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, region: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Region.findByIdAndUpdate(
      req.params.id,
      {
        regionId: String(body.regionId || "").trim(),
        name: String(body.name || "").trim(),
        companyId: String(body.companyId || "").trim(),
        companyName: String(body.companyName || "").trim(),
        gpsLatitude: String(body.gpsLatitude || "").trim(),
        gpsLongitude: String(body.gpsLongitude || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, region: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Region ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update region" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Region.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
