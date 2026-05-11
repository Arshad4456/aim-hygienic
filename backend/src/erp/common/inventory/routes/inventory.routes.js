const express = require("express");
const { requireAuth } = require("../../../platform/auth/utils/auth");
const InventoryLedger = require("../models/InventoryLedger");
const CompanyDispatchNote = require("../../../distribution/sales/models/CompanyDispatchNote");
const DistributorStockReceipt = require("../../../distribution/sales/models/DistributorStockReceipt");
const { getScopedModels, asText, normalizeRole } = require("../../../platform/tenancy/services/scopedModels");
const { postCompanyDispatch } = require("../../finance/workflows/posting/postCompanyDispatch");
const { postDistributorStockReceipt } = require("../../finance/workflows/posting/postDistributorStockReceipt");

const router = express.Router();

function roleScopedBaseQuery(req) {
  const role = normalizeRole(req.user?.role);
  const companyId = asText(req.user?.companyId);
  const distributorId = asText(req.user?.distributorId || req.user?.uid);
  const query = { companyId };

  if (role === "distributor") {
    query.$or = [
      { ownerType: "distributor", ownerId: distributorId },
      { distributorId },
    ];
  }

  return query;
}

router.get("/ledger", requireAuth, async (req, res) => {
  try {
    const { InventoryLedgerModel } = await getScopedModels(req, { InventoryLedgerModel: InventoryLedger });
    const query = roleScopedBaseQuery(req);

    if (req.query.ownerType) query.ownerType = asText(req.query.ownerType);
    if (req.query.ownerId) query.ownerId = asText(req.query.ownerId);
    if (req.query.warehouseId) query.warehouseId = asText(req.query.warehouseId);
    if (req.query.productId) query.productId = asText(req.query.productId);
    if (req.query.referenceType) query.referenceType = asText(req.query.referenceType);
    if (req.query.referenceId) query.referenceId = asText(req.query.referenceId);

    const rows = await InventoryLedgerModel.find(query).sort({ postedAt: -1, createdAt: -1 }).limit(1000).lean();
    return res.json({ ok: true, rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load inventory ledger" });
  }
});

router.get("/company-dispatches", requireAuth, async (req, res) => {
  try {
    const { CompanyDispatchNoteModel } = await getScopedModels(req, { CompanyDispatchNoteModel: CompanyDispatchNote });
    const query = { companyId: asText(req.user.companyId) };
    if (req.query.status && req.query.status !== "all") query.status = asText(req.query.status);
    if (req.query.distributorId) query.distributorId = asText(req.query.distributorId);

    const rows = await CompanyDispatchNoteModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load company dispatches" });
  }
});

router.post("/company-dispatches", requireAuth, async (req, res) => {
  try {
    const { CompanyDispatchNoteModel } = await getScopedModels(req, { CompanyDispatchNoteModel: CompanyDispatchNote });
    const body = req.body || {};

    const dispatch = await CompanyDispatchNoteModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerId: asText(req.user.companyId),
      companySalesOrderId: body.companySalesOrderId,
      distributorId: asText(body.distributorId),
      dispatchFromWarehouse: body.dispatchFromWarehouse,
      transporter: body.transporter,
      vehicleId: asText(body.vehicleId),
      driverUserId: asText(body.driverUserId),
      podUrl: asText(body.podUrl),
      status: "draft",
      dispatchedAt: body.dispatchedAt ? new Date(body.dispatchedAt) : null,
      lines: Array.isArray(body.lines) ? body.lines : [],
      createdByUserId: asText(req.user.uid),
      notes: asText(body.notes),
      statusHistory: [{ status: "draft", changedBy: asText(req.user.uid), note: "Created" }],
    });

    return res.status(201).json({ ok: true, dispatch });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create company dispatch" });
  }
});

router.post("/company-dispatches/:id/post", requireAuth, async (req, res) => {
  try {
    const doc = await postCompanyDispatch(req, req.params.id);
    return res.json({ ok: true, dispatch: doc });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to post company dispatch" });
  }
});

router.get("/distributor-stock-receipts", requireAuth, async (req, res) => {
  try {
    const { DistributorStockReceiptModel } = await getScopedModels(req, { DistributorStockReceiptModel: DistributorStockReceipt });
    const query = { companyId: asText(req.user.companyId) };
    const distributorId = asText(req.query.distributorId || req.user.distributorId || req.user.uid);
    const role = normalizeRole(req.user?.role);
    if (role === "distributor") query.distributorId = distributorId;
    if (req.query.status && req.query.status !== "all") query.status = asText(req.query.status);

    const rows = await DistributorStockReceiptModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load distributor stock receipts" });
  }
});

router.post("/distributor-stock-receipts", requireAuth, async (req, res) => {
  try {
    const { DistributorStockReceiptModel } = await getScopedModels(req, { DistributorStockReceiptModel: DistributorStockReceipt });
    const body = req.body || {};
    const distributorId = asText(body.distributorId || req.user.distributorId || req.user.uid);

    const receipt = await DistributorStockReceiptModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerId: distributorId,
      distributorId,
      sourceDispatchId: body.sourceDispatchId,
      receivedAtWarehouse: body.receivedAtWarehouse,
      podUrl: asText(body.podUrl),
      status: "draft",
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
      lines: Array.isArray(body.lines) ? body.lines : [],
      createdByUserId: asText(req.user.uid),
      notes: asText(body.notes),
      statusHistory: [{ status: "draft", changedBy: asText(req.user.uid), note: "Created" }],
    });

    return res.status(201).json({ ok: true, receipt });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create distributor stock receipt" });
  }
});

router.post("/distributor-stock-receipts/:id/post", requireAuth, async (req, res) => {
  try {
    const doc = await postDistributorStockReceipt(req, req.params.id);
    return res.json({ ok: true, receipt: doc });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to post distributor stock receipt" });
  }
});

module.exports = router;
