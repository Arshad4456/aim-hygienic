const express = require("express");
const { requireAuth } = require("../../../../utils/auth");
const controller = require("./notifications.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/overview", controller.overview);
router.get("/", controller.list);
router.post("/", controller.create);
router.post("/trigger", controller.trigger);
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);
router.delete("/:id", controller.remove);

module.exports = router;
