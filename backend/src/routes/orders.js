const express = require("express");
const { requireAuth } = require("../utils/auth");
const SalesOrder = require("../models/SalesOrder");

const router = express.Router();

const ALLOWED_STATUSES = ["pending", "approved", "rejected", "dispatched", "delivered"];
const ADMIN_ROLES = new Set(["admin", "Warehouse Manager"]);

function normalizeItems(items = []) {
  return items
    .filter((item) => item && item.productName && Number(item.quantity) > 0)
    .map((item) => ({
      productName: String(item.productName).trim(),
      productCode: item.productCode ? String(item.productCode).trim() : undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice || 0),
    }));
}

function roleMatchQuery(user) {
  const role = String(user?.role || "").trim();
  const userId = String(user?.userId || "").trim();

  if (!role) return { _id: null };
  if (ADMIN_ROLES.has(role)) return {};

  if (role === "Brand Manager") return { brandManagerId: userId || "__none__" };
  if (role === "Distributor") return { distributorId: userId || "__none__" };
  if (role === "Order Booker") return { orderBookerId: userId || "__none__" };
  if (role === "Salesman") return { salesmanId: userId || "__none__" };
  if (role === "Delivery Boy") return { deliveryBoyId: userId || "__none__" };
  if (role === "customer") return { customerId: userId || "__none__" };

  return { createdBy: user?._id };
}

function addStatusHistory(order, status, userId, note) {
  order.statusHistory.push({ status, changedBy: userId, note: note || undefined, changedAt: new Date() });
}

function canTransition(order, nextStatus) {
  const current = order.status;
  if (current === nextStatus) return true;

  if (current === "pending") return ["approved", "rejected"].includes(nextStatus);
  if (current === "approved") return ["dispatched", "rejected"].includes(nextStatus);
  if (current === "dispatched") return nextStatus === "delivered";
  if (current === "rejected") return order.canRecoverFromRejected && ["pending", "approved", "dispatched", "delivered"].includes(nextStatus);

  return false;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find(roleMatchQuery(req.user)).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales orders" });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find(roleMatchQuery(req.user)).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dashboard orders" });
  }
});

router.get("/approvals", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find({ ...roleMatchQuery(req.user), status: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load approval queue" });
  }
});

router.get("/dispatch", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find({ ...roleMatchQuery(req.user), status: { $in: ["approved", "dispatched"] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dispatch queue" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const match = roleMatchQuery(req.user);
    const [summary] = await SalesOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          dispatched: { $sum: { $cond: [{ $eq: ["$status", "dispatched"] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const recentOrders = await SalesOrder.find(match).sort({ createdAt: -1 }).limit(5).lean();

    return res.json({
      ok: true,
      summary: {
        total: summary?.total || 0,
        pending: summary?.pending || 0,
        approved: summary?.approved || 0,
        rejected: summary?.rejected || 0,
        dispatched: summary?.dispatched || 0,
        delivered: summary?.delivered || 0,
        totalAmount: summary?.totalAmount || 0,
      },
      recentOrders,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales order summary" });
  }
});

router.patch("/:id/mark-read", requireAuth, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    const role = String(req.user?.role || "");
    if (ADMIN_ROLES.has(role)) {
      order.unreadForAdmin = false;
      order.unreadForWarehouse = false;
    } else if (role === "Brand Manager") {
      order.unreadForBrandManager = false;
    } else if (role === "Distributor") {
      order.unreadForDistributor = false;
    } else if (role === "Salesman") {
      order.unreadForSalesman = false;
    } else if (role === "Order Booker") {
      order.unreadForOrderBooker = false;
    } else if (role === "customer") {
      order.unreadForCustomer = false;
    }

    await order.save();
    return res.json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to mark order as read" });
  }
});

router.patch("/:id/receipt-agreement", requireAuth, async (req, res) => {
  try {
    const agreement = String(req.body?.agreement || "").trim();
    if (!["agreed", "not_agreed"].includes(agreement)) {
      return res.status(400).json({ ok: false, message: "Invalid agreement action" });
    }

    const order = await SalesOrder.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    if (!["Brand Manager", "Distributor"].includes(String(req.user?.role || ""))) {
      return res.status(403).json({ ok: false, message: "Only Brand Manager or Distributor can confirm receipt" });
    }

    order.receiptAgreement = agreement;
    order.receiptAgreementAt = new Date();
    order.receiptAgreementBy = req.user?._id;
    await order.save();

    return res.json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to save receipt response" });
  }
});

router.patch("/:id/proof-of-delivery", requireAuth, async (req, res) => {
  try {
    const proofOfDeliveryImageUrl = String(req.body?.proofOfDeliveryImageUrl || "").trim();
    if (!proofOfDeliveryImageUrl) {
      return res.status(400).json({ ok: false, message: "Proof image URL is required" });
    }
    if (!["Salesman", "Delivery Boy"].includes(String(req.user?.role || ""))) {
      return res.status(403).json({ ok: false, message: "Only Salesman or Delivery Boy can upload proof" });
    }

    const order = await SalesOrder.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    order.proofOfDeliveryImageUrl = proofOfDeliveryImageUrl;
    order.proofOfDeliveryAt = new Date();
    order.proofOfDeliveryBy = req.user?._id;
    await order.save();

    return res.json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to upload proof of delivery" });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status, dispatchTracking, dispatchVehicleId, dispatchVehicleName, dispatchDriverId, dispatchDriverName, rejectionReason } = req.body || {};
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const order = await SalesOrder.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) });
    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }
    if (!canTransition(order, status)) {
      return res.status(400).json({ ok: false, message: "Invalid status transition" });
    }

    order.status = status;
    if (dispatchTracking) order.dispatchTracking = String(dispatchTracking).trim();
    if (dispatchVehicleId) order.dispatchVehicleId = String(dispatchVehicleId).trim();
    if (dispatchVehicleName) order.dispatchVehicleName = String(dispatchVehicleName).trim();
    if (dispatchDriverId) order.dispatchDriverId = String(dispatchDriverId).trim();
    if (dispatchDriverName) order.dispatchDriverName = String(dispatchDriverName).trim();
    if (rejectionReason) order.rejectionReason = String(rejectionReason).trim();

    if (status === "rejected") {
      order.unreadForBrandManager = true;
      order.unreadForDistributor = true;
      order.unreadForOrderBooker = true;
      order.unreadForCustomer = true;
    }
    if (status === "dispatched") {
      order.dispatchedAt = new Date();
      order.unreadForSalesman = true;
      order.unreadForOrderBooker = true;
      order.unreadForCustomer = true;
      order.unreadForDistributor = true;
      order.unreadForBrandManager = true;
    }
    if (status === "delivered") {
      order.deliveredAt = new Date();
      order.unreadForDistributor = true;
      order.unreadForBrandManager = true;
      order.unreadForOrderBooker = true;
      order.unreadForSalesman = true;
      order.unreadForCustomer = true;
    }
    if (order.statusHistory.some((entry) => entry.status === "rejected") && status !== "rejected") {
      order.canRecoverFromRejected = false;
    }

    addStatusHistory(order, status, req.user?._id);
    await order.save();

    return res.json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update order status" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { orderNo, customerName, customerType, expectedDelivery, notes, saleType, sourceType } = req.body || {};
    const items = normalizeItems(req.body?.items || []);

    if (!customerName || !items.length) {
      return res.status(400).json({ ok: false, message: "Customer name and order items are required" });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const order = await SalesOrder.create({
      orderNo: orderNo || `SO-${Date.now()}`,
      customerName: String(customerName).trim(),
      customerType: customerType || "customer",
      saleType: saleType === "secondary" ? "secondary" : "primary",
      sourceType: sourceType || "customer",
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      items,
      totalAmount,
      notes: notes ? String(notes).trim() : undefined,
      createdBy: req.user?._id,
      brandManagerId: req.body?.brandManagerId || req.user?.managerId || "",
      distributorId: req.body?.distributorId || req.user?.distributorId || "",
      orderBookerId: req.body?.orderBookerId || req.user?.orderBookerId || req.user?.userId || "",
      salesmanId: req.body?.salesmanId || req.user?.salesmanId || "",
      customerId: req.body?.customerId || req.user?.customerId || req.user?.userId || "",
      warehouseManagerId: req.body?.warehouseManagerId || req.user?.warehouseManagerId || "",
      deliveryBoyId: req.body?.deliveryBoyId || req.user?.deliveryBoyId || "",
      statusHistory: [{ status: "pending", changedBy: req.user?._id, changedAt: new Date(), note: "Order created" }],
    });

    return res.status(201).json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create sales order" });
  }
});

module.exports = router;
