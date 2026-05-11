const express = require("express");
const { requireAuth } = require("../../../../utils/auth");
const { requireCompanyModule } = require("../../../access/companyAccessGuard");
const controller = require("./inventory.controller");
const router = express.Router();

router.use(requireAuth, requireCompanyModule("inventory"));
router.get("/overview", controller.overview);
router.get("/stock-summary", controller.stockSummary);
router.get("/warehouse-stock-summary", controller.warehouseStockSummary);
router.get("/ledger", controller.ledger);
router.get("/stock-card", controller.stockCard);
router.get("/low-stock", controller.lowStock);
router.get("/valuation", controller.valuation);
router.get("/batches", controller.batches);
router.get("/adjustments", controller.adjustments);
router.post("/adjustments", controller.createAdjustment);
router.get("/transfers", controller.transfers);
router.post("/transfers", controller.createTransfer);
router.post("/transfers/:id/complete", controller.completeTransfer);

module.exports = router;
