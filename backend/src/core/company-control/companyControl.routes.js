const express = require("express");
const { requireAuth } = require("../../utils/auth");
const { requireCompanyModule } = require("../access/companyAccessGuard");
const controller = require("./companyControl.controller");
const router = express.Router();
router.get("/overview", requireAuth, requireCompanyModule("company-control"), controller.overview);
module.exports = router;
