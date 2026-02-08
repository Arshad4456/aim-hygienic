const express = require("express");
const { requireAuth } = require("../utils/auth");
const InventoryMovement = require("../models/InventoryMovement");
const Expense = require("../models/Expense");
const Account = require("../models/Account");
const User = require("../models/User");
const Warehouse = require("../models/Warehouse");
const StockTransfer = require("../models/StockTransfer");
const Vehicle = require("../models/Vehicle");
const Product = require("../models/Product");
const Message = require("../models/Message");

const router = express.Router();

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const [salesAgg] = await InventoryMovement.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);

    const [expenseAgg] = await Expense.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const totalProducts = await Product.countDocuments();
    const totalWarehouses = await Warehouse.countDocuments();
    const expenseCategories = await Expense.distinct("category");
    const userRoles = await User.distinct("role");
    const salesRegions = await InventoryMovement.distinct("regionName", { movementType: "SALE_OUT" });
    const transferStatuses = await StockTransfer.distinct("status");

    return res.json({
      ok: true,
      metrics: {
        totalSalesOrders: salesAgg?.orders || 0,
        totalSalesQuantity: salesAgg?.quantity || 0,
        totalExpenses: safeNumber(expenseAgg?.total),
        pendingExpenses: expenseAgg?.pending || 0,
        totalUsers,
        activeUsers,
        totalProducts,
        totalWarehouses,
        expenseCategories: expenseCategories.filter(Boolean).length,
        userRoles: userRoles.filter(Boolean).length,
        salesRegions: salesRegions.filter(Boolean).length,
        transferStatuses: transferStatuses.filter(Boolean).length,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load report overview" });
  }
});

router.get("/sales", requireAuth, async (req, res) => {
  try {
    const rows = await InventoryMovement.aggregate([
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

    return res.json({
      ok: true,
      regions: rows.map((row) => ({
        region: row._id,
        orders: row.orders,
        quantity: row.quantity,
        lastMovementAt: row.lastMovementAt,
      })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales report" });
  }
});

router.get("/inventory", requireAuth, async (req, res) => {
  try {
    const inTypes = ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"];
    const outTypes = ["SALE_OUT", "TRANSFER_OUT"];

    const rows = await InventoryMovement.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$warehouseName", "Unassigned"] },
          inQty: {
            $sum: {
              $cond: [{ $in: ["$movementType", inTypes] }, "$quantity", 0],
            },
          },
          outQty: {
            $sum: {
              $cond: [{ $in: ["$movementType", outTypes] }, "$quantity", 0],
            },
          },
          movementCount: { $sum: 1 },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastMovementAt: -1 } },
    ]);

    const totalProducts = await Product.countDocuments();

    return res.json({
      ok: true,
      totalProducts,
      warehouses: rows.map((row) => ({
        warehouse: row._id,
        inQty: row.inQty,
        outQty: row.outQty,
        onHand: row.inQty - row.outQty,
        movementCount: row.movementCount,
        lastMovementAt: row.lastMovementAt,
      })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load inventory report" });
  }
});

router.get("/finance", requireAuth, async (req, res) => {
  try {
    const [expenseTotals] = await Expense.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          approved: {
            $sum: {
              $cond: [{ $in: ["$status", ["approved", "paid"]] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    const expensesByCategory = await Expense.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$category", "Uncategorized"] },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const accounts = await Account.find()
      .select("accountName accountType currency currentBalance")
      .sort({ accountName: 1 })
      .lean();

    return res.json({
      ok: true,
      totals: {
        totalExpenses: safeNumber(expenseTotals?.total),
        approvedExpenses: safeNumber(expenseTotals?.approved),
      },
      expensesByCategory: expensesByCategory.map((row) => ({
        category: row._id,
        total: row.total,
        count: row.count,
      })),
      accounts,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load finance report" });
  }
});

router.get("/hr", requireAuth, async (req, res) => {
  try {
    const roleCounts = await User.aggregate([
      { $group: { _id: { $ifNull: ["$role", "Unassigned"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const statusCounts = await User.aggregate([
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
    ]);

    const totalUsers = await User.countDocuments();

    return res.json({
      ok: true,
      totalUsers,
      roleCounts: roleCounts.map((row) => ({ role: row._id, count: row.count })),
      statusCounts: statusCounts.map((row) => ({ status: row._id, count: row.count })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load HR report" });
  }
});

router.get("/logistics", requireAuth, async (req, res) => {
  try {
    const transferCounts = await StockTransfer.aggregate([
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
    ]);
    const vehicleCount = await Vehicle.countDocuments();

    return res.json({
      ok: true,
      vehicleCount,
      transferCounts: transferCounts.map((row) => ({ status: row._id, count: row.count })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load logistics report" });
  }
});

router.get("/compliance", requireAuth, async (req, res) => {
  try {
    const adjustmentCount = await InventoryMovement.countDocuments({ movementType: "ADJUSTMENT" });
    const returnCount = await InventoryMovement.countDocuments({ movementType: "RETURN_IN" });
    const messageCount = await Message.countDocuments();

    return res.json({
      ok: true,
      adjustmentCount,
      returnCount,
      messageCount,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load compliance report" });
  }
});

module.exports = router;