const express = require("express");
const Vehicle = require("../models/Vehicle");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Vehicle.create({
      vehicleId: String(body.vehicleId || "").trim(),
      name: String(body.name || "").trim(),
      type: String(body.type || "").trim(),
      plateNumber: String(body.plateNumber || "").trim(),
      driverId: String(body.driverId || "").trim(),
      driverName: String(body.driverName || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, vehicle: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Vehicle ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create vehicle" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const items = await Vehicle.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, vehicles: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load vehicles" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Vehicle.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, vehicle: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Vehicle.findByIdAndUpdate(
      req.params.id,
      {
        vehicleId: String(body.vehicleId || "").trim(),
        name: String(body.name || "").trim(),
        type: String(body.type || "").trim(),
        plateNumber: String(body.plateNumber || "").trim(),
        driverId: String(body.driverId || "").trim(),
        driverName: String(body.driverName || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, vehicle: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Vehicle ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update vehicle" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
