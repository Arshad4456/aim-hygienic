const express = require("express");
const Vehicle = require("../models/Vehicle");
const VehicleTrip = require("../models/VehicleTrip");
const VehicleRefuel = require("../models/VehicleRefuel");
const VehicleMaintenance = require("../models/VehicleMaintenance");
const AccountTransaction = require("../models/AccountTransaction");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function monthRange(from, to) {
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(to) : new Date();
  return { start, end };
}

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const { start, end } = monthRange(req.query.from, req.query.to);
    const vf = {};
    ["regionId", "zoneId", "areaId", "type", "status"].forEach((k) => {
      if (req.query[k]) vf[k] = req.query[k];
    });
    if (req.query.assignedUserId) vf.assignedUserId = req.query.assignedUserId;
    const vehicles = await Vehicle.find(vf).lean();
    const vehicleIds = vehicles.map((v) => v._id);

    const [trips, refuels, maintenance] = await Promise.all([
      VehicleTrip.find({ vehicleId: { $in: vehicleIds }, tripDate: { $gte: start, $lte: end } }).lean(),
      VehicleRefuel.find({ vehicleId: { $in: vehicleIds }, date: { $gte: start, $lte: end } }).lean(),
      VehicleMaintenance.find({ vehicleId: { $in: vehicleIds }, date: { $gte: start, $lte: end } }).lean(),
    ]);

    const totalKm = trips.reduce((a, t) => a + (t.distance || 0), 0);
    const companyKm = trips.filter((t) => t.tripType === "company").reduce((a, t) => a + (t.distance || 0), 0);
    const personalKm = totalKm - companyKm;
    const totalFuel = refuels.reduce((a, r) => a + (r.liters || 0), 0);
    const fuelCost = refuels.reduce((a, r) => a + (r.cost || 0), 0);
    const maintenanceCost = maintenance.reduce((a, m) => a + (m.cost || 0), 0);
    const activeCount = vehicles.filter((v) => v.assignedUserId).length;
    const dueMaintenanceCount = vehicles.filter((v) => v.status === "Under Maintenance").length;

    const byType = vehicles.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    const alerts = [];
    for (const trip of trips) {
      if (trip.distance > 600) alerts.push({ type: "sudden_km_jump", tripId: trip._id, message: "Large KM jump detected" });
      if (!trip.startMeterUrl || !trip.endMeterUrl) alerts.push({ type: "missing_meter_photo", tripId: trip._id, message: "Meter photo missing" });
    }

    return res.json({
      ok: true,
      kpis: {
        totalVehicles: vehicles.length,
        activeVehicles: activeCount,
        idleVehicles: vehicles.length - activeCount,
        totalTrips: trips.length,
        totalKm,
        companyKm,
        personalKm,
        totalFuel,
        fuelCost,
        maintenanceCost,
        avgEfficiency: totalFuel > 0 ? totalKm / totalFuel : 0,
        dueMaintenanceCount,
      },
      breakdowns: {
        byType,
        byRegion: vehicles.reduce((acc, v) => {
          const key = v.regionName || v.regionId || "Unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      alerts,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load vehicle overview" });
  }
});

router.post("/trips", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const start = Number(body.startOdometer);
    const end = Number(body.endOdometer);
    if (!body.vehicleId || !body.tripDate || !body.fromPlace || !body.toPlace || !Number.isFinite(start) || !Number.isFinite(end) || !body.startMeterUrl || !body.endMeterUrl) {
      return res.status(400).json({ ok: false, message: "Required trip fields are missing" });
    }
    if (end < start) return res.status(400).json({ ok: false, message: "End odometer must be greater than or equal to start" });

    const vehicle = await Vehicle.findById(body.vehicleId);
    if (!vehicle) return res.status(404).json({ ok: false, message: "Vehicle not found" });

    const lastTrip = await VehicleTrip.findOne({ vehicleId: body.vehicleId }).sort({ tripDate: -1, createdAt: -1 }).lean();
    if (lastTrip && start < Number(lastTrip.endOdometer || 0)) {
      return res.status(400).json({ ok: false, message: "Start odometer cannot be lower than last trip end odometer" });
    }

    const distance = end - start;
    const anomalyFlags = [];
    if (distance > Number(process.env.VEHICLE_MAX_TRIP_KM || 600)) anomalyFlags.push("km_spike");

    const trip = await VehicleTrip.create({
      vehicleId: body.vehicleId,
      userId: body.userId || req.user.uid,
      tripType: body.tripType === "personal" ? "personal" : "company",
      tripDate: body.tripDate,
      fromPlace: body.fromPlace,
      toPlace: body.toPlace,
      startOdometer: start,
      endOdometer: end,
      distance,
      startMeterUrl: body.startMeterUrl,
      endMeterUrl: body.endMeterUrl,
      fuelEntryType: body.fuelEntryType || "none",
      liters: Number(body.liters || 0),
      fuelReceiptUrl: body.fuelReceiptUrl || "",
      notes: body.notes || "",
      anomalyFlags,
      createdBy: req.user.uid,
    });

    if (end > Number(vehicle.currentOdometer || 0)) {
      vehicle.currentOdometer = end;
      await vehicle.save();
    }

    return res.status(201).json({ ok: true, trip });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to create trip" });
  }
});

router.get("/trips", requireAuth, async (req, res) => {
  const trips = await VehicleTrip.find().sort({ tripDate: -1 }).limit(200).lean();
  return res.json({ ok: true, trips });
});

router.post("/refuels", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.vehicleId || !body.date || !body.liters || !body.receiptUrl) {
      return res.status(400).json({ ok: false, message: "Vehicle, date, liters and receipt are required" });
    }
    const refuel = await VehicleRefuel.create({ ...body, userId: body.userId || req.user.uid, createdBy: req.user.uid });

    if (body.paidFromAccountId && Number(body.cost || 0) > 0) {
      await AccountTransaction.create({
        accountId: body.paidFromAccountId,
        type: "cash_out",
        amount: Number(body.cost),
        transactionDate: new Date(body.date),
        referenceType: "other",
        description: `Vehicle refuel: ${body.vehicleId}`,
        createdBy: req.user.uid,
      });
    }

    return res.status(201).json({ ok: true, refuel });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to save refuel" });
  }
});

router.get("/refuels", requireAuth, async (_req, res) => {
  const refuels = await VehicleRefuel.find().sort({ date: -1 }).limit(200).lean();
  return res.json({ ok: true, refuels });
});

router.post("/maintenance", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.vehicleId || !body.date || !body.maintenanceType || !body.cost) {
      return res.status(400).json({ ok: false, message: "Vehicle, date, type and cost are required" });
    }
    if (["oil_change", "car_wash"].includes(body.maintenanceType) && !body.proofUrl) {
      return res.status(400).json({ ok: false, message: "Proof image is required for oil change and car wash" });
    }
    if (body.maintenanceType === "other" && !String(body.notes || "").trim()) {
      return res.status(400).json({ ok: false, message: "Notes are required for Other category" });
    }

    const record = await VehicleMaintenance.create({ ...body, createdBy: req.user.uid });
    if (body.paidFromAccountId && Number(body.cost || 0) > 0) {
      await AccountTransaction.create({
        accountId: body.paidFromAccountId,
        type: "cash_out",
        amount: Number(body.cost),
        transactionDate: new Date(body.date),
        referenceType: "other",
        description: `Vehicle maintenance: ${body.vehicleId}`,
        createdBy: req.user.uid,
      });
    }

    return res.status(201).json({ ok: true, maintenance: record });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to create maintenance" });
  }
});

router.get("/maintenance", requireAuth, async (_req, res) => {
  const maintenance = await VehicleMaintenance.find().sort({ date: -1 }).limit(200).lean();
  return res.json({ ok: true, maintenance });
});

module.exports = router;
