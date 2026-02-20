const express = require("express");
const { requireAuth } = require("../utils/auth");
const SalesOrder = require("../models/SalesOrder");
const User = require("../models/User");

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
      toValue: Number(item.toValue || 0),
      discValue: Number(item.discValue || 0),
      extraValue: Number(item.extraValue || 0),
      bonsValue: Number(item.bonsValue || 0),
      gstPer: Number(item.gstPer || 0),
    }));
}

function roleMatchQuery(user) {
  const role = String(user?.role || "").trim();
  const userId = String(user?.userId || "").trim();
  const authUid = String(user?.uid || user?._id || "").trim();
  const roleMappedIds = {
    "Brand Manager": String(user?.managerId || "").trim(),
    Distributor: String(user?.distributorId || "").trim(),
    "Order Booker": String(user?.orderBookerId || "").trim(),
    Salesman: String(user?.salesmanId || "").trim(),
    "Delivery Boy": String(user?.deliveryBoyId || "").trim(),
    customer: String(user?.customerId || "").trim(),
  };

  if (!role) return { _id: null };
  if (ADMIN_ROLES.has(role)) return {};

  const idsForRole = Array.from(new Set([userId, roleMappedIds[role]].filter(Boolean)));

  if (role === "Brand Manager") return { brandManagerId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
  if (role === "Distributor") return { distributorId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
  if (role === "Order Booker") {
    const roleQuery = { orderBookerId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
    return authUid ? { $or: [roleQuery, { createdBy: authUid }] } : roleQuery;
  }
  if (role === "Salesman") return { salesmanId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
  if (role === "Delivery Boy") return { deliveryBoyId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
  if (role === "customer") {
    const roleQuery = { customerId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
    return authUid ? { $or: [roleQuery, { createdBy: authUid }] } : roleQuery;
  }
  if (role === "Zone Sale Manager") return { zoneId: String(user?.zoneId || "").trim() || "__none__" };
  if (role === "Territory Sale Manager") return { territoryName: String(user?.territoryName || user?.areaName || "").trim() || "__none__" };

  return authUid ? { createdBy: authUid } : { _id: null };
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

router.get("/secondary/distributor", requireAuth, async (req, res) => {
  try {
    const role = String(req.user?.role || "").trim();
    if (role !== "Distributor") return res.status(403).json({ ok: false, message: "Forbidden" });

    const me = await User.findById(req.user?.uid).lean();
    if (!me) return res.status(404).json({ ok: false, message: "User not found" });

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const territoryName = String(me.territoryName || me.areaName || "").trim();
    const distributorIds = Array.from(new Set([String(me.userId || "").trim(), String(me.distributorId || "").trim()].filter(Boolean)));
    const warehouseId = String(me.warehouseId || "").trim();
    const warehouseNames = Array.from(new Set([String(me.businessName || "").trim(), String(me.fullName || "").trim(), String(me.warehouseName || "").trim()].filter(Boolean)));

    const query = { saleType: "secondary" };

    const relatedFilters = [];
    if (territoryName) relatedFilters.push({ territoryName });
    if (distributorIds.length) relatedFilters.push({ distributorId: { $in: distributorIds } });
    if (warehouseId) relatedFilters.push({ toWarehouseId: warehouseId });
    if (warehouseNames.length) relatedFilters.push({ toWarehouseName: { $in: warehouseNames } });
    if (relatedFilters.length) query.$or = relatedFilters;

    const orders = await SalesOrder.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load distributor secondary orders" });
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

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const removed = await SalesOrder.findOneAndDelete({ _id: req.params.id, ...roleMatchQuery(req.user) });
    if (!removed) return res.status(404).json({ ok: false, message: "Order not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to delete order" });
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
    if (status === "approved" && !order.invoiceNo) {
      order.invoiceNo = `INV-${Date.now()}`;
      order.invoiceGeneratedAt = new Date();
      order.receiptAgreement = "pending";
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

    addStatusHistory(order, status, req.user?.uid);
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
    const role = String(req.user?.role || "").trim();
    const authUser = await User.findById(req.user?.uid).lean();
    const ownUserId = authUser?.userId || req.user?.uid || "";
    const isBrandManager = role === "Brand Manager";
    const isDistributor = role === "Distributor";

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
      createdBy: req.user?.uid,
      brandManagerId: req.body?.brandManagerId || (isBrandManager ? ownUserId : authUser?.managerId) || "",
      distributorId: req.body?.distributorId || (isDistributor ? ownUserId : authUser?.distributorId) || "",
      orderBookerId: req.body?.orderBookerId || authUser?.orderBookerId || authUser?.userId || req.user?.uid || "",
      salesmanId: req.body?.salesmanId || authUser?.salesmanId || "",
      customerId: req.body?.customerId || authUser?.customerId || authUser?.userId || req.user?.uid || "",
      warehouseManagerId: req.body?.warehouseManagerId || authUser?.warehouseManagerId || "",
      deliveryBoyId: req.body?.deliveryBoyId || authUser?.deliveryBoyId || "",
      fromEntityName: req.body?.fromEntityName || authUser?.businessName || authUser?.fullName || "",
      fromEntityRole: req.body?.fromEntityRole || role,
      toWarehouseId: req.body?.toWarehouseId || "",
      toWarehouseName: req.body?.toWarehouseName || "",
      regionId: req.body?.regionId || authUser?.regionId || "",
      regionName: req.body?.regionName || authUser?.regionName || "",
      zoneId: req.body?.zoneId || authUser?.zoneId || "",
      zoneName: req.body?.zoneName || authUser?.zoneName || "",
      territoryName: req.body?.territoryName || authUser?.territoryName || authUser?.areaName || "",
      address: req.body?.address || authUser?.address || authUser?.shopAddress || "",
      statusHistory: [{ status: "pending", changedBy: req.user?.uid, changedAt: new Date(), note: "Order created" }],
    });

    return res.status(201).json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create sales order" });
  }
});

module.exports = router;