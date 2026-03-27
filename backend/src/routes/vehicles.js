const express = require("express");
const Vehicle = require("../models/Vehicle");
const VehicleTrip = require("../models/VehicleTrip");
const VehicleRefuel = require("../models/VehicleRefuel");
const VehicleMaintenance = require("../models/VehicleMaintenance");
const VehicleAssignment = require("../models/VehicleAssignment");
const User = require("../models/User");
const { requireAuth } = require("../utils/auth");
const { syncMasterToTenant, removeMasterFromTenant, listTenantMasterByCompany } = require("../utils/tenantMasters");

const router = express.Router();
function normalizeRole(role) { return String(role || "").trim().toLowerCase(); }
function isSystemLevelAdmin(role) { const r = normalizeRole(role); return r === "admin" || r === "system admin"; }

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
    companyId: sanitizeString(body.companyId),
    companyName: sanitizeString(body.companyName),
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

router.post("/", requireAuth, async (req, res) => {
  try {
    const payload = parseVehiclePayload(req.body);
    if (!isSystemLevelAdmin(req.user?.role)) {
      payload.companyId = sanitizeString(req.user?.companyId);
      payload.companyName = sanitizeString(req.user?.companyName);
    }
    if (!payload.companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });
    const validationErr = validateVehiclePayload(payload);
    if (validationErr) return res.status(400).json({ ok: false, message: validationErr });

    const vehicle = await Vehicle.create({ ...payload, createdBy: req.user?.uid });
    await syncMasterToTenant({ companyId: payload.companyId, companyName: payload.companyName, collectionName: "vehicles", doc: vehicle });

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

router.get("/", requireAuth, async (req, res) => {
  try {
    const q = {};
    const isSystemAdmin = isSystemLevelAdmin(req.user?.role);
    if (!isSystemAdmin) {
      let vehicles = await listTenantMasterByCompany(req.user?.companyId, "vehicles");
      if (req.query.type) vehicles = vehicles.filter((v) => String(v.type || "") === String(req.query.type));
      if (req.query.fuelType) vehicles = vehicles.filter((v) => String(v.fuelType || "") === String(req.query.fuelType));
      if (req.query.status) vehicles = vehicles.filter((v) => String(v.status || "") === String(req.query.status));
      if (req.query.regionId) vehicles = vehicles.filter((v) => String(v.regionId || "") === String(req.query.regionId));
      if (req.query.zoneId) vehicles = vehicles.filter((v) => String(v.zoneId || "") === String(req.query.zoneId));
      if (req.query.areaId) vehicles = vehicles.filter((v) => String(v.areaId || "") === String(req.query.areaId));
      if (req.query.assignedUserId) vehicles = vehicles.filter((v) => String(v.assignedUserId || "") === String(req.query.assignedUserId));
      if (req.query.search) {
        const search = String(req.query.search || "").toLowerCase();
        vehicles = vehicles.filter((v) => [v.registrationNo, v.nickname, v.make, v.model].filter(Boolean).join(" ").toLowerCase().includes(search));
      }
      const limit = Math.min(Number(req.query.limit) || 500, 1000);
      return res.json({ ok: true, vehicles: vehicles.slice(0, limit) });
    }
    if (req.query.companyId) q.companyId = sanitizeString(req.query.companyId);
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

router.get("/:id/detail", requireAuth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(vehicle.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

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

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(vehicle.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    return res.json({ ok: true, vehicle });
  } catch (_e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Vehicle.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const payload = parseVehiclePayload(req.body);
    if (!isSystemLevelAdmin(req.user?.role)) {
      payload.companyId = sanitizeString(req.user?.companyId);
      payload.companyName = sanitizeString(req.user?.companyName);
    }
    if (!payload.companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });
    const validationErr = validateVehiclePayload(payload);
    if (validationErr) return res.status(400).json({ ok: false, message: validationErr });

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    if (String(existing.companyId || "").trim() && String(existing.companyId || "").trim() !== String(vehicle.companyId || "").trim()) {
      await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "vehicles", id: existing._id });
    }
    await syncMasterToTenant({ companyId: vehicle.companyId, companyName: vehicle.companyName, collectionName: "vehicles", doc: vehicle });
    return res.json({ ok: true, vehicle });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ ok: false, message: "Vehicle unique identifier already exists" });
    return res.status(500).json({ ok: false, message: "Failed to update vehicle" });
  }
});

router.post("/:id/assign", requireAuth, async (req, res) => {
  try {
    const { userId, startDate } = req.body || {};
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(vehicle.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

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

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Vehicle.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const deleted = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Vehicle not found" });
    await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "vehicles", id: existing._id });
    return res.json({ ok: true });
  } catch (_e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;