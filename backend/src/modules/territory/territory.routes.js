const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./territory.controller");

const router = express.Router();

router.get("/overview", requireAuth, controller.overview);
router.get("/hierarchy", requireAuth, controller.hierarchy);

module.exports = router;
