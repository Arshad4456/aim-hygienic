const express = require("express");
const Warehouse = require("../models/Warehouse");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Warehouse.create({
      warehouseId: String(body.warehouseId || "").trim(),
      name: String(body.name || "").trim(),
      phone: String(body.phone || "").trim(),
      address: String(body.address || "").trim(),
      companyId: String(body.companyId || "").trim(),
      companyName: String(body.companyName || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, warehouse: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Warehouse ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create warehouse" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = String(req.query.companyId);
    const items = await Warehouse.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, warehouses: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load warehouses" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Warehouse.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, warehouse: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Warehouse.findByIdAndUpdate(
      req.params.id,
      {
        warehouseId: String(body.warehouseId || "").trim(),
        name: String(body.name || "").trim(),
        phone: String(body.phone || "").trim(),
        address: String(body.address || "").trim(),
        companyId: String(body.companyId || "").trim(),
        companyName: String(body.companyName || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, warehouse: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Warehouse ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update warehouse" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Warehouse.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
