const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../utils/auth");
const InventoryMovement = require("../models/InventoryMovement");
const Expense = require("../models/Expense");
const StockTransfer = require("../models/StockTransfer");
const User = require("../models/User");
const SalesOrder = require("../models/SalesOrder");
const Product = require("../models/Product");
const Warehouse = require("../models/Warehouse");
const Region = require("../models/Region");
const Vehicle = require("../models/Vehicle");
const Message = require("../models/Message");
const ReturnClaim = require("../models/ReturnClaim");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
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

async function resolveScopedCompanyForRequest(req, requestedCompanyId = "", requestedCompanyName = "") {
  if (isSystemLevelAdmin(req.user?.role)) {
    return {
      companyId: asText(requestedCompanyId),
      companyName: asText(requestedCompanyName),
    };
  }

  const tokenCompanyId = asText(req.user?.companyId);
  const tokenCompanyName = asText(req.user?.companyName);
  if (tokenCompanyId || tokenCompanyName) {
    return {
      companyId: tokenCompanyId,
      companyName: tokenCompanyName,
    };
  }

  const normalizedUserId = asText(req.user?.uid);
  if (!normalizedUserId) {
    return { companyId: "", companyName: "" };
  }

  const systemUser = await User.findById(normalizedUserId).select("companyId companyName").lean();
  return {
    companyId: asText(systemUser?.companyId),
    companyName: asText(systemUser?.companyName),
  };
}

async function getScopedDashboardModels(req, requestedCompanyId = "", requestedCompanyName = "", options = {}) {
  const requireTenantForCompanyUser = Boolean(options.requireTenantForCompanyUser);
  const systemAdmin = isSystemLevelAdmin(req.user?.role);
  const { companyId: scopedCompanyId, companyName: scopedCompanyName } = await resolveScopedCompanyForRequest(
    req,
    requestedCompanyId,
    requestedCompanyName
  );
  if (!systemAdmin && requireTenantForCompanyUser && !scopedCompanyId) {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }
  if (!scopedCompanyId) {
    return { InventoryMovementModel: InventoryMovement, ExpenseModel: Expense, StockTransferModel: StockTransfer, UserModel: User, SalesOrderModel: SalesOrder, ProductModel: Product, WarehouseModel: Warehouse, RegionModel: Region, VehicleModel: Vehicle, MessageModel: Message, ReturnClaimModel: ReturnClaim };
  }
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!systemAdmin && requireTenantForCompanyUser && !dbName) {
    throw new Error("TENANT_DB_REQUIRED");
  }
  if (!dbName) {
    return { InventoryMovementModel: InventoryMovement, ExpenseModel: Expense, StockTransferModel: StockTransfer, UserModel: User, SalesOrderModel: SalesOrder, ProductModel: Product, WarehouseModel: Warehouse, RegionModel: Region, VehicleModel: Vehicle, MessageModel: Message, ReturnClaimModel: ReturnClaim };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    InventoryMovementModel: getModelFromDb(tenantDb, InventoryMovement),
    ExpenseModel: getModelFromDb(tenantDb, Expense),
    StockTransferModel: getModelFromDb(tenantDb, StockTransfer),
    UserModel: getModelFromDb(tenantDb, User),
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
    ProductModel: getModelFromDb(tenantDb, Product),
    WarehouseModel: getModelFromDb(tenantDb, Warehouse),
    RegionModel: getModelFromDb(tenantDb, Region),
    VehicleModel: getModelFromDb(tenantDb, Vehicle),
    MessageModel: getModelFromDb(tenantDb, Message),
    ReturnClaimModel: getModelFromDb(tenantDb, ReturnClaim),
  };
}

function buildDateSeries({ startDate, days }) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatYearKey(date) {
  return `${date.getFullYear()}`;
}

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, ExpenseModel, StockTransferModel, UserModel, SalesOrderModel, ProductModel, WarehouseModel, VehicleModel, MessageModel, ReturnClaimModel } = await getScopedDashboardModels(req, req.query?.companyId, req.query?.companyName);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    const monthStart = new Date();
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setDate(1);
    monthStart.setMonth(monthStart.getMonth() - 11);

    const yearStart = new Date();
    yearStart.setHours(0, 0, 0, 0);
    yearStart.setMonth(0, 1);
    yearStart.setFullYear(yearStart.getFullYear() - 2);

    const dailyStart = new Date();
    dailyStart.setHours(0, 0, 0, 0);
    dailyStart.setDate(dailyStart.getDate() - 13);

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 7 * 7);

    const [
      salesAgg,
      inventoryAgg,
      expenseAgg,
      activeUsers,
      totalUsers,
      totalProducts,
      totalWarehouses,
      totalVehicles,
      trackedVehicles,
      totalMessages,
      totalReturns,
      orderSummary,
      recentMovements,
      recentExpenses,
      recentTransfers,
      salesTrendAgg,
      inventoryFlowAgg,
      dailyOrdersAgg,
      weeklyRevenueAgg,
      monthlyRevenueAgg,
      yearlyRevenueAgg,
    ] = await Promise.all([
      InventoryMovementModel.aggregate([
        { $match: { movementType: "SALE_OUT" } },
        { $group: { _id: null, orders: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
      ]),
      InventoryMovementModel.aggregate([
        {
          $group: {
            _id: null,
            inbound: {
              $sum: {
                $cond: [
                  { $in: ["$movementType", ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"]] },
                  "$quantity",
                  0,
                ],
              },
            },
            outbound: {
              $sum: {
                $cond: [
                  { $in: ["$movementType", ["SALE_OUT", "TRANSFER_OUT"]] },
                  "$quantity",
                  0,
                ],
              },
            },
          },
        },
      ]),
      ExpenseModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          },
        },
      ]),
      UserModel.countDocuments({ status: "active" }),
      UserModel.countDocuments(),
      ProductModel.countDocuments(),
      WarehouseModel.countDocuments(),
      VehicleModel.countDocuments(),
      VehicleModel.countDocuments({ gpsLatitude: { $ne: "" }, gpsLongitude: { $ne: "" } }),
      MessageModel.countDocuments(),
      ReturnClaimModel.countDocuments(),
      SalesOrderModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
            dispatched: { $sum: { $cond: [{ $eq: ["$status", "dispatched"] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
      ]),
      InventoryMovementModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      ExpenseModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      StockTransferModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      InventoryMovementModel.aggregate([
        { $match: { movementType: "SALE_OUT", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            quantity: { $sum: "$quantity" },
          },
        },
      ]),
      InventoryMovementModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            inbound: {
              $sum: {
                $cond: [
                  { $in: ["$movementType", ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"]] },
                  "$quantity",
                  0,
                ],
              },
            },
            outbound: {
              $sum: {
                $cond: [
                  { $in: ["$movementType", ["SALE_OUT", "TRANSFER_OUT"]] },
                  "$quantity",
                  0,
                ],
              },
            },
          },
        },
      ]),
      SalesOrderModel.aggregate([
        { $match: { createdAt: { $gte: dailyStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      SalesOrderModel.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: { year: { $isoWeekYear: "$createdAt" }, week: { $isoWeek: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      SalesOrderModel.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      SalesOrderModel.aggregate([
        { $match: { createdAt: { $gte: yearStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const [salesAggDoc] = salesAgg;
    const [inventoryAggDoc] = inventoryAgg;
    const [expenseAggDoc] = expenseAgg;
    const [orderAggDoc] = orderSummary;

    const salesTrendMap = salesTrendAgg.reduce((acc, entry) => {
      acc[entry._id] = safeNumber(entry.orders);
      return acc;
    }, {});

    const inventoryFlowMap = inventoryFlowAgg.reduce((acc, entry) => {
      acc[entry._id] = {
        inbound: safeNumber(entry.inbound),
        outbound: safeNumber(entry.outbound),
      };
      return acc;
    }, {});

    const trendDates = buildDateSeries({ startDate, days: 7 });

    const salesTrend = trendDates.map((date) => {
      const key = formatDateKey(date);
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: salesTrendMap[key] || 0,
      };
    });

    const inventoryFlow = trendDates.map((date) => {
      const key = formatDateKey(date);
      const flow = inventoryFlowMap[key] || {};
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        inbound: safeNumber(flow.inbound),
        outbound: safeNumber(flow.outbound),
      };
    });

    const dailyMap = dailyOrdersAgg.reduce((acc, entry) => {
      acc[entry._id] = {
        orders: safeNumber(entry.orders),
        revenue: safeNumber(entry.revenue),
      };
      return acc;
    }, {});

    const dailySeriesDates = buildDateSeries({ startDate: dailyStart, days: 14 });
    const dailyOrders = dailySeriesDates.map((date) => {
      const key = formatDateKey(date);
      return {
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: dailyMap[key]?.orders || 0,
        revenue: dailyMap[key]?.revenue || 0,
      };
    });

    const weeklyMap = weeklyRevenueAgg.reduce((acc, entry) => {
      const key = `${entry._id.year}-W${String(entry._id.week).padStart(2, "0")}`;
      acc[key] = safeNumber(entry.revenue);
      return acc;
    }, {});

    const weeklySeries = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index * 7);
      const week = `${date.getFullYear()}-W${String(getIsoWeek(date)).padStart(2, "0")}`;
      return {
        label: week,
        value: weeklyMap[week] || 0,
      };
    });

    const monthlyMap = monthlyRevenueAgg.reduce((acc, entry) => {
      acc[entry._id] = safeNumber(entry.revenue);
      return acc;
    }, {});

    const monthlySeries = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(monthStart);
      date.setMonth(monthStart.getMonth() + index);
      const key = formatMonthKey(date);
      return {
        label: date.toLocaleDateString("en-US", { month: "short" }),
        value: monthlyMap[key] || 0,
      };
    });

    const yearlyMap = yearlyRevenueAgg.reduce((acc, entry) => {
      acc[entry._id] = safeNumber(entry.revenue);
      return acc;
    }, {});

    const yearlySeries = Array.from({ length: 3 }, (_, index) => {
      const date = new Date(yearStart);
      date.setFullYear(yearStart.getFullYear() + index);
      const key = formatYearKey(date);
      return {
        label: key,
        value: yearlyMap[key] || 0,
      };
    });

    return res.json({
      ok: true,
      kpis: {
        salesOrders: salesAggDoc?.orders || 0,
        salesQuantity: salesAggDoc?.quantity || 0,
        inventoryOnHand: safeNumber(inventoryAggDoc?.inbound) - safeNumber(inventoryAggDoc?.outbound),
        expenseTotal: safeNumber(expenseAggDoc?.total),
        pendingExpenses: expenseAggDoc?.pending || 0,
        activeUsers,
        totalUsers,
        totalVehicles,
        trackedVehicles,
        totalOrders: orderAggDoc?.total || 0,
        dispatchedOrders: orderAggDoc?.dispatched || 0,
        totalRevenue: safeNumber(orderAggDoc?.totalAmount),
      },
      modules: {
        products: totalProducts,
        warehouses: totalWarehouses,
        vehicles: totalVehicles,
        messages: totalMessages,
        returns: totalReturns,
        salesOrders: orderAggDoc?.total || 0,
        approvedOrders: orderAggDoc?.approved || 0,
        dispatchedOrders: orderAggDoc?.dispatched || 0,
        completedOrders: orderAggDoc?.completed || 0,
      },
      recent: {
        movements: recentMovements,
        expenses: recentExpenses,
        transfers: recentTransfers,
      },
      charts: {
        salesTrend,
        inventoryFlow,
        dailyOrders,
        weeklyRevenue: weeklySeries,
        monthlyRevenue: monthlySeries,
        yearlyRevenue: yearlySeries,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dashboard" });
  }
});

router.get("/sales-manager", requireAuth, async (req, res) => {
  try {
    const { companyId: requestedScopeCompanyId } = await resolveScopedCompanyForRequest(
      req,
      req.query?.companyId,
      req.query?.companyName
    );
    const { UserModel, ProductModel, WarehouseModel, RegionModel, SalesOrderModel } = await getScopedDashboardModels(
      req,
      req.query?.companyId,
      req.query?.companyName,
      { requireTenantForCompanyUser: true }
    );
    const currentUser = await UserModel.findById(req.user?.uid).lean()
      || await User.findById(req.user?.uid).select("_id companyId companyName").lean();
    if (!currentUser) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    const companyId = String(requestedScopeCompanyId || currentUser.companyId || "").trim();
    const companyName = String(currentUser.companyName || req.user?.companyName || "").trim();
    if (!companyId && !isSystemLevelAdmin(req.user?.role)) {
      return res.status(400).json({ ok: false, message: "Company context is required for sales dashboard" });
    }

    const teamQuery = companyId ? { companyId } : { _id: currentUser._id };
    const orderMatchBase = companyId ? { companyId } : {};

    const [teamUsers, activeUsers, productCount, warehouseCount, regionCount] = await Promise.all([
      UserModel.find(teamQuery).select("_id status").lean(),
      UserModel.countDocuments({ ...teamQuery, status: "active" }),
      ProductModel.countDocuments(companyId ? { companyId } : { createdBy: currentUser._id }),
      WarehouseModel.countDocuments(companyId ? { companyId } : { createdBy: currentUser._id }),
      RegionModel.countDocuments(companyId ? { companyId } : { createdBy: currentUser._id }),
    ]);

    const teamIds = teamUsers.map((user) => user._id);
    const orderMatch = companyId
      ? { companyId }
      : (teamIds.length
        ? { ...orderMatchBase, createdBy: { $in: teamIds } }
        : { ...orderMatchBase, createdBy: currentUser._id });

    const [orderAgg, statusAgg, recentOrders] = await Promise.all([
      SalesOrderModel.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      SalesOrderModel.aggregate([
        { $match: orderMatch },
        { $group: { _id: "$status", total: { $sum: 1 } } },
      ]),
      SalesOrderModel.find(orderMatch).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const [orderDoc] = orderAgg;
    const statusMap = statusAgg.reduce((acc, entry) => {
      acc[entry._id] = safeNumber(entry.total);
      return acc;
    }, {});

    return res.json({
      ok: true,
      company: {
        id: companyId || null,
        name: companyName || null,
      },
      team: {
        totalUsers: teamUsers.length,
        activeUsers,
      },
      assets: {
        products: productCount,
        warehouses: warehouseCount,
        regions: regionCount,
      },
      orders: {
        total: safeNumber(orderDoc?.total),
        revenue: safeNumber(orderDoc?.revenue),
        byStatus: {
          pending: safeNumber(statusMap.pending),
          approved: safeNumber(statusMap.approved),
          dispatched: safeNumber(statusMap.dispatched),
          completed: safeNumber(statusMap.completed),
          cancelled: safeNumber(statusMap.cancelled),
        },
      },
      recentOrders,
    });
  } catch (e) {
    if (e?.message === "TENANT_CONTEXT_REQUIRED" || e?.message === "TENANT_DB_REQUIRED") {
      return res.status(400).json({ ok: false, message: "Tenant company database context is required for sales dashboard" });
    }
    return res.status(500).json({ ok: false, message: "Failed to load sales dashboard" });
  }
});

router.get("/operations", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, VehicleModel, WarehouseModel, InventoryMovementModel, StockTransferModel, ExpenseModel, ReturnClaimModel, ProductModel } = await getScopedDashboardModels(req, req.query?.companyId, req.query?.companyName);
    const activityStart = new Date();
    activityStart.setHours(0, 0, 0, 0);
    activityStart.setDate(activityStart.getDate() - 13);

    const [
      totalOrders,
      orderStatusAgg,
      onTimeDispatchCount,
      dispatchedWithEtaCount,
      cycleTimeAgg,
      totalVehicles,
      trackedVehicles,
      totalWarehouses,
      activeWarehousesAgg,
      totalTransfers,
      completedTransfers,
      pendingTransfers,
      pendingExpenses,
      pendingReturns,
      lowStockItems,
      regionalActivityAgg,
    ] = await Promise.all([
      SalesOrderModel.countDocuments(),
      SalesOrderModel.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]),
      SalesOrderModel.countDocuments({
        status: { $in: ["dispatched", "completed"] },
        dispatchedAt: { $ne: null },
        expectedDelivery: { $ne: null },
        $expr: { $lte: ["$dispatchedAt", "$expectedDelivery"] },
      }),
      SalesOrderModel.countDocuments({
        status: { $in: ["dispatched", "completed"] },
        dispatchedAt: { $ne: null },
        expectedDelivery: { $ne: null },
      }),
      SalesOrderModel.aggregate([
        { $match: { status: "completed", completedAt: { $ne: null } } },
        {
          $project: {
            hours: {
              $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 1000 * 60 * 60],
            },
          },
        },
        { $group: { _id: null, avgHours: { $avg: "$hours" } } },
      ]),
      VehicleModel.countDocuments(),
      VehicleModel.countDocuments({ gpsLatitude: { $ne: "" }, gpsLongitude: { $ne: "" } }),
      WarehouseModel.countDocuments(),
      InventoryMovementModel.aggregate([
        { $match: { createdAt: { $gte: activityStart } } },
        { $group: { _id: "$warehouseId" } },
      ]),
      StockTransferModel.countDocuments(),
      StockTransferModel.countDocuments({ status: "completed" }),
      StockTransferModel.countDocuments({ status: { $in: ["pending", "approved", "transit-in"] } }),
      ExpenseModel.countDocuments({ status: "pending" }),
      ReturnClaimModel.countDocuments({ status: { $in: ["pending", "in_review"] } }),
      (async () => {
        const summary = await InventoryMovementModel.aggregate([
          {
            $group: {
              _id: { productId: "$productId", warehouseId: "$warehouseId" },
              quantity: { $sum: "$quantity" },
            },
          },
        ]);
        const products = await ProductModel.find().select("productId minStockLevel").lean();
        return products.flatMap((product) => {
          const matches = summary.filter((s) => s._id.productId === product.productId);
          if (!matches.length) {
            return [
              {
                productId: product.productId,
                minStockLevel: product.minStockLevel || 0,
                quantity: 0,
              },
            ];
          }
          return matches.map((s) => ({
            productId: product.productId,
            minStockLevel: product.minStockLevel || 0,
            quantity: s.quantity || 0,
          }));
        });
      })(),
      InventoryMovementModel.aggregate([
        { $match: { movementType: "SALE_OUT", createdAt: { $gte: activityStart } } },
        {
          $group: {
            _id: "$regionName",
            orders: { $sum: 1 },
            quantity: { $sum: "$quantity" },
          },
        },
        { $sort: { orders: -1 } },
        { $limit: 3 },
      ]),
    ]);

    const statusMap = orderStatusAgg.reduce((acc, entry) => {
      acc[entry._id] = safeNumber(entry.total);
      return acc;
    }, {});

    const pendingOrders = safeNumber(statusMap.pending);
    const approvedOrders = safeNumber(statusMap.approved);
    const dispatchedOrders = safeNumber(statusMap.dispatched);
    const completedOrders = safeNumber(statusMap.completed);
    const totalActiveOrders = totalOrders || 0;

    const orderFillRate =
      totalActiveOrders === 0
        ? 0
        : Math.round(((dispatchedOrders + completedOrders) / totalActiveOrders) * 1000) / 10;

    const onTimeDispatchRate =
      dispatchedWithEtaCount === 0
        ? 0
        : Math.round((onTimeDispatchCount / dispatchedWithEtaCount) * 1000) / 10;

    const [cycleTimeDoc] = cycleTimeAgg;
    const cycleTimeHours = cycleTimeDoc?.avgHours ? Math.round(cycleTimeDoc.avgHours * 10) / 10 : 0;

    const activeWarehouses = activeWarehousesAgg.length;
    const warehouseUtilization =
      totalWarehouses === 0 ? 0 : Math.round((activeWarehouses / totalWarehouses) * 100);

    const fleetCoverage =
      totalVehicles === 0 ? 0 : Math.round((trackedVehicles / totalVehicles) * 100);

    const approvalRate =
      totalActiveOrders === 0
        ? 0
        : Math.round(((approvedOrders + dispatchedOrders + completedOrders) / totalActiveOrders) * 100);

    const transferCompletionRate =
      totalTransfers === 0 ? 0 : Math.round((completedTransfers / totalTransfers) * 100);

    const lowStockCount = lowStockItems.filter((item) => item.quantity <= item.minStockLevel).length;

    const alerts = [
      {
        title: "Pending order approvals",
        detail: `${pendingOrders + approvedOrders} orders awaiting dispatch readiness.`,
        severity: pendingOrders + approvedOrders > 20 ? "High" : "Medium",
      },
      {
        title: "Low stock risk",
        detail: `${lowStockCount} SKUs at or below minimum stock level.`,
        severity: lowStockCount > 0 ? "Medium" : "Low",
      },
      {
        title: "Stock transfers in progress",
        detail: `${pendingTransfers} transfers still in transit or pending approval.`,
        severity: pendingTransfers > 10 ? "Medium" : "Low",
      },
    ];

    const focusItems = [
      {
        title: "Clear backlog approvals",
        owner: "Order Desk",
        time: `${pendingOrders} pending orders`,
      },
      {
        title: "Resolve low stock replenishment",
        owner: "Inventory Team",
        time: `${lowStockCount} items below threshold`,
      },
      {
        title: "Complete transfer confirmations",
        owner: "Warehouse Ops",
        time: `${pendingTransfers} transfers open`,
      },
      {
        title: "Review pending expenses",
        owner: "Finance Ops",
        time: `${pendingExpenses} expense requests`,
      },
      {
        title: "Review return claims",
        owner: "Quality Team",
        time: `${pendingReturns} claims pending`,
      },
    ];

    const totalRegionalOrders = regionalActivityAgg.reduce((sum, row) => sum + safeNumber(row.orders), 0);
    const regionalCompletion = regionalActivityAgg.map((row) => {
      const percentage =
        totalRegionalOrders === 0 ? 0 : Math.round((safeNumber(row.orders) / totalRegionalOrders) * 100);
      return {
        region: row._id || "Unassigned",
        value: percentage,
        orders: safeNumber(row.orders),
      };
    });

    return res.json({
      ok: true,
      kpis: {
        orderFillRate,
        onTimeDispatchRate,
        cycleTimeHours,
        backlogOrders: pendingOrders + approvedOrders,
        totalOrders: totalActiveOrders,
        approvedOrders,
        dispatchedOrders,
        completedOrders,
      },
      serviceHealth: [
        {
          title: "Fleet Tracking Coverage",
          value: fleetCoverage,
          note: `${trackedVehicles}/${totalVehicles} vehicles reporting`,
        },
        {
          title: "Warehouse Activity",
          value: warehouseUtilization,
          note: `${activeWarehouses}/${totalWarehouses} active in last 14 days`,
        },
        {
          title: "Order Approval Rate",
          value: approvalRate,
          note: `${approvedOrders + dispatchedOrders + completedOrders} of ${totalActiveOrders} orders`,
        },
        {
          title: "Transfer Completion",
          value: transferCompletionRate,
          note: `${completedTransfers}/${totalTransfers} transfers closed`,
        },
      ],
      alerts,
      focusItems,
      pipeline: [
        { label: "Orders Captured", value: totalActiveOrders },
        { label: "Orders Approved", value: approvedOrders },
        { label: "Picking & Packing", value: approvedOrders + dispatchedOrders },
        { label: "Dispatched", value: dispatchedOrders + completedOrders },
      ],
      regionalCompletion,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load operations dashboard" });
  }
});

function getIsoWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
  return weekNumber;
}

module.exports = router;