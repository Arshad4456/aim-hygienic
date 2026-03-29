const express = require("express");
const mongoose = require("mongoose");
const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const AccountAuditLog = require("../models/AccountAuditLog");
const Company = require("../models/Company");
const { requireAuth, requireRole } = require("../utils/auth");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

const ACCOUNT_TYPES = ["bank", "cash", "easypaisa", "jazzcash", "other"];
const REFERENCE_TYPES = [
  "primary_payment",
  "secondary_payment",
  "expense",
  "salary",
  "supplier_payment",
  "manual_entry",
  "other",
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  const normalizedCompanyName = String(companyName || "").trim();
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedAccountModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyId || "").trim()
    : String(req.user?.companyId || "").trim();
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyName || "").trim()
    : String(req.user?.companyName || "").trim();

  if (!scopedCompanyId) {
    return { AccountModel: Account, AccountTransactionModel: AccountTransaction, AccountAuditLogModel: AccountAuditLog };
  }

  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) {
    return { AccountModel: Account, AccountTransactionModel: AccountTransaction, AccountAuditLogModel: AccountAuditLog };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    AccountModel: getModelFromDb(tenantDb, Account),
    AccountTransactionModel: getModelFromDb(tenantDb, AccountTransaction),
    AccountAuditLogModel: getModelFromDb(tenantDb, AccountAuditLog),
  };
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function maskAccountNumber(accountNumber = "") {
  const clean = String(accountNumber || "").trim();
  if (!clean) return "-";
  const tail = clean.slice(-4);
  return `${"•".repeat(Math.max(clean.length - 4, 0))}${tail}`;
}

async function logAudit({ AccountAuditLogModel = AccountAuditLog, accountId, action, description, metadata, createdBy }) {
  await AccountAuditLogModel.create({ accountId, action, description, metadata, createdBy });
}

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { AccountModel, AccountTransactionModel, AccountAuditLogModel } = await getScopedAccountModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const body = req.body || {};
    const accountType = String(body.accountType || "").trim().toLowerCase();
    if (!ACCOUNT_TYPES.includes(accountType)) return res.status(400).json({ ok: false, message: "Invalid account type" });

    const accountName = String(body.accountName || "").trim();
    if (!accountName) return res.status(400).json({ ok: false, message: "Account name is required" });

    const openingBalance = toNumber(body.openingBalance);
    const currentBalance = body.currentBalance == null ? openingBalance : toNumber(body.currentBalance);

    const payload = {
      accountId: String(body.accountId || `AC-${Date.now()}`).trim(),
      accountName,
      accountType,
      bankName: String(body.bankName || "").trim(),
      branchName: String(body.branchName || "").trim(),
      branchCode: String(body.branchCode || "").trim(),
      accountTitle: String(body.accountTitle || "").trim(),
      accountNumber: String(body.accountNumber || "").trim(),
      iban: String(body.iban || "").trim(),
      swiftCode: String(body.swiftCode || "").trim(),
      openingBalance,
      currentBalance,
      openingDate: body.openingDate ? new Date(body.openingDate) : new Date(),
      currency: String(body.currency || "PKR").trim() || "PKR",
      status: String(body.status || "active").trim().toLowerCase() === "inactive" ? "inactive" : "active",
      notes: String(body.notes || "").trim(),
      createdBy: req.user.uid,
      updatedBy: req.user.uid,
    };

    if (accountType === "bank") {
      if (!payload.bankName || !payload.accountTitle || !payload.accountNumber || !payload.iban) {
        return res.status(400).json({ ok: false, message: "Bank accounts require bank name, account title, account number, and IBAN" });
      }
    }

    const doc = await AccountModel.create(payload);

    await AccountTransactionModel.create({
      accountId: doc._id,
      type: openingBalance >= 0 ? "cash_in" : "cash_out",
      amount: Math.abs(openingBalance),
      transactionDate: payload.openingDate,
      referenceType: "opening_balance",
      description: "Opening balance entry",
      isSystemGenerated: true,
      createdBy: req.user.uid,
    });

    await logAudit({
      AccountAuditLogModel,
      accountId: doc._id,
      action: "account_created",
      description: "Account created with opening balance",
      metadata: { openingBalance },
      createdBy: req.user.uid,
    });

    return res.status(201).json({ ok: true, account: doc });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ ok: false, message: "Account ID already exists" });
    return res.status(500).json({ ok: false, message: "Failed to create account" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const { AccountModel } = await getScopedAccountModels(req, req.query?.companyId, req.query?.companyName);
    const query = {};
    if (req.query.status) query.status = String(req.query.status);
    if (req.query.accountType) query.accountType = String(req.query.accountType);
    const items = await AccountModel.find(query).sort({ createdAt: -1 }).lean();

    const accounts = items.map((item) => ({
      ...item,
      accountNumberMasked: maskAccountNumber(item.accountNumber),
      healthIndicator:
        Number(item.currentBalance || 0) > 1000000
          ? "healthy"
          : Number(item.currentBalance || 0) >= 200000
            ? "moderate"
            : "low_liquidity",
    }));

    return res.json({ ok: true, accounts });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load accounts" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { AccountModel, AccountTransactionModel } = await getScopedAccountModels(req, req.query?.companyId, req.query?.companyName);
    const accountId = toObjectId(req.params.id);
    if (!accountId) return res.status(400).json({ ok: false, message: "Invalid id" });

    const account = await AccountModel.findById(accountId).lean();
    if (!account) return res.status(404).json({ ok: false, message: "Not found" });

    const todayStart = startOfDay();
    const monthStart = startOfMonth();

    const [daily, monthly, txCount, largestTx] = await Promise.all([
      AccountTransactionModel.aggregate([
        { $match: { accountId, transactionDate: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            cashIn: { $sum: { $cond: [{ $eq: ["$type", "cash_in"] }, "$amount", 0] } },
            cashOut: { $sum: { $cond: [{ $eq: ["$type", "cash_out"] }, "$amount", 0] } },
          },
        },
      ]),
      AccountTransactionModel.aggregate([
        { $match: { accountId, transactionDate: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            cashIn: { $sum: { $cond: [{ $eq: ["$type", "cash_in"] }, "$amount", 0] } },
            cashOut: { $sum: { $cond: [{ $eq: ["$type", "cash_out"] }, "$amount", 0] } },
          },
        },
      ]),
      AccountTransactionModel.countDocuments({ accountId }),
      AccountTransactionModel.findOne({ accountId }).sort({ amount: -1 }).lean(),
    ]);

    return res.json({
      ok: true,
      account,
      summaries: {
        daily: {
          cashIn: daily[0]?.cashIn || 0,
          cashOut: daily[0]?.cashOut || 0,
          netChange: (daily[0]?.cashIn || 0) - (daily[0]?.cashOut || 0),
        },
        monthly: {
          cashIn: monthly[0]?.cashIn || 0,
          cashOut: monthly[0]?.cashOut || 0,
          netProfitLoss: (monthly[0]?.cashIn || 0) - (monthly[0]?.cashOut || 0),
        },
      },
      metrics: {
        totalTransactionsCount: txCount,
        largestTransaction: largestTx
          ? { amount: largestTx.amount, type: largestTx.type, date: largestTx.transactionDate }
          : null,
      },
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load account details" });
  }
});

router.get("/:id/transactions", requireAuth, async (req, res) => {
  try {
    const { AccountTransactionModel } = await getScopedAccountModels(req, req.query?.companyId, req.query?.companyName);
    const accountId = toObjectId(req.params.id);
    if (!accountId) return res.status(400).json({ ok: false, message: "Invalid id" });

    const tx = await AccountTransactionModel.find({ accountId }).sort({ transactionDate: -1, createdAt: -1 }).lean();
    return res.json({ ok: true, transactions: tx });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load transactions" });
  }
});

router.post("/:id/transactions", requireAuth, requireRole("admin", "manage director", "ceo"), async (req, res) => {
  try {
    const { AccountModel, AccountTransactionModel, AccountAuditLogModel } = await getScopedAccountModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const accountId = toObjectId(req.params.id);
    if (!accountId) return res.status(400).json({ ok: false, message: "Invalid id" });

    const body = req.body || {};
    const type = String(body.type || "").trim().toLowerCase();
    const amount = toNumber(body.amount);
    if (!["cash_in", "cash_out"].includes(type)) return res.status(400).json({ ok: false, message: "Invalid transaction type" });
    if (amount <= 0) return res.status(400).json({ ok: false, message: "Amount must be greater than 0" });

    const referenceType = String(body.referenceType || "manual_entry").trim().toLowerCase();
    if (!REFERENCE_TYPES.includes(referenceType)) return res.status(400).json({ ok: false, message: "Invalid reference type" });

    const description = String(body.description || "").trim();
    if (!description) return res.status(400).json({ ok: false, message: "Description is required" });

    const account = await AccountModel.findById(accountId);
    if (!account) return res.status(404).json({ ok: false, message: "Account not found" });

    const allowNegativeBalance = String(process.env.ALLOW_NEGATIVE_BALANCE || "false") === "true";
    const nextBalance = type === "cash_in" ? account.currentBalance + amount : account.currentBalance - amount;
    if (!allowNegativeBalance && nextBalance < 0) {
      return res.status(400).json({ ok: false, message: "Transaction rejected. Negative balance is not allowed." });
    }

    const trx = await AccountTransactionModel.create({
      accountId,
      type,
      amount,
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
      referenceType,
      referenceId: String(body.referenceId || "").trim(),
      description,
      attachmentUrl: String(body.attachmentUrl || "").trim(),
      createdBy: req.user.uid,
    });

    account.currentBalance = nextBalance;
    account.updatedBy = req.user.uid;
    await account.save();

    await logAudit({
      AccountAuditLogModel,
      accountId,
      action: "transaction_added",
      description: `Added ${type} transaction`,
      metadata: { transactionId: trx._id, amount, type },
      createdBy: req.user.uid,
    });

    return res.status(201).json({ ok: true, transaction: trx, currentBalance: account.currentBalance });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to add transaction" });
  }
});

router.post("/:id/transactions/:transactionId/reverse", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { AccountModel, AccountTransactionModel, AccountAuditLogModel } = await getScopedAccountModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const accountId = toObjectId(req.params.id);
    const transactionId = toObjectId(req.params.transactionId);
    if (!accountId || !transactionId) return res.status(400).json({ ok: false, message: "Invalid id" });

    const original = await AccountTransactionModel.findOne({ _id: transactionId, accountId });
    if (!original) return res.status(404).json({ ok: false, message: "Transaction not found" });

    const reverseType = original.type === "cash_in" ? "cash_out" : "cash_in";
    const reversal = await AccountTransactionModel.create({
      accountId,
      type: reverseType,
      amount: original.amount,
      transactionDate: new Date(),
      referenceType: "reversal",
      referenceId: String(original._id),
      description: String(req.body?.description || `Reversal for transaction ${original._id}`),
      reversedTransactionId: original._id,
      createdBy: req.user.uid,
    });

    const account = await AccountModel.findById(accountId);
    account.currentBalance = reverseType === "cash_in" ? account.currentBalance + original.amount : account.currentBalance - original.amount;
    account.updatedBy = req.user.uid;
    await account.save();

    await logAudit({
      AccountAuditLogModel,
      accountId,
      action: "transaction_reversed",
      description: "Reversal transaction created",
      metadata: { originalTransactionId: original._id, reversalTransactionId: reversal._id },
      createdBy: req.user.uid,
    });

    return res.status(201).json({ ok: true, reversal, currentBalance: account.currentBalance });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to reverse transaction" });
  }
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { AccountModel, AccountAuditLogModel } = await getScopedAccountModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const body = req.body || {};
    const updates = {
      accountName: String(body.accountName || "").trim(),
      accountType: String(body.accountType || "bank").trim(),
      bankName: String(body.bankName || "").trim(),
      branchName: String(body.branchName || "").trim(),
      branchCode: String(body.branchCode || "").trim(),
      accountTitle: String(body.accountTitle || "").trim(),
      accountNumber: String(body.accountNumber || "").trim(),
      iban: String(body.iban || "").trim(),
      swiftCode: String(body.swiftCode || "").trim(),
      openingDate: body.openingDate ? new Date(body.openingDate) : undefined,
      currency: String(body.currency || "PKR").trim(),
      status: String(body.status || "active").trim(),
      notes: String(body.notes || "").trim(),
      updatedBy: req.user.uid,
    };

    const updated = await AccountModel.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });

    await logAudit({
      AccountAuditLogModel,
      accountId: updated._id,
      action: "account_updated",
      description: "Account information updated",
      metadata: {},
      createdBy: req.user.uid,
    });

    return res.json({ ok: true, account: updated });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ ok: false, message: "Account ID already exists" });
    return res.status(500).json({ ok: false, message: "Failed to update account" });
  }
});

router.patch("/:id/deactivate", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { AccountModel, AccountAuditLogModel } = await getScopedAccountModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const updated = await AccountModel.findByIdAndUpdate(
      req.params.id,
      { status: "inactive", updatedBy: req.user.uid },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });

    await logAudit({
      AccountAuditLogModel,
      accountId: updated._id,
      action: "account_deactivated",
      description: "Account deactivated",
      metadata: {},
      createdBy: req.user.uid,
    });

    return res.json({ ok: true, account: updated });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to deactivate account" });
  }
});


router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { AccountModel, AccountTransactionModel, AccountAuditLogModel } = await getScopedAccountModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const account = await AccountModel.findById(req.params.id);
    if (!account) return res.status(404).json({ ok: false, message: "Not found" });

    await Promise.all([
      AccountTransactionModel.deleteMany({ accountId: account._id }),
      AccountAuditLogModel.deleteMany({ accountId: account._id }),
    ]);

    await AccountModel.deleteOne({ _id: account._id });

    return res.json({ ok: true });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to delete account" });
  }
});

module.exports = router;
