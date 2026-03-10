const express = require("express");
const { requireAuth, requirePermission } = require("../utils/auth");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const SalesOrder = require("../models/SalesOrder");

const router = express.Router();

function normalizeCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.get("/users", requireAuth, requirePermission("liveTracking.view"), async (req, res) => {
  try {
    const users = await User.find({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    })
      .select("fullName role mobile gpsLatitude gpsLongitude regionName zoneName areaName updatedAt")
      .lean();

    return res.json({
      ok: true,
      users: users.map((user) => ({
        ...user,
        gpsLatitude: normalizeCoordinate(user.gpsLatitude),
        gpsLongitude: normalizeCoordinate(user.gpsLongitude),
      })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load live tracking" });
  }
});

router.put("/users/me", requireAuth, requirePermission("liveTracking.view"), async (req, res) => {
  try {
    const body = req.body || {};
    const gpsLatitude = normalizeCoordinate(body.gpsLatitude);
    const gpsLongitude = normalizeCoordinate(body.gpsLongitude);

    if (gpsLatitude === null || gpsLongitude === null) {
      return res.status(400).json({ ok: false, message: "Invalid coordinates" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.uid,
      {
        gpsLatitude: String(gpsLatitude),
        gpsLongitude: String(gpsLongitude),
      },
      { new: true }
    ).select("fullName role mobile gpsLatitude gpsLongitude updatedAt");

    return res.json({ ok: true, user: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update location" });
  }
});

router.get("/summary", requireAuth, requirePermission("liveTracking.view"), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const trackedUsers = await User.countDocuments({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    });
    const activeUsers = await User.countDocuments({ status: "active" });
    const totalVehicles = await Vehicle.countDocuments();
    const trackedVehicles = await Vehicle.countDocuments({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    });
    const activeDispatches = await SalesOrder.countDocuments({ status: "dispatched" });

    return res.json({
      ok: true,
      summary: {
        totalUsers,
        trackedUsers,
        activeUsers,
        totalVehicles,
        trackedVehicles,
        activeDispatches,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load tracking summary" });
  }
});

router.get("/vehicles", requireAuth, requirePermission("liveTracking.view"), async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    })
      .select("vehicleId name type plateNumber driverName gpsLatitude gpsLongitude lastReportedAt updatedAt")
      .lean();

    return res.json({
      ok: true,
      vehicles: vehicles.map((vehicle) => ({
        ...vehicle,
        gpsLatitude: normalizeCoordinate(vehicle.gpsLatitude),
        gpsLongitude: normalizeCoordinate(vehicle.gpsLongitude),
      })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load vehicle tracking" });
  }
});

router.put("/vehicles/:id", requireAuth, requirePermission("liveTracking.view"), async (req, res) => {
  try {
    const gpsLatitude = normalizeCoordinate(req.body?.gpsLatitude);
    const gpsLongitude = normalizeCoordinate(req.body?.gpsLongitude);
    if (gpsLatitude === null || gpsLongitude === null) {
      return res.status(400).json({ ok: false, message: "Invalid coordinates" });
    }

    const updated = await Vehicle.findByIdAndUpdate(
      req.params.id,
      {
        gpsLatitude: String(gpsLatitude),
        gpsLongitude: String(gpsLongitude),
        lastReportedAt: new Date(),
      },
      { new: true }
    ).select("vehicleId name gpsLatitude gpsLongitude lastReportedAt updatedAt");

    if (!updated) {
      return res.status(404).json({ ok: false, message: "Vehicle not found" });
    }

    return res.json({ ok: true, vehicle: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update vehicle location" });
  }
});

router.get("/dispatches", requireAuth, requirePermission("liveTracking.view"), async (req, res) => {
  try {
    const orders = await SalesOrder.find({ status: "dispatched" })
      .sort({ dispatchedAt: -1 })
      .limit(50)
      .lean();

    const vehicleIds = orders.map((order) => order.dispatchVehicleId).filter(Boolean);
    const vehicles = vehicleIds.length
      ? await Vehicle.find({ _id: { $in: vehicleIds } })
          .select("vehicleId name gpsLatitude gpsLongitude lastReportedAt")
          .lean()
      : [];

    const vehicleMap = vehicles.reduce((acc, vehicle) => {
      acc[String(vehicle._id)] = vehicle;
      return acc;
    }, {});

    const dispatches = orders.map((order) => {
      const vehicle = order.dispatchVehicleId ? vehicleMap[order.dispatchVehicleId] : null;
      return {
        _id: order._id,
        orderNo: order.orderNo,
        customerName: order.customerName,
        dispatchedAt: order.dispatchedAt,
        dispatchTracking: order.dispatchTracking,
        dispatchDriverName: order.dispatchDriverName,
        dispatchVehicleName: order.dispatchVehicleName,
        vehicle: vehicle
          ? {
              id: vehicle._id,
              name: vehicle.name || vehicle.vehicleId,
              gpsLatitude: normalizeCoordinate(vehicle.gpsLatitude),
              gpsLongitude: normalizeCoordinate(vehicle.gpsLongitude),
              lastReportedAt: vehicle.lastReportedAt,
            }
          : null,
      };
    });

    return res.json({ ok: true, dispatches });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dispatch tracking" });
  }
});

module.exports = router;