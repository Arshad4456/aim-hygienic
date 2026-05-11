const express = require("express");
const { requireAuth } = require("../../../../utils/auth");
const { requireCompanyModule } = require("../../../../core/access/companyAccessGuard");
const controller = require("./territory.controller");

const router = express.Router();
router.use(requireAuth, requireCompanyModule("territory"));

router.get("/overview", requireAuth, requireCompanyModule("territory"), controller.overview);
router.get("/hierarchy", requireAuth, controller.hierarchy);

module.exports = router;
