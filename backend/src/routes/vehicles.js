const express = require("express");
const Vehicle = require("../models/Vehicle");
const VehicleTrip = require("../models/VehicleTrip");
const VehicleRefuel = require("../models/VehicleRefuel");
const VehicleMaintenance = require("../models/VehicleMaintenance");
const VehicleAssignment = require("../models/VehicleAssignment");
const User = require("../models/User");
const { requireAuth, requirePermission } = require("../utils/auth");

const router = express.Router();

function sanitizeString(value) {
  return value ? String(value).trim() : "";
}

function parseNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseVehiclePayload(body = {}) {
  return {
    vehicleId: sanitizeString(body.vehicleId) || undefined,
    type: sanitizeString(body.type),
    make: sanitizeString(body.make),
    model: sanitizeString(body.model),
    year: parseNum(body.year),
    nickname: sanitizeString(body.nickname),
    registrationNo: sanitizeString(body.registrationNo),
    engineNo: sanitizeString(body.engineNo),
    chassisNo: sanitizeString(body.chassisNo),
    color: sanitizeString(body.color),
    ownershipType: sanitizeString(body.ownershipType || "company"),
    purchaseDate: body.purchaseDate || undefined,
    purchasePrice: parseNum(body.purchasePrice),
    insuranceProvider: sanitizeString(body.insuranceProvider),
    insuranceExpiry: body.insuranceExpiry || undefined,
    tokenExpiry: body.tokenExpiry || undefined,
    fitnessExpiry: body.fitnessExpiry || undefined,
    permitExpiry: body.permitExpiry || undefined,
    docsUrls: Array.isArray(body.docsUrls) ? body.docsUrls.filter(Boolean) : [],
    regionId: sanitizeString(body.regionId),
    regionName: sanitizeString(body.regionName),
    zoneId: sanitizeString(body.zoneId),
    zoneName: sanitizeString(body.zoneName),
    areaId: sanitizeString(body.areaId),
    areaName: sanitizeString(body.areaName),
    fieldId: sanitizeString(body.fieldId),
    fieldName: sanitizeString(body.fieldName),
    assignedUserId: sanitizeString(body.assignedUserId) || undefined,
    assignedUserName: sanitizeString(body.assignedUserName),
    assignmentStartDate: body.assignmentStartDate || undefined,
    defaultDriverName: sanitizeString(body.defaultDriverName),
    fuelType: sanitizeString(body.fuelType),
    tankCapacity: parseNum(body.tankCapacity),
    odometerUnit: sanitizeString(body.odometerUnit || "KM"),
    currentOdometer: parseNum(body.currentOdometer),
    expectedKmPerLiter: parseNum(body.expectedKmPerLiter),
    status: sanitizeString(body.status || "Active"),
    notes: sanitizeString(body.notes),
  };
}

function validateVehiclePayload(payload) {
  if (!payload.type || !payload.make || !payload.model || !payload.year || !payload.registrationNo || !payload.engineNo || !payload.chassisNo) {
    return "Vehicle identity fields are required";
  }
  if (!payload.regionId || !payload.zoneId || !payload.areaId) return "Region, Zone and Territory are required";
  if (!payload.fuelType || !Number.isFinite(payload.currentOdometer)) return "Fuel type and current odometer are required";
  return "";
}

router.post("/", requireAuth, requirePermission("vehicles.view"), async (req, res) => {
  try {
    const payload = parseVehiclePayload(req.body);
    const validationErr = validateVehiclePayload(payload);
    if (validationErr) return res.status(400).json({ ok: false, message: validationErr });

    const vehicle = await Vehicle.create({ ...payload, createdBy: req.user?.uid });

    if (payload.assignedUserId) {
      await VehicleAssignment.create({
        vehicleId: vehicle._id,
        userId: payload.assignedUserId,
        startDate: payload.assignmentStartDate || new Date(),
        assignedBy: req.user?.uid,
      });
    }

    return res.status(201).json({ ok: true, vehicle });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ ok: false, message: "Vehicle unique identifier already exists" });
    return res.status(500).json({ ok: false, message: "Failed to create vehicle" });
  }
});

router.get("/", requireAuth, requirePermission("vehicles.view"), async (req, res) => {
  try {
    const q = {};
    if (req.query.type) q.type = req.query.type;
    if (req.query.fuelType) q.fuelType = req.query.fuelType;
    if (req.query.status) q.status = req.query.status;
    if (req.query.regionId) q.regionId = req.query.regionId;
    if (req.query.zoneId) q.zoneId = req.query.zoneId;
    if (req.query.areaId) q.areaId = req.query.areaId;
    if (req.query.assignedUserId) q.assignedUserId = req.query.assignedUserId;

    if (req.query.search) {
      q.$or = [
        { registrationNo: { $regex: req.query.search, $options: "i" } },
        { nickname: { $regex: req.query.search, $options: "i" } },
        { make: { $regex: req.query.search, $options: "i" } },
        { model: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const limit = Math.min(Number(req.query.limit) || 500, 1000);
    const vehicles = await Vehicle.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, vehicles });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load vehicles" });
  }
});

router.get("/:id/detail", requireAuth, requirePermission("vehicles.view"), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });

    const [assignments, trips, refuels, maintenance] = await Promise.all([
      VehicleAssignment.find({ vehicleId: req.params.id }).sort({ startDate: -1 }).limit(30).lean(),
      VehicleTrip.find({ vehicleId: req.params.id }).sort({ tripDate: -1 }).limit(50).lean(),
      VehicleRefuel.find({ vehicleId: req.params.id }).sort({ date: -1 }).limit(50).lean(),
      VehicleMaintenance.find({ vehicleId: req.params.id }).sort({ date: -1 }).limit(50).lean(),
    ]);

    return res.json({ ok: true, vehicle, assignments, trips, refuels, maintenance });
  } catch (_e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.get("/:id", requireAuth, requirePermission("vehicles.view"), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    return res.json({ ok: true, vehicle });
  } catch (_e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, requirePermission("vehicles.view"), async (req, res) => {
  try {
    const payload = parseVehiclePayload(req.body);
    const validationErr = validateVehiclePayload(payload);
    if (validationErr) return res.status(400).json({ ok: false, message: validationErr });

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    return res.json({ ok: true, vehicle });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ ok: false, message: "Vehicle unique identifier already exists" });
    return res.status(500).json({ ok: false, message: "Failed to update vehicle" });
  }
});

router.post("/:id/assign", requireAuth, requirePermission("vehicles.view"), async (req, res) => {
  try {
    const { userId, startDate } = req.body || {};
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });

    if (!userId) {
      vehicle.assignedUserId = undefined;
      vehicle.assignedUserName = "";
      await vehicle.save();
      await VehicleAssignment.updateMany({ vehicleId: vehicle._id, endDate: { $exists: false } }, { $set: { endDate: new Date() } });
      return res.json({ ok: true, vehicle });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    await VehicleAssignment.updateMany({ vehicleId: vehicle._id, endDate: { $exists: false } }, { $set: { endDate: new Date() } });
    await VehicleAssignment.create({ vehicleId: vehicle._id, userId, startDate: startDate || new Date(), assignedBy: req.user?.uid });
    vehicle.assignedUserId = userId;
    vehicle.assignedUserName = user.name || user.username || user.email || "";
    vehicle.assignmentStartDate = startDate || new Date();
    await vehicle.save();

    return res.json({ ok: true, vehicle });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to update assignment" });
  }
});

router.delete("/:id", requireAuth, requirePermission("vehicles.view"), async (req, res) => {
  try {
    const deleted = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    return res.json({ ok: true });
  } catch (_e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;