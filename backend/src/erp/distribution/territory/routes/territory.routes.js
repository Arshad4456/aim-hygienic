const express = require("express");
const { requireAuth } = require("../../../platform/auth/utils/auth");
const { requireCompanyModule } = require("../../../platform/access/permissions/companyAccessGuard");
const controller = require("../controllers/territory.controller");

const router = express.Router();
router.use(requireAuth, requireCompanyModule("territory"));

router.get("/overview", requireAuth, requireCompanyModule("territory"), controller.overview);
router.get("/hierarchy", requireAuth, controller.hierarchy);

module.exports = router;
