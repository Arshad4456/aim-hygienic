const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./warehouse.controller");
const router = express.Router();

router.get("/overview", requireAuth, controller.overview);

module.exports = router;
