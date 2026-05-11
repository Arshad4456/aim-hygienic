const express = require("express");
const { requireAuth } = require("../../../platform/auth/utils/auth");
const { requireCompanyModule } = require("../../../platform/access/permissions/companyAccessGuard");
const controller = require("../controllers/warehouse.controller");
const router = express.Router();

router.get("/overview", requireAuth, requireCompanyModule("warehouse"), controller.overview);

module.exports = router;
