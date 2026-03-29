const express = require("express");
const mongoose = require("mongoose");
const Receipt = require("../models/Receipt");
const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const SalesOrder = require("../models/SalesOrder");
const User = require("../models/User");
const Company = require("../models/Company");
const { requireAuth, requireRole } = require("../utils/auth");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asText(value) {
  return String(value || "").trim();
}

function asObjectId(value) {
  if (!value) return undefined;
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : undefined;
}

function makeReceiptNo() {
  return `RCP-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function canAccessOwn(role) {
  return ["customer", "distributor", "order booker", "orderbooker", "salesman"].includes(String(role || "").toLowerCase());
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = asText(companyId);
  const normalizedCompanyName = asText(companyName);
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedReceiptModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? asText(requestedCompanyId)
    : asText(req.user?.companyId);
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? asText(requestedCompanyName)
    : asText(req.user?.companyName);
  if (!scopedCompanyId) {
    return { ReceiptModel: Receipt, AccountModel: Account, AccountTransactionModel: AccountTransaction, SalesOrderModel: SalesOrder, UserModel: User };
  }
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) {
    return { ReceiptModel: Receipt, AccountModel: Account, AccountTransactionModel: AccountTransaction, SalesOrderModel: SalesOrder, UserModel: User };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    ReceiptModel: getModelFromDb(tenantDb, Receipt),
    AccountModel: getModelFromDb(tenantDb, Account),
    AccountTransactionModel: getModelFromDb(tenantDb, AccountTransaction),
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
    UserModel: getModelFromDb(tenantDb, User),
  };
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const { ReceiptModel, SalesOrderModel, UserModel } = await getScopedReceiptModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    const body = req.body || {};
    const role = String(req.user?.role || "").toLowerCase();
    if (!canAccessOwn(role) && role !== "admin") {
      return res.status(403).json({ ok: false, message: "Only payer roles can create receipts" });
    }

    const paymentMethod = asText(body.paymentMethod).toLowerCase();
    if (!["online", "cash"].includes(paymentMethod)) return res.status(400).json({ ok: false, message: "Invalid payment method" });

    const amount = toNumber(body.amount);
    if (amount <= 0) return res.status(400).json({ ok: false, message: "Amount must be greater than 0" });

    const paidToAccountId = asObjectId(body.paidToAccountId);
    const receivedByUserId = asObjectId(body.receivedByUserId);

    if (paymentMethod === "online") {
      if (!paidToAccountId) return res.status(400).json({ ok: false, message: "Company account is required for online payment" });
      if (!asText(body.referenceNo)) return res.status(400).json({ ok: false, message: "Reference number is required for online payment" });
    }

    if (paymentMethod === "cash" && !receivedByUserId && !asText(body.receivedByName)) {
      return res.status(400).json({ ok: false, message: "Received by person is required for cash payment" });
    }

    const payer = await UserModel.findById(req.user.uid).lean();
    const linkedInvoiceNo = asText(body.linkedInvoiceNo);
    const linkedOrder = linkedInvoiceNo
      ? await SalesOrderModel.findOne({ $or: [{ orderNo: linkedInvoiceNo }, { invoiceNo: linkedInvoiceNo }] }).lean()
      : null;

    const doc = await ReceiptModel.create({
      receiptNo: makeReceiptNo(),
      receiptType: asText(body.receiptType || "invoice_payment").toLowerCase(),
      payerRole: req.user.role,
      payerUserId: req.user.uid,
      payerName: asText(body.payerName || payer?.fullName || payer?.name || payer?.username),
      amount,
      paymentMethod,
      paidToAccountId,
      receivedByUserId,
      receivedByName: asText(body.receivedByName),
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      referenceNo: asText(body.referenceNo),
      linkedInvoiceNo,
      linkedOrderId: linkedOrder?._id,
      notes: asText(body.notes),
      attachmentUrl: asText(body.attachmentUrl),
      status: "pending",
      createdByUserId: req.user.uid,
    });

    return res.status(201).json({ ok: true, receipt: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create receipt" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const { ReceiptModel } = await getScopedReceiptModels(req, req.query?.companyId, req.query?.companyName);
    const role = String(req.user?.role || "").toLowerCase();
    const query = {};

    if (role !== "admin") {
      query.payerUserId = req.user.uid;
    }

    if (req.query.status && req.query.status !== "all") query.status = String(req.query.status);
    if (req.query.payerRole && req.query.payerRole !== "all") query.payerRole = String(req.query.payerRole);
    if (req.query.paymentMethod && req.query.paymentMethod !== "all") query.paymentMethod = String(req.query.paymentMethod);

    const from = req.query.fromDate ? new Date(`${req.query.fromDate}T00:00:00`) : null;
    const to = req.query.toDate ? new Date(`${req.query.toDate}T23:59:59`) : null;
    if (from || to) {
      query.paymentDate = {};
      if (from) query.paymentDate.$gte = from;
      if (to) query.paymentDate.$lte = to;
    }

    const receipts = await ReceiptModel.find(query)
      .populate("paidToAccountId", "accountName bankName accountNumber accountType")
      .populate("receivedByUserId", "fullName role mobile")
      .sort({ status: 1, createdAt: -1 })
      .lean();
    return res.json({ ok: true, receipts });
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to load receipts" });
  }
});


router.patch("/:id/attachment", requireAuth, async (req, res) => {
  try {
    const { ReceiptModel } = await getScopedReceiptModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const attachmentUrl = asText(req.body?.attachmentUrl);
    if (!attachmentUrl) return res.status(400).json({ ok: false, message: "attachmentUrl is required" });

    const receipt = await ReceiptModel.findById(req.params.id);
    if (!receipt) return res.status(404).json({ ok: false, message: "Receipt not found" });

    const role = String(req.user?.role || "").toLowerCase();
    const isAdmin = role === "admin";
    const isOwner = String(receipt.payerUserId || "") === String(req.user.uid || "");

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    if (receipt.status !== "pending") {
      return res.status(400).json({ ok: false, message: "Attachment can only be updated for pending receipts" });
    }

    receipt.attachmentUrl = attachmentUrl;
    await receipt.save();
    return res.json({ ok: true, receipt });
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to update attachment" });
  }
});

router.post("/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { ReceiptModel, AccountModel, AccountTransactionModel, SalesOrderModel } = await getScopedReceiptModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    let resultReceipt = null;
    await session.withTransaction(async () => {
      const receipt = await ReceiptModel.findById(req.params.id).session(session);
      if (!receipt) throw new Error("NOT_FOUND");
      if (receipt.status !== "pending") throw new Error("Already processed");

      if (receipt.paymentMethod === "online") {
        if (!receipt.paidToAccountId || !receipt.referenceNo || !receipt.attachmentUrl) {
          throw new Error("Online receipt missing required fields");
        }
      }

      if (receipt.paymentMethod === "cash") {
        if (!receipt.receivedByUserId && !receipt.receivedByName) {
          throw new Error("Cash receipt missing receiver");
        }
      }

      let account = null;
      if (receipt.paymentMethod === "online") {
        account = await AccountModel.findById(receipt.paidToAccountId).session(session);
      } else {
        account = await AccountModel.findOne({ accountType: "cash", status: "active" }).session(session);
      }
      if (!account) throw new Error("Target account not found");

      const tx = await AccountTransactionModel.create([
        {
          accountId: account._id,
          type: "cash_in",
          amount: receipt.amount,
          transactionDate: receipt.paymentDate,
          referenceType: "other",
          referenceId: receipt.receiptNo,
          description: `Receipt approved (${receipt.receiptNo})`,
          attachmentUrl: receipt.attachmentUrl || "",
          isSystemGenerated: true,
          createdBy: req.user.uid,
        },
      ], { session });

      account.currentBalance = toNumber(account.currentBalance) + toNumber(receipt.amount);
      account.updatedBy = req.user.uid;
      await account.save({ session });

      if (receipt.linkedOrderId) {
        const order = await SalesOrderModel.findById(receipt.linkedOrderId).session(session);
        if (order) {
          order.notes = `${asText(order.notes)}\n[Receipt ${receipt.receiptNo}] +${receipt.amount}`.trim();
          await order.save({ session });
        }
      }

      receipt.status = "approved";
      receipt.approvedBy = req.user.uid;
      receipt.approvedAt = new Date();
      receipt.accountTransactionId = tx[0]._id;
      await receipt.save({ session });
      resultReceipt = receipt;
    });

    return res.json({ ok: true, receipt: resultReceipt });
  } catch (e) {
    if (String(e.message || "").includes("NOT_FOUND")) return res.status(404).json({ ok: false, message: "Receipt not found" });
    return res.status(400).json({ ok: false, message: e.message || "Failed to approve receipt" });
  } finally {
    await session.endSession();
  }
});

router.post("/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { ReceiptModel } = await getScopedReceiptModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const reason = asText(req.body?.reason);
    if (!reason) return res.status(400).json({ ok: false, message: "Rejection reason is required" });

    const receipt = await ReceiptModel.findById(req.params.id);
    if (!receipt) return res.status(404).json({ ok: false, message: "Receipt not found" });
    if (receipt.status !== "pending") return res.status(400).json({ ok: false, message: "Receipt already processed" });

    receipt.status = "rejected";
    receipt.rejectedBy = req.user.uid;
    receipt.rejectedAt = new Date();
    receipt.rejectionReason = reason;
    await receipt.save();

    return res.json({ ok: true, receipt });
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to reject receipt" });
  }
});

module.exports = router;
