const express = require("express");
const Expense = require("../models/Expense");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Expense.create({
      expenseId: String(body.expenseId || "").trim(),
      title: String(body.title || "").trim(),
      category: String(body.category || "").trim(),
      costCenter: String(body.costCenter || "").trim(),
      vendorName: String(body.vendorName || "").trim(),
      amount: toNumber(body.amount),
      currency: String(body.currency || "BDT").trim(),
      paymentMode: String(body.paymentMode || "cash").trim(),
      paymentReference: String(body.paymentReference || "").trim(),
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
      status: String(body.status || "pending").trim(),
      requestedBy: String(body.requestedBy || "").trim(),
      approvedBy: String(body.approvedBy || "").trim(),
      notes: String(body.notes || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, expense: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Expense ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create expense" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = String(req.query.status);
    if (req.query.costCenter) query.costCenter = String(req.query.costCenter);
    if (req.query.paymentMode) query.paymentMode = String(req.query.paymentMode);
    const items = await Expense.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, expenses: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load expenses" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Expense.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, expense: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        expenseId: String(body.expenseId || "").trim(),
        title: String(body.title || "").trim(),
        category: String(body.category || "").trim(),
        costCenter: String(body.costCenter || "").trim(),
        vendorName: String(body.vendorName || "").trim(),
        amount: toNumber(body.amount),
        currency: String(body.currency || "BDT").trim(),
        paymentMode: String(body.paymentMode || "cash").trim(),
        paymentReference: String(body.paymentReference || "").trim(),
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
        status: String(body.status || "pending").trim(),
        requestedBy: String(body.requestedBy || "").trim(),
        approvedBy: String(body.approvedBy || "").trim(),
        notes: String(body.notes || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, expense: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Expense ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update expense" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
