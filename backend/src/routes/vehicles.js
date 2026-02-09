const express = require("express");
const Vehicle = require("../models/Vehicle");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function sanitizeString(value) {
  return value ? String(value).trim() : "";
}

function parseVehiclePayload(body = {}) {
  return {
    vehicleId: sanitizeString(body.vehicleId),
    name: sanitizeString(body.name),
    type: sanitizeString(body.type),
    plateNumber: sanitizeString(body.plateNumber),
    driverId: sanitizeString(body.driverId),
    driverName: sanitizeString(body.driverName),
    deliveryCapacity: Number(body.deliveryCapacity || 0),
    attachLevel: sanitizeString(body.attachLevel || "warehouse"),
    warehouseId: sanitizeString(body.warehouseId),
    warehouseName: sanitizeString(body.warehouseName),
    regionId: sanitizeString(body.regionId),
    regionName: sanitizeString(body.regionName),
    zoneId: sanitizeString(body.zoneId),
    zoneName: sanitizeString(body.zoneName),
    areaId: sanitizeString(body.areaId),
    areaName: sanitizeString(body.areaName),
  };
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const payload = parseVehiclePayload(req.body);
    if (!payload.vehicleId || !payload.name) {
      return res.status(400).json({ ok: false, message: "Vehicle ID and name are required" });
    }
    const vehicle = await Vehicle.create({
      ...payload,
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, vehicle });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Vehicle ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create vehicle" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const vehicles = await Vehicle.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, vehicles });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load vehicles" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    return res.json({ ok: true, vehicle });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const payload = parseVehiclePayload(req.body);
    if (!payload.vehicleId || !payload.name) {
      return res.status(400).json({ ok: false, message: "Vehicle ID and name are required" });
    }
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    return res.json({ ok: true, vehicle });
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
    if (!deleted) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;