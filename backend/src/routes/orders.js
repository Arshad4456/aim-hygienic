const express = require("express");
const { requireAuth } = require("../utils/auth");
const SalesOrder = require("../models/SalesOrder");

const router = express.Router();

function normalizeItems(items = []) {
  return items
    .filter((item) => item && item.productName && Number(item.quantity) > 0)
    .map((item) => ({
      productName: String(item.productName).trim(),
      productCode: item.productCode ? String(item.productCode).trim() : undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice || 0),
    }));
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales orders" });
  }
});

router.get("/approvals", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load approval queue" });
  }
});

router.get("/dispatch", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find({ status: { $in: ["approved", "dispatched"] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dispatch queue" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const [summary] = await SalesOrder.aggregate([
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
    ]);

    const recentOrders = await SalesOrder.find().sort({ createdAt: -1 }).limit(5).lean();

    return res.json({
      ok: true,
      summary: {
        total: summary?.total || 0,
        pending: summary?.pending || 0,
        approved: summary?.approved || 0,
        dispatched: summary?.dispatched || 0,
        completed: summary?.completed || 0,
        totalAmount: summary?.totalAmount || 0,
      },
      recentOrders,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales order summary" });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status, dispatchTracking, cancellationReason } = req.body || {};
    const allowed = ["pending", "approved", "dispatched", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const updates = { status };
    if (dispatchTracking) updates.dispatchTracking = String(dispatchTracking).trim();
    if (cancellationReason) updates.cancellationReason = String(cancellationReason).trim();
    if (status === "dispatched") updates.dispatchedAt = new Date();
    if (status === "completed") updates.completedAt = new Date();

    const order = await SalesOrder.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }
    return res.json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update order status" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { orderNo, customerName, customerType, expectedDelivery, notes } = req.body || {};
    const items = normalizeItems(req.body?.items || []);

    if (!customerName || !items.length) {
      return res.status(400).json({ ok: false, message: "Customer name and order items are required" });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const order = await SalesOrder.create({
      orderNo: orderNo || `SO-${Date.now()}`,
      customerName: String(customerName).trim(),
      customerType: customerType || "customer",
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      items,
      totalAmount,
      notes: notes ? String(notes).trim() : undefined,
      createdBy: req.user?._id,
    });

    return res.status(201).json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create sales order" });
  }
});

module.exports = router;
