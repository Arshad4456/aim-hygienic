const express = require("express");
const { requireAuth } = require("../utils/auth");
const InventoryMovement = require("../models/InventoryMovement");
const Expense = require("../models/Expense");
const StockTransfer = require("../models/StockTransfer");
const User = require("../models/User");

const router = express.Router();

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    const [salesAgg] = await InventoryMovement.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      { $group: { _id: null, orders: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
    ]);

    const [inventoryAgg] = await InventoryMovement.aggregate([
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
    ]);

    const [expenseAgg] = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" }, pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } } } },
    ]);

    const activeUsers = await User.countDocuments({ status: "active" });

    const recentMovements = await InventoryMovement.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentExpenses = await Expense.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentTransfers = await StockTransfer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const salesTrendAgg = await InventoryMovement.aggregate([
      { $match: { movementType: "SALE_OUT", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);

    const inventoryFlowAgg = await InventoryMovement.aggregate([
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
    ]);

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

    const trendDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return date;
    });

    const salesTrend = trendDates.map((date) => {
      const key = date.toISOString().slice(0, 10);
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: salesTrendMap[key] || 0,
      };
    });

    const inventoryFlow = trendDates.map((date) => {
      const key = date.toISOString().slice(0, 10);
      const flow = inventoryFlowMap[key] || {};
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        inbound: safeNumber(flow.inbound),
        outbound: safeNumber(flow.outbound),
      };
    });

    return res.json({
      ok: true,
      kpis: {
        salesOrders: salesAgg?.orders || 0,
        salesQuantity: salesAgg?.quantity || 0,
        inventoryOnHand: safeNumber(inventoryAgg?.inbound) - safeNumber(inventoryAgg?.outbound),
        expenseTotal: safeNumber(expenseAgg?.total),
        pendingExpenses: expenseAgg?.pending || 0,
        activeUsers,
      },
      recent: {
        movements: recentMovements,
        expenses: recentExpenses,
        transfers: recentTransfers,
      },
      charts: {
        salesTrend,
        inventoryFlow,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dashboard" });
  }
});

module.exports = router;