const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../utils/auth");
const InventoryMovement = require("../models/InventoryMovement");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");
const { createModuleAccessGuard } = require("../utils/moduleAccess");

const router = express.Router();

function toTrimmedString(value) {
  return String(value || "").trim();
}

function isSystemLevelAdmin(role) {
  const normalized = toTrimmedString(role).toLowerCase();
  return normalized === "admin" || normalized === "system admin";
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = toTrimmedString(companyId);
  const normalizedCompanyName = toTrimmedString(companyName);
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedInventoryMovementModel(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? toTrimmedString(requestedCompanyId)
    : toTrimmedString(req.user?.companyId);
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? toTrimmedString(requestedCompanyName)
    : toTrimmedString(req.user?.companyName);

  if (!scopedCompanyId) return InventoryMovement;
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) return InventoryMovement;
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return getModelFromDb(tenantDb, InventoryMovement);
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(days) {
  const dates = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toDateString(d));
  }
  return dates;
}

router.get("/summary", requireAuth, createModuleAccessGuard("dashboard.sales-kpi"), async (req, res) => {
  try {
    const InventoryMovementModel = await getScopedInventoryMovementModel(
      req,
      req.query?.companyId,
      req.query?.companyName,
    );
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

    const [salesAgg] = await InventoryMovementModel.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      { $group: { _id: null, orders: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
    ]);

    const regions = await InventoryMovementModel.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      {
        $group: {
          _id: { $ifNull: ["$regionName", "Unassigned"] },
          orders: { $sum: 1 },
          quantity: { $sum: "$quantity" },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $sort: { quantity: -1 } },
    ]);

    const products = await InventoryMovementModel.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      {
        $group: {
          _id: { $ifNull: ["$productName", "Unassigned"] },
          quantity: { $sum: "$quantity" },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);

    const warehouses = await InventoryMovementModel.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      {
        $group: {
          _id: { $ifNull: ["$warehouseName", "Unassigned"] },
          quantity: { $sum: "$quantity" },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]);

    const weeklyAgg = await InventoryMovementModel.aggregate([
      {
        $match: {
          movementType: "SALE_OUT",
          createdAt: { $gte: startOfPrevWeek },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          orders: { $sum: 1 },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);

    const dateMap = weeklyAgg.reduce((acc, row) => {
      acc[row._id] = { orders: row.orders, quantity: row.quantity };
      return acc;
    }, {});
    const last7Dates = buildDateRange(7);
    const trend = last7Dates.map((day) => ({
      day,
      orders: dateMap[day]?.orders || 0,
      quantity: dateMap[day]?.quantity || 0,
    }));
    const prev7Dates = buildDateRange(14).slice(0, 7);
    const totals = (days) =>
      days.reduce(
        (acc, day) => {
          acc.orders += dateMap[day]?.orders || 0;
          acc.quantity += dateMap[day]?.quantity || 0;
          return acc;
        },
        { orders: 0, quantity: 0 }
      );
    const last7Totals = totals(last7Dates);
    const prev7Totals = totals(prev7Dates);
    const weekOverWeek =
      prev7Totals.orders > 0
        ? Math.round(((last7Totals.orders - prev7Totals.orders) / prev7Totals.orders) * 100)
        : last7Totals.orders > 0
        ? 100
        : 0;

    return res.json({
      ok: true,
      summary: {
        orders: salesAgg?.orders || 0,
        quantity: salesAgg?.quantity || 0,
        regions: regions.length,
        weekOrders: last7Totals.orders,
        weekQuantity: last7Totals.quantity,
        weekOverWeek,
      },
      regions: regions.map((row) => ({
        region: row._id,
        orders: row.orders,
        quantity: row.quantity,
        lastMovementAt: row.lastMovementAt,
      })),
      topProducts: products.map((row) => ({
        product: row._id,
        quantity: row.quantity,
        lastMovementAt: row.lastMovementAt,
      })),
      topWarehouses: warehouses.map((row) => ({
        warehouse: row._id,
        quantity: row.quantity,
        lastMovementAt: row.lastMovementAt,
      })),
      trend,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales KPI" });
  }
});

module.exports = router;