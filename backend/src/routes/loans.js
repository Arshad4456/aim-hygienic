const express = require("express");
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const LoanPayment = require("../models/LoanPayment");
const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const { requireAuth, requireRole } = require("../utils/auth");

const router = express.Router();

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function getDirections(loanType) {
  if (loanType === "received") return { create: "in", return: "out" };
  return { create: "out", return: "in" };
}

function getAccountRefType(loanType, isReturn = false) {
  if (loanType === "received") return isReturn ? "return_received_loan" : "received_loan";
  return isReturn ? "return_given_loan" : "given_loan";
}

async function applyAccountMovement({ accountId, type, amount, referenceType, referenceId, createdBy, description, transactionDate }) {
  const account = await Account.findById(accountId);
  if (!account) throw new Error("Selected account not found");

  const nextBalance = type === "cash_in" ? account.currentBalance + amount : account.currentBalance - amount;
  if (nextBalance < 0) throw new Error("Insufficient account balance");

  await AccountTransaction.create({
    accountId: account._id,
    type,
    amount,
    transactionDate,
    referenceType,
    referenceId: String(referenceId),
    description,
    createdBy,
  });

  account.currentBalance = nextBalance;
  account.updatedBy = createdBy;
  await account.save();
}

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const next7 = new Date();
    next7.setDate(next7.getDate() + 7);

    const [receivedOpen, givenOpen, overdueCount, upcomingDue] = await Promise.all([
      Loan.aggregate([{ $match: { loanType: "received", status: "open" } }, { $group: { _id: null, total: { $sum: "$remainingAmount" } } }]),
      Loan.aggregate([{ $match: { loanType: "given", status: "open" } }, { $group: { _id: null, total: { $sum: "$remainingAmount" } } }]),
      Loan.countDocuments({ status: "open", remainingAmount: { $gt: 0 }, dueDate: { $lt: now } }),
      Loan.countDocuments({ status: "open", remainingAmount: { $gt: 0 }, dueDate: { $gte: now, $lte: next7 } }),
    ]);

    return res.json({
      ok: true,
      summary: {
        totalReceivedLoansOpenAmount: receivedOpen[0]?.total || 0,
        totalGivenLoansOpenAmount: givenOpen[0]?.total || 0,
        overdueLoansCount: overdueCount,
        upcomingDueCount: upcomingDue,
      },
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load loan summary" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const q = {};
    if (["received", "given"].includes(req.query.loanType)) q.loanType = req.query.loanType;
    if (["open", "closed"].includes(req.query.status)) q.status = req.query.status;
    if (req.query.partyName) q.partyName = { $regex: String(req.query.partyName), $options: "i" };
    if (req.query.accountId && oid(req.query.accountId)) q.sourceAccountId = oid(req.query.accountId);

    if (req.query.fromDate || req.query.toDate) {
      q.loanDate = {};
      if (req.query.fromDate) q.loanDate.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) q.loanDate.$lte = new Date(req.query.toDate);
    }

    const items = await Loan.find(q).populate("sourceAccountId", "accountName").sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, loans: items });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load loans" });
  }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const loanType = String(body.loanType || "").trim().toLowerCase();
    if (!["received", "given"].includes(loanType)) return res.status(400).json({ ok: false, message: "Invalid loan type" });

    const partyName = String(body.partyName || "").trim();
    if (!partyName) return res.status(400).json({ ok: false, message: "Party name is required" });

    const principalAmount = toNumber(body.principalAmount);
    if (principalAmount <= 0) return res.status(400).json({ ok: false, message: "Loan amount must be greater than zero" });

    const sourceAccountId = oid(body.sourceAccountId);
    if (!sourceAccountId) return res.status(400).json({ ok: false, message: "Valid account is required" });

    const loan = await Loan.create({
      loanType,
      partyName,
      partyType: String(body.partyType || "").trim(),
      phone: String(body.phone || "").trim(),
      cnicNtn: String(body.cnicNtn || "").trim(),
      principalAmount,
      loanDate: body.loanDate ? new Date(body.loanDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      status: "open",
      totalReturnedOrReceived: 0,
      remainingAmount: principalAmount,
      sourceAccountId,
      paymentMethod: String(body.paymentMethod || "cash").trim().toLowerCase(),
      referenceNo: String(body.referenceNo || "").trim(),
      notes: String(body.notes || "").trim(),
      attachmentUrl: String(body.attachmentUrl || "").trim(),
      createdBy: req.user.uid,
    });

    const direction = getDirections(loanType).create;
    await applyAccountMovement({
      accountId: sourceAccountId,
      type: direction === "in" ? "cash_in" : "cash_out",
      amount: principalAmount,
      referenceType: getAccountRefType(loanType, false),
      referenceId: loan._id,
      createdBy: req.user.uid,
      description: `${loanType === "received" ? "Received" : "Given"} loan created (${partyName})`,
      transactionDate: loan.loanDate,
    });

    return res.status(201).json({ ok: true, loan });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message || "Failed to create loan" });
  }
});

router.post("/:id/payments", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const loanId = oid(req.params.id);
    if (!loanId) return res.status(400).json({ ok: false, message: "Invalid loan id" });

    const loan = await Loan.findById(loanId);
    if (!loan) return res.status(404).json({ ok: false, message: "Loan not found" });
    if (loan.status !== "open" || loan.remainingAmount <= 0) return res.status(400).json({ ok: false, message: "Loan is already closed" });

    const amount = toNumber(req.body?.amount);
    if (amount <= 0) return res.status(400).json({ ok: false, message: "Payment amount must be greater than zero" });
    if (amount > loan.remainingAmount) return res.status(400).json({ ok: false, message: "Payment exceeds remaining loan balance" });

    const accountId = oid(req.body?.accountId);
    if (!accountId) return res.status(400).json({ ok: false, message: "Valid account is required" });

    const paymentDirection = getDirections(loan.loanType).return;
    const paymentDate = req.body?.paymentDate ? new Date(req.body.paymentDate) : new Date();

    const payment = await LoanPayment.create({
      loanId,
      paymentDirection,
      amount,
      paymentDate,
      accountId,
      method: String(req.body?.method || "cash").trim().toLowerCase(),
      referenceNo: String(req.body?.referenceNo || "").trim(),
      notes: String(req.body?.notes || "").trim(),
      attachmentUrl: String(req.body?.attachmentUrl || "").trim(),
      createdBy: req.user.uid,
    });

    loan.totalReturnedOrReceived += amount;
    loan.remainingAmount = Math.max(loan.principalAmount - loan.totalReturnedOrReceived, 0);
    if (loan.remainingAmount === 0) loan.status = "closed";
    await loan.save();

    await applyAccountMovement({
      accountId,
      type: paymentDirection === "in" ? "cash_in" : "cash_out",
      amount,
      referenceType: getAccountRefType(loan.loanType, true),
      referenceId: payment._id,
      createdBy: req.user.uid,
      description: `${loan.loanType === "received" ? "Returned" : "Received back"} loan payment (${loan.partyName})`,
      transactionDate: paymentDate,
    });

    return res.status(201).json({ ok: true, payment, loan });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message || "Failed to record loan payment" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = oid(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "Invalid loan id" });
    const loan = await Loan.findById(id).populate("sourceAccountId", "accountName").lean();
    if (!loan) return res.status(404).json({ ok: false, message: "Loan not found" });
    const payments = await LoanPayment.find({ loanId: id }).populate("accountId", "accountName").sort({ paymentDate: 1, createdAt: 1 }).lean();
    return res.json({ ok: true, loan, payments });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load loan detail" });
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = oid(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "Invalid loan id" });
    const paymentsCount = await LoanPayment.countDocuments({ loanId: id });
    if (paymentsCount > 0) return res.status(400).json({ ok: false, message: "Cannot delete loan with return entries" });
    const deleted = await Loan.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Loan not found" });
    return res.json({ ok: true });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to delete loan" });
  }
});

module.exports = router;