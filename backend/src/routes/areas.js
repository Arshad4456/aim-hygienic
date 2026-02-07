const express = require("express");
const Area = require("../models/Area");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Area.create({
      areaId: String(body.areaId || "").trim(),
      name: String(body.name || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      gpsLatitude: String(body.gpsLatitude || "").trim(),
      gpsLongitude: String(body.gpsLongitude || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, area: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Area ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create area" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    const items = await Area.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, areas: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load areas" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Area.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, area: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Area.findByIdAndUpdate(
      req.params.id,
      {
        areaId: String(body.areaId || "").trim(),
        name: String(body.name || "").trim(),
        warehouseId: String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        zoneId: String(body.zoneId || "").trim(),
        zoneName: String(body.zoneName || "").trim(),
        gpsLatitude: String(body.gpsLatitude || "").trim(),
        gpsLongitude: String(body.gpsLongitude || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, area: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Area ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update area" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Area.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;