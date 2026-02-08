const express = require("express");
const { requireAuth } = require("../utils/auth");
const InventoryMovement = require("../models/InventoryMovement");

const router = express.Router();

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const [salesAgg] = await InventoryMovement.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      { $group: { _id: null, orders: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
    ]);

    const regions = await InventoryMovement.aggregate([
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

    const products = await InventoryMovement.aggregate([
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

    const warehouses = await InventoryMovement.aggregate([
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

    return res.json({
      ok: true,
      summary: {
        orders: salesAgg?.orders || 0,
        quantity: salesAgg?.quantity || 0,
        regions: regions.length,
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
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales KPI" });
  }
});

module.exports = router;