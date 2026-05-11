const express = require("express");
const { requireAuth } = require("../../../utils/auth");
const { requireCompanyModule } = require("../../access/companyAccessGuard");
const controller = require("./warehouse.controller");
const router = express.Router();

router.get("/overview", requireAuth, requireCompanyModule("warehouse"), controller.overview);

module.exports = router;
