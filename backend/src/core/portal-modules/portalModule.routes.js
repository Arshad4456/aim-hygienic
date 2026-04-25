const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./portalModule.controller");
const router = express.Router();
router.get("/", requireAuth, controller.list);
router.post("/seed", requireAuth, controller.seed);
router.post("/", requireAuth, controller.upsert);
module.exports = router;
