const express = require("express");
const { requireAuth } = require("../../auth/utils/auth");
const { requireCompanyModule } = require("../../access/permissions/companyAccessGuard");
const controller = require("../controllers/companyControl.controller");
const router = express.Router();
router.get("/overview", requireAuth, requireCompanyModule("company-control"), controller.overview);
module.exports = router;
