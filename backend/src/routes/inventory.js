const express = require("express");
const InventoryMovement = require("../models/InventoryMovement");
const StockTransfer = require("../models/StockTransfer");
const Product = require("../models/Product");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

router.post("/movements", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await InventoryMovement.create({
      productId: String(body.productId || "").trim(),
      productName: String(body.productName || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      quantity: Number(body.quantity || 0),
      movementType: String(body.movementType || "").trim(),
      referenceId: String(body.referenceId || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, movement: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create movement" });
  }
});

router.get("/movements", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.productId) query.productId = String(req.query.productId);
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    const items = await InventoryMovement.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, movements: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load movements" });
  }
});

router.post("/transfers", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await StockTransfer.create({
      productId: String(body.productId || "").trim(),
      productName: String(body.productName || "").trim(),
      fromWarehouseId: String(body.fromWarehouseId || "").trim(),
      fromWarehouseName: String(body.fromWarehouseName || "").trim(),
      toWarehouseId: String(body.toWarehouseId || "").trim(),
      toWarehouseName: String(body.toWarehouseName || "").trim(),
      quantity: Number(body.quantity || 0),
      status: String(body.status || "pending").trim(),
      requestedBy: req.user?.uid,
      note: String(body.note || "").trim(),
    });
    return res.status(201).json({ ok: true, transfer: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create transfer" });
  }
});

router.get("/transfers", requireAuth, async (req, res) => {
  try {
    const items = await StockTransfer.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, transfers: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load transfers" });
  }
});

router.put("/transfers/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await StockTransfer.findByIdAndUpdate(
      req.params.id,
      {
        status: String(body.status || "").trim(),
        approvedBy: body.status === "completed" ? req.user?.uid : undefined,
        note: String(body.note || "").trim(),
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, transfer: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update transfer" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const items = await InventoryMovement.aggregate([
      {
        $group: {
          _id: { productId: "$productId", warehouseId: "$warehouseId" },
          productName: { $first: "$productName" },
          warehouseName: { $first: "$warehouseName" },
          quantity: { $sum: "$quantity" },
        },
      },
      { $sort: { productName: 1 } },
    ]);
    return res.json({ ok: true, summary: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load summary" });
  }
});

router.get("/low-stock", requireAuth, async (req, res) => {
  try {
    const summary = await InventoryMovement.aggregate([
      {
        $group: {
          _id: "$productId",
          productName: { $first: "$productName" },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);
    const products = await Product.find().select("productId name minStockLevel").lean();
    const map = new Map(summary.map((s) => [s._id, s.quantity]));
    const lowStock = products
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        minStockLevel: p.minStockLevel || 0,
        quantity: map.get(p.productId) || 0,
      }))
      .filter((p) => p.quantity <= p.minStockLevel);
    return res.json({ ok: true, lowStock });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load low stock" });
  }
});

module.exports = router;