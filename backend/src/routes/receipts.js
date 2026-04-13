const express = require("express");
const { requireAuth } = require("../utils/auth");
const CustomerReceipt = require("../models/CustomerReceipt");
const CustomerInvoice = require("../models/CustomerInvoice");
const CompanyReceiptFromDistributor = require("../models/CompanyReceiptFromDistributor");
const CompanyInvoiceToDistributor = require("../models/CompanyInvoiceToDistributor");
const { getScopedModels, asText, normalizeRole } = require("../services/scopedModels");
const { postCustomerReceipt } = require("../services/posting/postCustomerReceipt");
const { recalcInvoiceBalance } = require("../services/balances/recalcInvoiceBalance");

const router = express.Router();

function resolveReceiptFamily(req) {
  const family = asText(req.query.family || req.body.family || "").toLowerCase();
  if (family === "company_distributor") return "company_distributor";
  if (family === "distributor_customer") return "distributor_customer";

  const role = normalizeRole(req.user?.role);
  return role === "distributor" || role === "customer" || role.includes("order") || role === "salesman"
    ? "distributor_customer"
    : "company_distributor";
}

async function postCompanyDistributorReceipt(req, receiptId) {
  const { CompanyReceiptFromDistributorModel, CompanyInvoiceToDistributorModel } = await getScopedModels(req, {
    CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
    CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
  });

  const receipt = await CompanyReceiptFromDistributorModel.findById(receiptId);
  if (!receipt) throw new Error("Company receipt from distributor not found");
  if (receipt.ledgerPosting?.postingState === "posted") return receipt;

  receipt.status = "posted";
  receipt.ledgerPosting = {
    postingState: "posted",
    postingKey: `company_receipt_from_distributor:${receipt._id}`,
    postedAt: new Date(),
  };
  receipt.statusHistory.push({
    status: "posted",
    changedBy: asText(req.user.uid),
    note: "Company receipt posted",
  });
  await receipt.save();

  for (const allocation of receipt.allocations || []) {
    const invoice = await CompanyInvoiceToDistributorModel.findById(allocation.invoiceId);
    if (!invoice) continue;
    invoice.allocatedReceiptTotal = Number(invoice.allocatedReceiptTotal || 0) + Number(allocation.allocatedAmount || 0);
    await invoice.save();
    await recalcInvoiceBalance(CompanyInvoiceToDistributorModel, invoice._id);
  }

  return receipt;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);

    if (family === "company_distributor") {
      const { CompanyReceiptFromDistributorModel } = await getScopedModels(req, {
        CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
      });
      const query = { companyId: asText(req.user.companyId) };
      if (req.query.status && req.query.status !== "all") query.status = asText(req.query.status);
      if (req.query.distributorId) query.distributorId = asText(req.query.distributorId);

      const receipts = await CompanyReceiptFromDistributorModel.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, family, receipts });
    }

    const { CustomerReceiptModel } = await getScopedModels(req, { CustomerReceiptModel: CustomerReceipt });
    const query = { companyId: asText(req.user.companyId) };
    const role = normalizeRole(req.user?.role);
    if (role === "distributor") {
      query.distributorId = asText(req.user.distributorId || req.user.uid);
    }
    if (req.query.status && req.query.status !== "all") query.status = asText(req.query.status);

    const receipts = await CustomerReceiptModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, family, receipts });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load receipts" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    const body = req.body || {};

    if (family === "company_distributor") {
      const { CompanyReceiptFromDistributorModel } = await getScopedModels(req, {
        CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
      });

      const receipt = await CompanyReceiptFromDistributorModel.create({
        companyId: asText(req.user.companyId),
        documentNo: body.documentNo,
        ownerId: asText(req.user.companyId),
        distributorId: asText(body.distributorId),
        payer: body.payer,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        amount: Number(body.amount || 0),
        paymentMethod: asText(body.paymentMethod),
        toAccountId: asText(body.toAccountId),
        status: "pending",
        allocations: Array.isArray(body.allocations) ? body.allocations : [],
        attachmentUrl: asText(body.attachmentUrl),
        referenceNo: asText(body.referenceNo),
        createdByUserId: asText(req.user.uid),
        notes: asText(body.notes),
        statusHistory: [{ status: "pending", changedBy: asText(req.user.uid), note: "Created" }],
      });

      return res.status(201).json({ ok: true, family, receipt });
    }

    const { CustomerReceiptModel } = await getScopedModels(req, { CustomerReceiptModel: CustomerReceipt });
    const receipt = await CustomerReceiptModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerId: asText(body.distributorId || req.user.distributorId || req.user.uid),
      distributorId: asText(body.distributorId || req.user.distributorId || req.user.uid),
      customer: body.customer,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      amount: Number(body.amount || 0),
      paymentMethod: asText(body.paymentMethod),
      toAccountId: asText(body.toAccountId),
      status: "pending",
      allocations: Array.isArray(body.allocations) ? body.allocations : [],
      attachmentUrl: asText(body.attachmentUrl),
      referenceNo: asText(body.referenceNo),
      createdByUserId: asText(req.user.uid),
      notes: asText(body.notes),
      statusHistory: [{ status: "pending", changedBy: asText(req.user.uid), note: "Created" }],
    });

    return res.status(201).json({ ok: true, family, receipt });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create receipt" });
  }
});

router.post("/:id/post", requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    const receipt = family === "company_distributor"
      ? await postCompanyDistributorReceipt(req, req.params.id)
      : await postCustomerReceipt(req, req.params.id);

    return res.json({ ok: true, family, receipt });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to post receipt" });
  }
});

router.get("/invoices", requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    if (family === "company_distributor") {
      const { CompanyInvoiceToDistributorModel } = await getScopedModels(req, {
        CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
      });
      const query = { companyId: asText(req.user.companyId) };
      if (req.query.distributorId) query.distributorId = asText(req.query.distributorId);
      if (req.query.paymentStatus && req.query.paymentStatus !== "all") query.paymentStatus = asText(req.query.paymentStatus);
      const invoices = await CompanyInvoiceToDistributorModel.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, family, invoices });
    }

    const { CustomerInvoiceModel } = await getScopedModels(req, { CustomerInvoiceModel: CustomerInvoice });
    const query = { companyId: asText(req.user.companyId) };
    const role = normalizeRole(req.user?.role);
    if (role === "distributor") query.distributorId = asText(req.user.distributorId || req.user.uid);
    if (req.query.paymentStatus && req.query.paymentStatus !== "all") query.paymentStatus = asText(req.query.paymentStatus);
    const invoices = await CustomerInvoiceModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, family, invoices });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load invoices" });
  }
});

module.exports = router;
