const express = require("express");
const { requireAuth } = require("../utils/auth");
const { normalizeRole, asText } = require("../services/scopedModels");
const companySalesOrders = require("../services/orders/companySalesOrders");
const secondaryOrders = require("../services/orders/secondaryOrders");

const router = express.Router();

function routeOrderFamily(req) {
  const family = asText(req.query.family || req.body.family || "");
  if (family === "company_supply") return "company_supply";
  if (family === "secondary") return "secondary";

  const role = normalizeRole(req.user?.role);
  if (role === "distributor" || role === "salesman" || role === "customer" || role.includes("order")) {
    return "secondary";
  }
  return "company_supply";
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const family = routeOrderFamily(req);
    const orders = family === "company_supply"
      ? await companySalesOrders.list(req)
      : await secondaryOrders.list(req);

    return res.json({ ok: true, family, orders });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load orders" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const family = routeOrderFamily(req);
    const order = family === "company_supply"
      ? await companySalesOrders.create(req)
      : await secondaryOrders.create(req);

    return res.status(201).json({ ok: true, family, order });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create order" });
  }
});

router.post("/:id/approve", requireAuth, async (req, res) => {
  try {
    const family = routeOrderFamily(req);
    const order = family === "company_supply"
      ? await companySalesOrders.approve(req)
      : await secondaryOrders.approve(req);

    return res.json({ ok: true, family, order });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to approve order" });
  }
});

module.exports = router;