const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./role.controller");
const router = express.Router();
router.get("/", requireAuth, controller.list);
router.post("/", requireAuth, controller.create);
router.put("/:id", requireAuth, controller.update);
router.delete("/:id", requireAuth, controller.remove);
module.exports = router;
