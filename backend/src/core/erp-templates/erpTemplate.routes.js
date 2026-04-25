const express = require("express");
const controller = require("./erpTemplate.controller");
const router = express.Router();
router.get("/", controller.list);
router.get("/:key", controller.detail);
router.post("/", controller.upsert);
router.put("/:key", (req, res, next) => { req.body = { ...(req.body || {}), key: req.params.key }; return controller.upsert(req, res, next); });
module.exports = router;
