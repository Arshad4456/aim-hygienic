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