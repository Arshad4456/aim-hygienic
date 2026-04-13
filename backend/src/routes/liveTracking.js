const express = require("express");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const SecondaryOrder = require("../models/SecondaryOrder");
const CompanyDispatchNote = require("../models/CompanyDispatchNote");
const CompanySalesOrder = require("../models/CompanySalesOrder");
const { requireAuth } = require("../utils/auth");
const { getScopedModels, asText, normalizeRole } = require("../services/scopedModels");

const router = express.Router();

function normalizeCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getScopedTrackingModels(req) {
  return getScopedModels(req, {
    UserModel: User,
    VehicleModel: Vehicle,
    SecondaryOrderModel: SecondaryOrder,
    CompanyDispatchNoteModel: CompanyDispatchNote,
    CompanySalesOrderModel: CompanySalesOrder,
  });
}

function roleScopedBaseQuery(req) {
  const role = normalizeRole(req.user?.role);
  const companyId = asText(req.user?.companyId);
  const distributorId = asText(req.user?.distributorId || req.user?.uid);
  const query = { companyId };

  if (role === "distributor") {
    query.$or = [{ distributorId }, { ownerId: distributorId }];
  }

  return query;
}

function buildVehicleMap(rows = []) {
  return rows.reduce((acc, row) => {
    acc[String(row._id)] = row;
    return acc;
  }, {});
}

router.get("/users", requireAuth, async (req, res) => {
  try {
    const { UserModel } = await getScopedTrackingModels(req);
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
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load live tracking" });
  }
});

router.put("/users/me", requireAuth, async (req, res) => {
  try {
    const { UserModel } = await getScopedTrackingModels(req);
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
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to update location" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const {
      UserModel,
      VehicleModel,
      SecondaryOrderModel,
      CompanyDispatchNoteModel,
    } = await getScopedTrackingModels(req);
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

    const baseQuery = roleScopedBaseQuery(req);
    const [secondaryDispatches, companyDispatches] = await Promise.all([
      SecondaryOrderModel.countDocuments({
        companyId: baseQuery.companyId,
        ...(baseQuery.$or ? { $or: baseQuery.$or } : {}),
        status: { $in: ["dispatched", "delivered"] },
      }),
      CompanyDispatchNoteModel.countDocuments({
        companyId: baseQuery.companyId,
        ...(baseQuery.$or ? { $or: baseQuery.$or } : {}),
        status: { $in: ["posted", "delivered"] },
      }),
    ]);

    return res.json({
      ok: true,
      summary: {
        totalUsers,
        trackedUsers,
        activeUsers,
        totalVehicles,
        trackedVehicles,
        activeDispatches: secondaryDispatches + companyDispatches,
      },
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load tracking summary" });
  }
});

router.get("/vehicles", requireAuth, async (req, res) => {
  try {
    const { VehicleModel } = await getScopedTrackingModels(req);
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
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load vehicle tracking" });
  }
});

router.put("/vehicles/:id", requireAuth, async (req, res) => {
  try {
    const { VehicleModel } = await getScopedTrackingModels(req);
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
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to update vehicle location" });
  }
});

router.get("/dispatches", requireAuth, async (req, res) => {
  try {
    const {
      SecondaryOrderModel,
      CompanyDispatchNoteModel,
      CompanySalesOrderModel,
      VehicleModel,
      UserModel,
    } = await getScopedTrackingModels(req);
    const baseQuery = roleScopedBaseQuery(req);

    const [secondaryOrders, companyDispatchNotes] = await Promise.all([
      SecondaryOrderModel.find({
        companyId: baseQuery.companyId,
        ...(baseQuery.$or ? { $or: baseQuery.$or } : {}),
        status: { $in: ["dispatched", "delivered"] },
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(50)
        .lean(),
      CompanyDispatchNoteModel.find({
        companyId: baseQuery.companyId,
        ...(baseQuery.$or ? { $or: baseQuery.$or } : {}),
        status: { $in: ["posted", "delivered"] },
      })
        .sort({ dispatchedAt: -1, createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const companySalesOrderIds = companyDispatchNotes.map((row) => row.companySalesOrderId).filter(Boolean);
    const vehicleIds = [
      ...companyDispatchNotes.map((row) => row.vehicleId).filter(Boolean),
    ];
    const driverIds = companyDispatchNotes.map((row) => row.driverUserId).filter(Boolean);

    const [companyOrders, vehicles, drivers] = await Promise.all([
      companySalesOrderIds.length
        ? CompanySalesOrderModel.find({ _id: { $in: companySalesOrderIds } }).select("documentNo distributor").lean()
        : [],
      vehicleIds.length
        ? VehicleModel.find({ _id: { $in: vehicleIds } })
            .select("vehicleId name gpsLatitude gpsLongitude lastReportedAt")
            .lean()
        : [],
      driverIds.length
        ? UserModel.find({ _id: { $in: driverIds } }).select("fullName username").lean()
        : [],
    ]);

    const companyOrderMap = companyOrders.reduce((acc, row) => {
      acc[String(row._id)] = row;
      return acc;
    }, {});
    const vehicleMap = buildVehicleMap(vehicles);
    const driverMap = drivers.reduce((acc, row) => {
      acc[String(row._id)] = row;
      return acc;
    }, {});

    const mappedSecondary = secondaryOrders.map((order) => ({
      _id: order._id,
      orderNo: order.documentNo,
      customerName: order?.customer?.partyName || order?.customer?.partyCode || "Customer",
      dispatchedAt: order.podUploadedAt || order.updatedAt || order.createdAt,
      dispatchTracking: order.dispatchStatus || order.status,
      dispatchDriverName: order.salesmanUserId ? `Salesman ${order.salesmanUserId}` : "",
      dispatchVehicleName: "",
      vehicle: null,
      type: "secondary_order",
    }));

    const mappedCompany = companyDispatchNotes.map((dispatch) => {
      const order = companyOrderMap[String(dispatch.companySalesOrderId)] || null;
      const vehicle = dispatch.vehicleId ? vehicleMap[String(dispatch.vehicleId)] : null;
      const driver = dispatch.driverUserId ? driverMap[String(dispatch.driverUserId)] : null;
      return {
        _id: dispatch._id,
        orderNo: order?.documentNo || dispatch.documentNo,
        customerName: order?.distributor?.partyName || dispatch.distributorId || "Distributor",
        dispatchedAt: dispatch.dispatchedAt || dispatch.updatedAt || dispatch.createdAt,
        dispatchTracking: dispatch.status,
        dispatchDriverName: driver?.fullName || driver?.username || "",
        dispatchVehicleName: vehicle?.name || vehicle?.vehicleId || "",
        vehicle: vehicle
          ? {
              id: vehicle._id,
              name: vehicle.name || vehicle.vehicleId,
              gpsLatitude: normalizeCoordinate(vehicle.gpsLatitude),
              gpsLongitude: normalizeCoordinate(vehicle.gpsLongitude),
              lastReportedAt: vehicle.lastReportedAt,
            }
          : null,
        type: "company_dispatch",
      };
    });

    const dispatches = [...mappedCompany, ...mappedSecondary]
      .sort((a, b) => new Date(b.dispatchedAt || 0) - new Date(a.dispatchedAt || 0))
      .slice(0, 50);

    return res.json({ ok: true, dispatches });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load dispatch tracking" });
  }
});

module.exports = router;
