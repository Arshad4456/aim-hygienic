const express = require("express");
const { requireAuth } = require("../utils/auth");
const CustomerReceipt = require("../models/CustomerReceipt");
const { getScopedModels, asText, normalizeRole } = require("../services/scopedModels");
const { postCustomerReceipt } = require("../services/posting/postCustomerReceipt");

const router = express.Router();

function resolveReceiptOwner(req) {
  const role = normalizeRole(req.user?.role);
  return role === "distributor" || role === "customer" || role.includes("order") || role === "salesman"
    ? "distributor_customer"
    : "company_distributor";
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const scope = resolveReceiptOwner(req);
    if (scope !== "distributor_customer") {
      return res.json({ ok: true, receipts: [], message: "Company-distributor receipts move to dedicated route next phase" });
    }

    const { CustomerReceiptModel } = await getScopedModels(req, { CustomerReceiptModel: CustomerReceipt });
    const query = { companyId: asText(req.user.companyId) };
    if (req.query.status && req.query.status !== "all") query.status = asText(req.query.status);

    const receipts = await CustomerReceiptModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, receipts });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load receipts" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const scope = resolveReceiptOwner(req);
    if (scope !== "distributor_customer") {
      return res.status(400).json({ ok: false, message: "Use company-distributor receipt route in next phase" });
    }

    const { CustomerReceiptModel } = await getScopedModels(req, { CustomerReceiptModel: CustomerReceipt });
    const body = req.body || {};

    const receipt = await CustomerReceiptModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerId: asText(body.distributorId || req.user.distributorId),
      distributorId: asText(body.distributorId || req.user.distributorId),
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

    return res.status(201).json({ ok: true, receipt });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create receipt" });
  }
});

router.post("/:id/post", requireAuth, async (req, res) => {
  try {
    const receipt = await postCustomerReceipt(req, req.params.id);
    return res.json({ ok: true, receipt });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to post receipt" });
  }
});

module.exports = router;