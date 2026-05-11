const express = require("express");
const { requireAuth } = require("../../../platform/auth/utils/auth");
const { normalizeRole, asText } = require("../../../platform/tenancy/services/scopedModels");
const companySalesOrders = require("../services/orders/companySalesOrders");
const secondaryOrders = require("../services/orders/secondaryOrders");

const router = express.Router();

function routeOrderFamily(req) {
  const family = asText(req.query.family || req.body.family || "").toLowerCase();
  const saleType = asText(req.query.saleType || req.body.saleType || "").toLowerCase();

  if (family === "company_supply") return "company_supply";
  if (family === "secondary") return "secondary";
  if (saleType === "primary") return "company_supply";
  if (saleType === "secondary") return "secondary";

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

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const family = routeOrderFamily(req);
    const list = family === "company_supply"
      ? await companySalesOrders.list({ ...req, query: { ...req.query, id: req.params.id } })
      : await secondaryOrders.list({ ...req, query: { ...req.query, id: req.params.id } });

    const order = Array.isArray(list)
      ? list.find((row) => String(row._id) === String(req.params.id)) || null
      : null;

    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    return res.json({ ok: true, family, order });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to load order" });
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
