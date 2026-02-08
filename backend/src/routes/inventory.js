const express = require("express");
const InventoryMovement = require("../models/InventoryMovement");
const StockTransfer = require("../models/StockTransfer");
const Product = require("../models/Product");
const { requireAuth, requireRole } = require("../utils/auth");

const router = express.Router();

router.post("/movements", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await InventoryMovement.create({
      productId: String(body.productId || "").trim(),
      productName: String(body.productName || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      areaId: String(body.areaId || "").trim(),
      areaName: String(body.areaName || "").trim(),
      movementScope: String(body.movementScope || "warehouse").trim(),
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
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);
    if (req.query.areaId) query.areaId = String(req.query.areaId);
    if (req.query.movementType) query.movementType = String(req.query.movementType);
    const items = await InventoryMovement.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, movements: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load movements" });
  }
});

router.put("/movements/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await InventoryMovement.findByIdAndUpdate(
      req.params.id,
      {
        productId: String(body.productId || "").trim(),
        productName: String(body.productName || "").trim(),
        warehouseId: String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        zoneId: String(body.zoneId || "").trim(),
        zoneName: String(body.zoneName || "").trim(),
        areaId: String(body.areaId || "").trim(),
        areaName: String(body.areaName || "").trim(),
        movementScope: String(body.movementScope || "warehouse").trim(),
        quantity: Number(body.quantity || 0),
        movementType: String(body.movementType || "").trim(),
        referenceId: String(body.referenceId || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, movement: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update movement" });
  }
});

router.delete("/movements/clear", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    await InventoryMovement.deleteMany({});
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to clear movements" });
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
      driverId: String(body.driverId || "").trim(),
      driverName: String(body.driverName || "").trim(),
      vehicleId: String(body.vehicleId || "").trim(),
      vehicleName: String(body.vehicleName || "").trim(),
      requestedBy: req.user?.uid,
      note: String(body.note || "").trim(),
    });
    doc.statusHistory = [{ status: doc.status, at: new Date(), by: req.user?.uid }];
    await doc.save();
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
    const updatePayload = {
      status: String(body.status || "").trim(),
      note: String(body.note || "").trim(),
      driverId: String(body.driverId || "").trim(),
      driverName: String(body.driverName || "").trim(),
      vehicleId: String(body.vehicleId || "").trim(),
      vehicleName: String(body.vehicleName || "").trim(),
    };
    if (updatePayload.status === "approved") updatePayload.approvedBy = req.user?.uid;
    const updated = await StockTransfer.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    if (updatePayload.status) {
      updated.statusHistory = [
        ...(updated.statusHistory || []),
        { status: updatePayload.status, at: new Date(), by: req.user?.uid },
      ];
      await updated.save();
    }
    return res.json({ ok: true, transfer: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update transfer" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const match = {};
    if (req.query.warehouseId) match.warehouseId = String(req.query.warehouseId);
    const items = await InventoryMovement.aggregate([
      { $match: match },
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
          _id: { productId: "$productId", warehouseId: "$warehouseId" },
          productName: { $first: "$productName" },
          warehouseId: { $first: "$warehouseId" },
          warehouseName: { $first: "$warehouseName" },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);
    const products = await Product.find().select("productId name minStockLevel").lean();
    const map = new Map(summary.map((s) => [`${s._id.productId}:${s._id.warehouseId}`, s]));
    const lowStock = products
      .flatMap((p) => {
        const matches = summary.filter((s) => s._id.productId === p.productId);
        if (!matches.length) {
          return [
            {
              productDbId: p._id,
              productId: p.productId,
              name: p.name,
              minStockLevel: p.minStockLevel || 0,
              quantity: 0,
              warehouseId: "",
              warehouseName: "",
            },
          ];
        }
        return matches.map((s) => ({
          productDbId: p._id,
          productId: p.productId,
          name: p.name,
          minStockLevel: p.minStockLevel || 0,
          quantity: s.quantity || 0,
          warehouseId: s.warehouseId || "",
          warehouseName: s.warehouseName || "",
        }));
      })
      .filter((p) => p.quantity <= p.minStockLevel);
    return res.json({ ok: true, lowStock });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load low stock" });
  }
});

module.exports = router;
