const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../utils/auth");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const SalesOrder = require("../models/SalesOrder");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

function normalizeCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function asText(value) {
  return String(value || "").trim();
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = asText(companyId);
  const normalizedCompanyName = asText(companyName);
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedTrackingModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? asText(requestedCompanyId)
    : asText(req.user?.companyId);
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? asText(requestedCompanyName)
    : asText(req.user?.companyName);

  if (!scopedCompanyId) return { UserModel: User, VehicleModel: Vehicle, SalesOrderModel: SalesOrder };
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) return { UserModel: User, VehicleModel: Vehicle, SalesOrderModel: SalesOrder };

  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    UserModel: getModelFromDb(tenantDb, User),
    VehicleModel: getModelFromDb(tenantDb, Vehicle),
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
  };
}

router.get("/users", requireAuth, async (req, res) => {
  try {
    const { UserModel } = await getScopedTrackingModels(req, req.query?.companyId, req.query?.companyName);
    const users = await UserModel.find({
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

router.put("/users/me", requireAuth, async (req, res) => {
  try {
    const { UserModel } = await getScopedTrackingModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const body = req.body || {};
    const gpsLatitude = normalizeCoordinate(body.gpsLatitude);
    const gpsLongitude = normalizeCoordinate(body.gpsLongitude);

    if (gpsLatitude === null || gpsLongitude === null) {
      return res.status(400).json({ ok: false, message: "Invalid coordinates" });
    }

    const updated = await UserModel.findByIdAndUpdate(
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

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { UserModel, VehicleModel, SalesOrderModel } = await getScopedTrackingModels(req, req.query?.companyId, req.query?.companyName);
    const totalUsers = await UserModel.countDocuments();
    const trackedUsers = await UserModel.countDocuments({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    });
    const activeUsers = await UserModel.countDocuments({ status: "active" });
    const totalVehicles = await VehicleModel.countDocuments();
    const trackedVehicles = await VehicleModel.countDocuments({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    });
    const activeDispatches = await SalesOrderModel.countDocuments({ status: "dispatched" });

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

router.get("/vehicles", requireAuth, async (req, res) => {
  try {
    const { VehicleModel } = await getScopedTrackingModels(req, req.query?.companyId, req.query?.companyName);
    const vehicles = await VehicleModel.find({
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

router.put("/vehicles/:id", requireAuth, async (req, res) => {
  try {
    const { VehicleModel } = await getScopedTrackingModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const gpsLatitude = normalizeCoordinate(req.body?.gpsLatitude);
    const gpsLongitude = normalizeCoordinate(req.body?.gpsLongitude);
    if (gpsLatitude === null || gpsLongitude === null) {
      return res.status(400).json({ ok: false, message: "Invalid coordinates" });
    }

    const updated = await VehicleModel.findByIdAndUpdate(
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

router.get("/dispatches", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, VehicleModel } = await getScopedTrackingModels(req, req.query?.companyId, req.query?.companyName);
    const orders = await SalesOrderModel.find({ status: "dispatched" })
      .sort({ dispatchedAt: -1 })
      .limit(50)
      .lean();

    const vehicleIds = orders.map((order) => order.dispatchVehicleId).filter(Boolean);
    const vehicles = vehicleIds.length
      ? await VehicleModel.find({ _id: { $in: vehicleIds } })
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
