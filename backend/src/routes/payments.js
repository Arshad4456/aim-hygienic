const express = require("express");
const { requireAuth } = require("../utils/auth");
const SupplierInvoice = require("../models/SupplierInvoice");
const SupplierPayment = require("../models/SupplierPayment");
const { getScopedModels, asText } = require("../services/scopedModels");
const { postSupplierInvoice } = require("../services/posting/postSupplierInvoice");
const { postSupplierPayment } = require("../services/posting/postSupplierPayment");

const router = express.Router();

router.get("/supplier-invoices", requireAuth, async (req, res) => {
  try {
    const { SupplierInvoiceModel } = await getScopedModels(req, { SupplierInvoiceModel: SupplierInvoice });
    const query = { companyId: asText(req.user.companyId) };

    if (req.query.paymentStatus && req.query.paymentStatus !== "all") {
      query.paymentStatus = asText(req.query.paymentStatus);
    }
    if (req.query.supplierId) {
      query["supplier.partyId"] = asText(req.query.supplierId);
    }

    const invoices = await SupplierInvoiceModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, invoices });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load supplier invoices" });
  }
});

router.post("/supplier-invoices", requireAuth, async (req, res) => {
  try {
    const { SupplierInvoiceModel } = await getScopedModels(req, { SupplierInvoiceModel: SupplierInvoice });
    const body = req.body || {};

    const invoice = await SupplierInvoiceModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerId: asText(req.user.companyId),
      supplier: body.supplier,
      purchaseOrderId: body.purchaseOrderId || null,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: "draft",
      lines: Array.isArray(body.lines) ? body.lines : [],
      totals: body.totals || {},
      invoiceTotal: Number(body.invoiceTotal || body.totals?.grandTotal || 0),
      balanceAmount: Number(body.invoiceTotal || body.totals?.grandTotal || 0),
      createdByUserId: asText(req.user.uid),
      notes: asText(body.notes),
      statusHistory: [{ status: "draft", changedBy: asText(req.user.uid), note: "Created" }],
    });

    return res.status(201).json({ ok: true, invoice });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create supplier invoice" });
  }
});

router.post("/supplier-invoices/:id/post", requireAuth, async (req, res) => {
  try {
    const invoice = await postSupplierInvoice(req, req.params.id);
    return res.json({ ok: true, invoice });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to post supplier invoice" });
  }
});

router.get("/supplier-payments", requireAuth, async (req, res) => {
  try {
    const { SupplierPaymentModel } = await getScopedModels(req, { SupplierPaymentModel: SupplierPayment });
    const query = { companyId: asText(req.user.companyId) };

    if (req.query.supplierId) {
      query["supplier.partyId"] = asText(req.query.supplierId);
    }
    if (req.query.status && req.query.status !== "all") {
      query.status = asText(req.query.status);
    }

    const payments = await SupplierPaymentModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, payments });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load supplier payments" });
  }
});

router.post("/supplier-payments", requireAuth, async (req, res) => {
  try {
    const { SupplierPaymentModel } = await getScopedModels(req, { SupplierPaymentModel: SupplierPayment });
    const body = req.body || {};

    const payment = await SupplierPaymentModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerId: asText(req.user.companyId),
      supplier: body.supplier,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      amount: Number(body.amount || 0),
      paymentMethod: asText(body.paymentMethod),
      fromAccountId: asText(body.fromAccountId),
      status: "pending",
      allocations: Array.isArray(body.allocations) ? body.allocations : [],
      attachmentUrl: asText(body.attachmentUrl),
      referenceNo: asText(body.referenceNo),
      createdByUserId: asText(req.user.uid),
      notes: asText(body.notes),
      statusHistory: [{ status: "pending", changedBy: asText(req.user.uid), note: "Created" }],
    });

    return res.status(201).json({ ok: true, payment });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create supplier payment" });
  }
});

router.post("/supplier-payments/:id/post", requireAuth, async (req, res) => {
  try {
    const payment = await postSupplierPayment(req, req.params.id);
    return res.json({ ok: true, payment });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to post supplier payment" });
  }
});

module.exports = router;
