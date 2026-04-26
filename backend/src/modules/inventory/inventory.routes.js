const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./inventory.controller");
const router = express.Router();

router.get("/overview", requireAuth, controller.overview);
router.get("/stock-summary", requireAuth, controller.stockSummary);
router.get("/warehouse-stock-summary", requireAuth, controller.warehouseStockSummary);
router.get("/ledger", requireAuth, controller.ledger);

module.exports = router;
