const express = require("express");
const { requireAuth } = require("../utils/auth");
const InventoryMovement = require("../models/InventoryMovement");
const Expense = require("../models/Expense");
const StockTransfer = require("../models/StockTransfer");
const User = require("../models/User");
const SalesOrder = require("../models/SalesOrder");
const Product = require("../models/Product");
const Warehouse = require("../models/Warehouse");
const Vehicle = require("../models/Vehicle");
const Message = require("../models/Message");
const ReturnClaim = require("../models/ReturnClaim");

const router = express.Router();

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
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
      InventoryMovement.aggregate([
        { $match: { movementType: "SALE_OUT" } },
        { $group: { _id: null, orders: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
      ]),
      InventoryMovement.aggregate([
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
      Expense.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          },
        },
      ]),
      User.countDocuments({ status: "active" }),
      User.countDocuments(),
      Product.countDocuments(),
      Warehouse.countDocuments(),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ gpsLatitude: { $ne: "" }, gpsLongitude: { $ne: "" } }),
      Message.countDocuments(),
      ReturnClaim.countDocuments(),
      SalesOrder.aggregate([
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
      InventoryMovement.find().sort({ createdAt: -1 }).limit(5).lean(),
      Expense.find().sort({ createdAt: -1 }).limit(5).lean(),
      StockTransfer.find().sort({ createdAt: -1 }).limit(5).lean(),
      InventoryMovement.aggregate([
        { $match: { movementType: "SALE_OUT", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            quantity: { $sum: "$quantity" },
          },
        },
      ]),
      InventoryMovement.aggregate([
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
      SalesOrder.aggregate([
        { $match: { createdAt: { $gte: dailyStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      SalesOrder.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: { year: { $isoWeekYear: "$createdAt" }, week: { $isoWeek: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      SalesOrder.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      SalesOrder.aggregate([
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

router.get("/operations", requireAuth, async (req, res) => {
  try {
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
      SalesOrder.countDocuments(),
      SalesOrder.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]),
      SalesOrder.countDocuments({
        status: { $in: ["dispatched", "completed"] },
        dispatchedAt: { $ne: null },
        expectedDelivery: { $ne: null },
        $expr: { $lte: ["$dispatchedAt", "$expectedDelivery"] },
      }),
      SalesOrder.countDocuments({
        status: { $in: ["dispatched", "completed"] },
        dispatchedAt: { $ne: null },
        expectedDelivery: { $ne: null },
      }),
      SalesOrder.aggregate([
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
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ gpsLatitude: { $ne: "" }, gpsLongitude: { $ne: "" } }),
      Warehouse.countDocuments(),
      InventoryMovement.aggregate([
        { $match: { createdAt: { $gte: activityStart } } },
        { $group: { _id: "$warehouseId" } },
      ]),
      StockTransfer.countDocuments(),
      StockTransfer.countDocuments({ status: "completed" }),
      StockTransfer.countDocuments({ status: { $in: ["pending", "approved", "transit-in"] } }),
      Expense.countDocuments({ status: "pending" }),
      ReturnClaim.countDocuments({ status: { $in: ["pending", "in_review"] } }),
      (async () => {
        const summary = await InventoryMovement.aggregate([
          {
            $group: {
              _id: { productId: "$productId", warehouseId: "$warehouseId" },
              quantity: { $sum: "$quantity" },
            },
          },
        ]);
        const products = await Product.find().select("productId minStockLevel").lean();
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
      InventoryMovement.aggregate([
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
