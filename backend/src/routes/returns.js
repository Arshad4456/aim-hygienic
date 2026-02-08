const express = require("express");
const { requireAuth } = require("../utils/auth");
const ReturnClaim = require("../models/ReturnClaim");
const SalesOrder = require("../models/SalesOrder");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const returns = await ReturnClaim.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, returns });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load returns" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { orderNo, customerName, reason, quantity, notes } = req.body || {};
    if (!orderNo || !customerName || !reason) {
      return res.status(400).json({ ok: false, message: "Order number, customer, and reason are required" });
    }

    const order = await SalesOrder.findOne({ orderNo: String(orderNo).trim() }).lean();
    const claim = await ReturnClaim.create({
      orderId: order?._id,
      orderNo: String(orderNo).trim(),
      customerName: String(customerName).trim(),
      reason: String(reason).trim(),
      quantity: Number(quantity || 0),
      notes: notes ? String(notes).trim() : undefined,
    });

    return res.status(201).json({ ok: true, claim });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create return claim" });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body || {};
    const allowed = ["requested", "approved", "rejected", "resolved"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const updates = { status };
    if (notes) updates.notes = String(notes).trim();

    const claim = await ReturnClaim.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!claim) {
      return res.status(404).json({ ok: false, message: "Return claim not found" });
    }
    return res.json({ ok: true, claim });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update return claim" });
  }
});

module.exports = router;