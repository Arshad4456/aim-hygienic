const express = require("express");
const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asText(value) {
  return String(value || "").trim();
}

function asObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : undefined;
}

function shouldPostToAccount(status, approvalRequired) {
  return status === "posted" || status === "paid" || status === "approved" || !approvalRequired;
}

async function syncAccountImpact(expense, userId) {
  if (!expense?.fromAccountId || expense?.accountTransactionId || expense?.isTransfer) return;
  if (!shouldPostToAccount(expense.status, expense.approvalRequired)) return;

  const account = await Account.findById(expense.fromAccountId);
  if (!account) return;

  const amount = Math.abs(toNumber(expense.amount));
  if (amount <= 0) return;

  const tx = await AccountTransaction.create({
    accountId: expense.fromAccountId,
    type: "cash_out",
    amount,
    transactionDate: expense.expenseDate || new Date(),
    referenceType: "expense",
    referenceId: String(expense._id),
    description: expense.description || expense.notes || expense.title || "Expense posted",
    attachmentUrl: expense.attachmentUrl || "",
    isSystemGenerated: true,
    createdBy: userId,
  });

  account.currentBalance = (account.currentBalance || 0) - amount;
  account.updatedBy = userId;
  await account.save();

  expense.accountTransactionId = tx._id;
  await expense.save();
}

function toPayload(body, req) {
  const status = asText(body.status || "pending").toLowerCase();
  const paymentMethodRaw = asText(body.paymentMethod || body.paymentMode || "cash").toLowerCase();
  const paymentMethod = paymentMethodRaw === "bank_transfer" ? "online" : paymentMethodRaw;

  const payload = {
    expenseId: asText(body.expenseId || `EXP-${Date.now()}`),
    title: asText(body.title || body.description || body.category || "Expense"),
    category: asText(body.category),
    costCenter: asText(body.costCenter),
    vendorName: asText(body.vendorName),
    amount: toNumber(body.amount),
    currency: asText(body.currency || "PKR") || "PKR",
    paymentMode: asText(body.paymentMode || body.paymentMethod || "cash").toLowerCase(),
    paymentMethod,
    paymentReference: asText(body.paymentReference || body.referenceNo),
    expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
    status,
    requestedBy: asText(body.requestedBy),
    approvedBy: asText(body.approvedBy),
    approvedAt: body.approvedAt ? new Date(body.approvedAt) : undefined,
    notes: asText(body.notes),
    section: asText(body.section || "personal").toLowerCase(),
    subType: asText(body.subType),
    fromAccountId: asObjectId(body.fromAccountId || body.paidFromAccountId),
    paidTo: asText(body.paidTo),
    description: asText(body.description || body.notes),
    attachmentUrl: asText(body.attachmentUrl),
    approvalRequired: Boolean(body.approvalRequired),
    distributorId: asObjectId(body.distributorId),
    territory: asText(body.territory),
    spenderUserId: asObjectId(body.spenderUserId),
    spenderName: asText(body.spenderName),
    expenseType: asText(body.expenseType),
    isTransfer: Boolean(body.isTransfer),
    transferToAccountId: asObjectId(body.transferToAccountId),
    linkReference: asText(body.linkReference),
    linkedRefType: asText(body.linkedRefType),
    linkedRefId: asText(body.linkedRefId),
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
    createdBy: req.user?.uid,
  };

  if ((status === "approved" || status === "posted" || status === "paid") && req.user?.name) {
    payload.approvedBy = payload.approvedBy || String(req.user.name);
    payload.approvedAt = payload.approvedAt || new Date();
  }

  return payload;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const doc = await Expense.create(toPayload(req.body || {}, req));
    await syncAccountImpact(doc, req.user?.uid);
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
    if (req.query.status && req.query.status !== "all") query.status = String(req.query.status);
    if (req.query.section && req.query.section !== "all") query.section = String(req.query.section);
    if (req.query.subType && req.query.subType !== "all") query.subType = String(req.query.subType);
    if (req.query.paymentMethod && req.query.paymentMethod !== "all") query.paymentMethod = String(req.query.paymentMethod);
    if (req.query.paymentMode && req.query.paymentMode !== "all") query.paymentMode = String(req.query.paymentMode);
    if (req.query.costCenter) query.costCenter = String(req.query.costCenter);
    if (req.query.fromAccountId) query.fromAccountId = asObjectId(req.query.fromAccountId);
    if (req.query.createdBy) query.createdBy = asObjectId(req.query.createdBy);

    const items = await Expense.find(query).sort({ expenseDate: -1, createdAt: -1 }).lean();
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
    const current = await Expense.findById(req.params.id);
    if (!current) return res.status(404).json({ ok: false, message: "Not found" });

    Object.assign(current, toPayload(req.body || {}, req));
    await current.save();
    await syncAccountImpact(current, req.user?.uid);

    return res.json({ ok: true, expense: current });
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