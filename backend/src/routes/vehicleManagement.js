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

function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function safeDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
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
    const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));

    const [trips, refuels, maintenance] = await Promise.all([
      VehicleTrip.find({ vehicleId: { $in: vehicleIds }, tripDate: { $gte: start, $lte: end } }).lean(),
      VehicleRefuel.find({ vehicleId: { $in: vehicleIds }, date: { $gte: start, $lte: end } }).lean(),
      VehicleMaintenance.find({ vehicleId: { $in: vehicleIds }, date: { $gte: start, $lte: end } }).lean(),
    ]);

    const totalKm = trips.reduce((a, t) => a + (t.distance || 0), 0);
    const companyTrips = trips.filter((t) => t.tripType === "company").length;
    const personalTrips = trips.filter((t) => t.tripType === "personal").length;
    const companyKm = trips.filter((t) => t.tripType === "company").reduce((a, t) => a + (t.distance || 0), 0);
    const personalKm = totalKm - companyKm;
    const totalFuel = refuels.reduce((a, r) => a + (r.liters || 0), 0);
    const fuelCost = refuels.reduce((a, r) => a + (r.cost || 0), 0);
    const maintenanceCost = maintenance.reduce((a, m) => a + (m.cost || 0), 0);
    const activeCount = vehicles.filter((v) => v.assignedUserId).length;
    const dueMaintenanceCount = vehicles.filter((v) => v.status === "Under Maintenance").length;

    const byType = vehicles.reduce((acc, v) => {
      const key = v.type || "Other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byStatus = vehicles.reduce((acc, v) => {
      const key = v.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byRegion = vehicles.reduce((acc, v) => {
      const key = v.regionName || v.regionId || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const fuelTrendByDay = refuels.reduce((acc, item) => {
      const key = dayKey(item.date);
      if (!acc[key]) acc[key] = { date: key, liters: 0, cost: 0 };
      acc[key].liters += Number(item.liters || 0);
      acc[key].cost += Number(item.cost || 0);
      return acc;
    }, {});

    const maintenanceTrendByDay = maintenance.reduce((acc, item) => {
      const key = dayKey(item.date);
      if (!acc[key]) acc[key] = { date: key, cost: 0, count: 0 };
      acc[key].cost += Number(item.cost || 0);
      acc[key].count += 1;
      return acc;
    }, {});

    const maintenanceByType = maintenance.reduce((acc, item) => {
      const key = item.maintenanceType || "other";
      if (!acc[key]) acc[key] = { type: key, count: 0, cost: 0 };
      acc[key].count += 1;
      acc[key].cost += Number(item.cost || 0);
      return acc;
    }, {});

    const tripAggByVehicle = trips.reduce((acc, t) => {
      const key = String(t.vehicleId);
      if (!acc[key]) {
        const vehicle = vehicleMap.get(key) || {};
        acc[key] = {
          vehicleId: key,
          registrationNo: vehicle.registrationNo || "-",
          assignedUserName: vehicle.assignedUserName || "-",
          distance: 0,
          litersFromTrips: 0,
          tripCount: 0,
          companyKm: 0,
          personalKm: 0,
        };
      }
      acc[key].distance += Number(t.distance || 0);
      acc[key].litersFromTrips += Number(t.liters || 0);
      acc[key].tripCount += 1;
      if (t.tripType === "company") acc[key].companyKm += Number(t.distance || 0);
      if (t.tripType === "personal") acc[key].personalKm += Number(t.distance || 0);
      return acc;
    }, {});

    const refuelAggByVehicle = refuels.reduce((acc, r) => {
      const key = String(r.vehicleId);
      if (!acc[key]) acc[key] = { liters: 0, cost: 0, count: 0 };
      acc[key].liters += Number(r.liters || 0);
      acc[key].cost += Number(r.cost || 0);
      acc[key].count += 1;
      return acc;
    }, {});

    const vehicleInsights = Object.values(tripAggByVehicle).map((row) => {
      const ref = refuelAggByVehicle[row.vehicleId] || { liters: 0, cost: 0, count: 0 };
      const efficiency = ref.liters > 0 ? row.distance / ref.liters : 0;
      const personalRatio = row.distance > 0 ? (row.personalKm / row.distance) * 100 : 0;
      return {
        ...row,
        refuelLiters: ref.liters,
        refuelCost: ref.cost,
        refuelCount: ref.count,
        efficiency,
        personalRatio,
      };
    });

    const topFuelVehicles = [...vehicleInsights]
      .sort((a, b) => b.refuelLiters - a.refuelLiters);
    const lowEfficiencyVehicles = [...vehicleInsights]
      .filter((v) => v.refuelLiters > 0)
      .sort((a, b) => a.efficiency - b.efficiency);
    const topPersonalUsageVehicles = [...vehicleInsights]
      .filter((v) => v.personalKm > 0)
      .sort((a, b) => b.personalKm - a.personalKm);

    const maxTripKmAlert = Number(process.env.VEHICLE_MAX_TRIP_KM || 600);
    const personalRatioAlert = Number(process.env.VEHICLE_PERSONAL_KM_ALERT_RATIO || 30);
    const minEfficiencyAlert = Number(process.env.VEHICLE_MIN_EFFICIENCY_ALERT || 5);

    const alerts = [];
    for (const trip of trips) {
      const vehicle = vehicleMap.get(String(trip.vehicleId)) || {};
      const vehicleLabel = `${vehicle.registrationNo || "No-Reg"}${vehicle.make || vehicle.model ? ` · ${vehicle.make || ""} ${vehicle.model || ""}` : ""}`.trim();
      const tripDate = safeDate(trip.tripDate);
      const route = `${trip.fromPlace || "-"} → ${trip.toPlace || "-"}`;

      if (Number(trip.distance || 0) > maxTripKmAlert) {
        alerts.push({
          type: "sudden_km_jump",
          severity: "high",
          tripId: trip._id,
          vehicleId: trip.vehicleId,
          vehicleLabel,
          message: "Large KM jump detected",
          details: {
            date: tripDate,
            distanceKm: Number(trip.distance || 0),
            thresholdKm: maxTripKmAlert,
            route,
            tripType: trip.tripType || "company",
            odometer: `${trip.startOdometer || 0} → ${trip.endOdometer || 0}`,
          },
        });
      }

      if (!trip.startMeterUrl || !trip.endMeterUrl) {
        alerts.push({
          type: "missing_meter_photo",
          severity: "medium",
          tripId: trip._id,
          vehicleId: trip.vehicleId,
          vehicleLabel,
          message: "Meter photo missing",
          details: {
            date: tripDate,
            route,
            startProof: trip.startMeterUrl ? "Present" : "Missing",
            endProof: trip.endMeterUrl ? "Present" : "Missing",
            tripType: trip.tripType || "company",
          },
        });
      }
    }

    for (const v of vehicleInsights) {
      if (v.personalRatio > personalRatioAlert) {
        alerts.push({
          type: "high_personal_usage",
          severity: "medium",
          vehicleId: v.vehicleId,
          vehicleLabel: `${v.registrationNo || "No-Reg"} · ${v.assignedUserName || "Unassigned"}`,
          message: `${v.registrationNo}: personal KM ratio ${v.personalRatio.toFixed(1)}%`,
          details: {
            personalKm: Number(v.personalKm || 0).toFixed(0),
            companyKm: Number(v.companyKm || 0).toFixed(0),
            totalKm: Number(v.distance || 0).toFixed(0),
            personalRatio: `${Number(v.personalRatio || 0).toFixed(1)}%`,
            threshold: `${personalRatioAlert}%`,
          },
        });
      }

      if (v.refuelLiters > 0 && v.efficiency > 0 && v.efficiency < minEfficiencyAlert) {
        alerts.push({
          type: "low_efficiency",
          severity: "medium",
          vehicleId: v.vehicleId,
          vehicleLabel: `${v.registrationNo || "No-Reg"} · ${v.assignedUserName || "Unassigned"}`,
          message: `${v.registrationNo}: low fuel efficiency ${v.efficiency.toFixed(2)} km/l`,
          details: {
            distanceKm: Number(v.distance || 0).toFixed(1),
            liters: Number(v.refuelLiters || 0).toFixed(1),
            efficiencyKmPerLiter: Number(v.efficiency || 0).toFixed(2),
            thresholdKmPerLiter: Number(minEfficiencyAlert || 0).toFixed(2),
            trips: Number(v.tripCount || 0),
            refuels: Number(v.refuelCount || 0),
          },
        });
      }
    }

    return res.json({
      ok: true,
      range: { start, end },
      kpis: {
        totalVehicles: vehicles.length,
        activeVehicles: activeCount,
        idleVehicles: vehicles.length - activeCount,
        totalTrips: trips.length,
        companyTrips,
        personalTrips,
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
        byStatus,
        byRegion,
        fuelTrendByDay: Object.values(fuelTrendByDay).sort((a, b) => a.date.localeCompare(b.date)),
        maintenanceTrendByDay: Object.values(maintenanceTrendByDay).sort((a, b) => a.date.localeCompare(b.date)),
        maintenanceByType: Object.values(maintenanceByType).sort((a, b) => b.cost - a.cost),
      },
      insights: {
        topFuelVehicles,
        lowEfficiencyVehicles,
        topPersonalUsageVehicles,
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

router.get("/trips", requireAuth, async (_req, res) => {
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