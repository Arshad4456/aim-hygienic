const express = require("express");
const Account = require("../models/Account");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Account.create({
      accountId: String(body.accountId || "").trim(),
      accountName: String(body.accountName || "").trim(),
      accountType: String(body.accountType || "bank").trim(),
      bankName: String(body.bankName || "").trim(),
      branch: String(body.branch || "").trim(),
      accountNumber: String(body.accountNumber || "").trim(),
      currency: String(body.currency || "BDT").trim(),
      openingBalance: toNumber(body.openingBalance),
      currentBalance: toNumber(body.currentBalance ?? body.openingBalance),
      swiftCode: String(body.swiftCode || "").trim(),
      iban: String(body.iban || "").trim(),
      managerName: String(body.managerName || "").trim(),
      contactEmail: String(body.contactEmail || "").trim(),
      contactPhone: String(body.contactPhone || "").trim(),
      status: String(body.status || "active").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, account: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Account ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create account" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = String(req.query.status);
    if (req.query.accountType) query.accountType = String(req.query.accountType);
    const items = await Account.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, accounts: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load accounts" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Account.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, account: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await Account.findByIdAndUpdate(
      req.params.id,
      {
        accountId: String(body.accountId || "").trim(),
        accountName: String(body.accountName || "").trim(),
        accountType: String(body.accountType || "bank").trim(),
        bankName: String(body.bankName || "").trim(),
        branch: String(body.branch || "").trim(),
        accountNumber: String(body.accountNumber || "").trim(),
        currency: String(body.currency || "BDT").trim(),
        openingBalance: toNumber(body.openingBalance),
        currentBalance: toNumber(body.currentBalance ?? body.openingBalance),
        swiftCode: String(body.swiftCode || "").trim(),
        iban: String(body.iban || "").trim(),
        managerName: String(body.managerName || "").trim(),
        contactEmail: String(body.contactEmail || "").trim(),
        contactPhone: String(body.contactPhone || "").trim(),
        status: String(body.status || "active").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, account: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Account ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update account" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Account.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;