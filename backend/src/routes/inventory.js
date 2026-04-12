const express = require("express");
const { requireAuth } = require("../utils/auth");
const InventoryLedger = require("../models/InventoryLedger");
const { getScopedModels, asText } = require("../services/scopedModels");
const { postCompanyDispatch } = require("../services/posting/postCompanyDispatch");
const { postDistributorStockReceipt } = require("../services/posting/postDistributorStockReceipt");

const router = express.Router();

router.get("/ledger", requireAuth, async (req, res) => {
  try {
    const { InventoryLedgerModel } = await getScopedModels(req, { InventoryLedgerModel: InventoryLedger });
    const query = { companyId: asText(req.user.companyId) };

    if (req.query.ownerType) query.ownerType = asText(req.query.ownerType);
    if (req.query.ownerId) query.ownerId = asText(req.query.ownerId);
    if (req.query.warehouseId) query.warehouseId = asText(req.query.warehouseId);
    if (req.query.productId) query.productId = asText(req.query.productId);

    const rows = await InventoryLedgerModel.find(query).sort({ postedAt: -1 }).limit(500).lean();
    return res.json({ ok: true, rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load inventory ledger" });
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

router.post("/distributor-stock-receipts/:id/post", requireAuth, async (req, res) => {
  try {
    const doc = await postDistributorStockReceipt(req, req.params.id);
    return res.json({ ok: true, receipt: doc });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to post distributor stock receipt" });
  }
});

module.exports = router;