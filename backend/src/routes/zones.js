const express = require("express");
const Zone = require("../models/Zone");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Zone.create({
      zoneId: String(body.zoneId || "").trim(),
      name: String(body.name || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      gpsLatitude: String(body.gpsLatitude || "").trim(),
      gpsLongitude: String(body.gpsLongitude || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, zone: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Zone ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create zone" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    const items = await Zone.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, zones: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load zones" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Zone.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, zone: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Zone.findByIdAndUpdate(
      req.params.id,
      {
        zoneId: String(body.zoneId || "").trim(),
        name: String(body.name || "").trim(),
        warehouseId: String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        gpsLatitude: String(body.gpsLatitude || "").trim(),
        gpsLongitude: String(body.gpsLongitude || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, zone: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Zone ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update zone" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Zone.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;