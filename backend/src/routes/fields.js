const express = require("express");
const Field = require("../models/Field");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Field.create({
      fieldId: String(body.fieldId || "").trim(),
      name: String(body.name || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      territoryId: String(body.territoryId || "").trim(),
      territoryName: String(body.territoryName || "").trim(),
      status: String(body.status || "active").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, field: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Field ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create field" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);
    if (req.query.territoryId) query.territoryId = String(req.query.territoryId);
    const items = await Field.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, fields: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load fields" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Field.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, field: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Field.findByIdAndUpdate(
      req.params.id,
      {
        fieldId: String(body.fieldId || "").trim(),
        name: String(body.name || "").trim(),
        warehouseId: String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        zoneId: String(body.zoneId || "").trim(),
        zoneName: String(body.zoneName || "").trim(),
        territoryId: String(body.territoryId || "").trim(),
        territoryName: String(body.territoryName || "").trim(),
        status: String(body.status || "active").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, field: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Field ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update field" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Field.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;