const express = require("express");
const { requireAuth } = require("../utils/auth");
const SalesOrder = require("../models/SalesOrder");
const User = require("../models/User");
const Warehouse = require("../models/Warehouse");
const WarehouseTransaction = require("../models/WarehouseTransaction");

const router = express.Router();

const ALLOWED_STATUSES = ["pending", "approved", "rejected", "dispatched", "delivered"];
const ADMIN_ROLES = new Set(["admin", "system admin", "company admin"]);
const DELIVERY_APPROVER_ROLES = new Set(["admin", "warehouse manager", "distributor"]);
const POD_UPLOAD_ROLES = new Set(["salesman", "supplier"]);

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}


function getCompanyScopeQuery(user) {
  const companyId = String(user?.companyId || "").trim();
  return companyId ? { companyId } : {};
}

function withCompanyScope(user, query = {}) {
  const scopedCompany = getCompanyScopeQuery(user);
  return { ...query, ...scopedCompany };
}

function isWarehouseManagerRole(role) {
  return String(role || "").trim().toLowerCase() === "warehouse manager";
}

function getScopedWarehouseId(user) {
  return String(user?.warehouse_id || user?.warehouseId || "").trim();
}

async function getAuthenticatedUser(req) {
  if (!req.user?.uid) return null;
  return User.findById(req.user.uid).lean();
}

function getFieldScope(user) {
  return String(user?.fieldId || user?.field_id || "").trim();
}

async function getSalesmanFieldScope(req) {
  const authUser = await getAuthenticatedUser(req);
  const fieldId = getFieldScope(authUser);
  if (!fieldId) return { error: "Salesman field not configured" };
  return { authUser, fieldId };
}

function getSupplierWarehouseScope(user) {
  const warehouseIds = Array.from(
    new Set(
      [
        String(user?.supplierWarehouseId1 || "").trim(),
        String(user?.supplierWarehouseId2 || "").trim(),
        String(user?.warehouseId || "").trim(),
      ].filter(Boolean)
    )
  );
  const warehouseNames = Array.from(
    new Set(
      [
        String(user?.supplierWarehouseName1 || "").trim(),
        String(user?.supplierWarehouseName2 || "").trim(),
        String(user?.warehouseName || "").trim(),
      ].filter(Boolean)
    )
  );
  return { warehouseIds, warehouseNames };
}

async function resolveSupplierWarehouseScope(user) {
  const base = getSupplierWarehouseScope(user);
  const idCandidates = base.warehouseIds;
  const nameCandidates = base.warehouseNames;
  if (!idCandidates.length && !nameCandidates.length) return base;

  const docs = await Warehouse.find({
    $or: [
      { warehouseId: { $in: idCandidates } },
      { name: { $in: nameCandidates } },
    ],
  })
    .select("warehouseId name")
    .lean();

  const resolvedIds = new Set(idCandidates);
  const resolvedNames = new Set(nameCandidates);
  docs.forEach((doc) => {
    resolvedIds.add(String(doc?.warehouseId || "").trim());
    resolvedIds.add(String(doc?._id || "").trim());
    resolvedNames.add(String(doc?.name || "").trim());
  });

  return {
    warehouseIds: Array.from(resolvedIds).filter(Boolean),
    warehouseNames: Array.from(resolvedNames).filter(Boolean),
  };
}

function matchesSupplierWarehouseScope(order, warehouseIds = [], warehouseNames = []) {
  const orderWarehouseIds = [
    String(order?.toWarehouseId || "").trim(),
    String(order?.warehouseId || "").trim(),
  ].filter(Boolean);
  const orderWarehouseNames = [
    String(order?.toWarehouseName || "").trim(),
    String(order?.warehouseName || "").trim(),
  ].filter(Boolean);
  const inScopeById = orderWarehouseIds.some((id) => warehouseIds.includes(id));
  const inScopeByName = orderWarehouseNames.some((name) => warehouseNames.includes(name));
  return inScopeById || inScopeByName;
}

function mapWarehouseTransactionToSupplierOrder(transaction) {
  return {
    _id: String(transaction?._id || ""),
    sourceModel: "warehouse_transaction",
    orderNo: transaction?.transactionCode || "",
    invoiceNo: "",
    customerName: transaction?.fromEntityName || transaction?.toEntityName || "",
    address: transaction?.note || "",
    distributorName: transaction?.distributorName || "",
    fieldName: transaction?.fieldName || "",
    status: String(transaction?.requestStatus || "").trim().toLowerCase(),
    podUrl: transaction?.podUrl || "",
    toWarehouseId: transaction?.warehouseId || "",
    toWarehouseName: transaction?.warehouseName || "",
    createdAt: transaction?.transactionAt || transaction?.createdAt || new Date(),
  };
}

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

function serializePodUploader(user) {
  if (!user) return null;
  return {
    id: String(user._id || ""),
    name: String(user.fullName || user.name || user.userId || "").trim() || "Unknown",
  };
}

function withPodFields(order, uploaderById = {}) {
  if (!order) return order;
  const podUploaderId = String(order.podUploadedBy || "").trim();
  const podUploadedBy = podUploaderId ? (uploaderById[podUploaderId] || { id: podUploaderId, name: "Unknown" }) : null;
  return {
    ...order,
    podUploadedBy,
    pod_url: order.podUrl || null,
    pod_uploaded_at: order.podUploadedAt || null,
    pod_uploaded_by: podUploadedBy,
  };
}

async function attachPodMetaToOrders(orders = []) {
  const podUserIds = Array.from(
    new Set(
      orders
        .map((order) => String(order?.podUploadedBy || "").trim())
        .filter(Boolean)
    )
  );

  let uploaderById = {};
  if (podUserIds.length) {
    const users = await User.find({ _id: { $in: podUserIds } }).select("fullName name userId").lean();
    uploaderById = users.reduce((acc, user) => {
      acc[String(user._id)] = serializePodUploader(user);
      return acc;
    }, {});
  }

  return orders.map((order) => withPodFields(order, uploaderById));
}

async function attachPodMetaToOrder(order) {
  if (!order) return order;
  const [mapped] = await attachPodMetaToOrders([order]);
  return mapped;
}

function roleMatchQuery(user) {
  const rawRole = String(user?.role || "").trim();
  const role = normalizeRole(rawRole);
  const userId = String(user?.userId || "").trim();
  const authUid = String(user?.uid || user?._id || "").trim();
  const roleMappedIds = {
    "brand manager": String(user?.managerId || "").trim(),
    distributor: String(user?.distributorId || "").trim(),
    "order booker": String(user?.orderBookerId || "").trim(),
    salesman: String(user?.salesmanId || "").trim(),
    "delivery boy": String(user?.deliveryBoyId || "").trim(),
    customer: String(user?.customerId || "").trim(),
  };

  if (!role) return { _id: null };
  if (role === "system admin") return {};
  if (ADMIN_ROLES.has(role)) return withCompanyScope(user, {});
  if (isWarehouseManagerRole(rawRole)) {
    const warehouseId = getScopedWarehouseId(user);
    return withCompanyScope(user, warehouseId ? { toWarehouseId: warehouseId } : { _id: null });
  }

  const idsForRole = Array.from(new Set([userId, roleMappedIds[role]].filter(Boolean)));

  if (role === "brand manager") return withCompanyScope(user, { brandManagerId: { $in: idsForRole.length ? idsForRole : ["__none__"] } });
  if (role === "distributor") return withCompanyScope(user, { distributorId: { $in: idsForRole.length ? idsForRole : ["__none__"] } });
  if (role === "order booker") {
    const roleQuery = { orderBookerId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
    return withCompanyScope(user, authUid ? { $or: [roleQuery, { createdBy: authUid }] } : roleQuery);
  }
  if (role === "salesman") return withCompanyScope(user, { salesmanId: { $in: idsForRole.length ? idsForRole : ["__none__"] } });
  if (role === "delivery boy") return withCompanyScope(user, { deliveryBoyId: { $in: idsForRole.length ? idsForRole : ["__none__"] } });
  if (role === "customer") {
    const roleQuery = { customerId: { $in: idsForRole.length ? idsForRole : ["__none__"] } };
    return withCompanyScope(user, authUid ? { $or: [roleQuery, { createdBy: authUid }] } : roleQuery);
  }
  if (role === "zone sale manager") return withCompanyScope(user, { zoneId: String(user?.zoneId || "").trim() || "__none__" });
  if (role === "territory sale manager") return withCompanyScope(user, { territoryName: String(user?.territoryName || user?.areaName || "").trim() || "__none__" });

  return withCompanyScope(user, authUid ? { createdBy: authUid } : { _id: null });
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
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const query = roleMatchQuery(req.user);
    const [orders, total] = await Promise.all([
      SalesOrder.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SalesOrder.countDocuments(query),
    ]);
    return res.json({
      ok: true,
      orders: await attachPodMetaToOrders(orders),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales orders" });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrder.find(roleMatchQuery(req.user)).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders: await attachPodMetaToOrders(orders) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dashboard orders" });
  }
});

router.get("/secondary/distributor", requireAuth, async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== "distributor") return res.status(403).json({ ok: false, message: "Forbidden" });

    const me = await User.findById(req.user?.uid).lean();
    if (!me) return res.status(404).json({ ok: false, message: "User not found" });

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const territoryName = String(me.territoryName || me.areaName || "").trim();
    const distributorIds = Array.from(new Set([
      String(me.userId || "").trim(),
      String(me.distributorId || "").trim(),
      String(me._id || "").trim(),
      String(req.user?.distributorId || "").trim(),
    ].filter(Boolean)));
    const warehouseId = String(me.warehouseId || "").trim();
    const warehouseNames = Array.from(new Set([String(me.businessName || "").trim(), String(me.fullName || "").trim(), String(me.warehouseName || "").trim()].filter(Boolean)));

    const query = withCompanyScope(me, { saleType: "secondary", sourceType: { $in: ["customer", "order_booker"] } });

    const relatedFilters = [];
    if (territoryName) relatedFilters.push({ territoryName });
    if (distributorIds.length) relatedFilters.push({ distributorId: { $in: distributorIds } });
    if (warehouseId) relatedFilters.push({ toWarehouseId: warehouseId });
    if (warehouseNames.length) relatedFilters.push({ toWarehouseName: { $in: warehouseNames } });
    if (relatedFilters.length) query.$or = relatedFilters;

    const orders = await SalesOrder.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders: await attachPodMetaToOrders(orders) });
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
    return res.json({ ok: true, orders: await attachPodMetaToOrders(orders) });
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
    return res.json({ ok: true, orders: await attachPodMetaToOrders(orders) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dispatch queue" });
  }
});

router.get("/salesman-deliveries", requireAuth, async (req, res) => {
  try {
    if (String(req.user?.role || "") !== "Salesman") {
      return res.status(403).json({ ok: false, message: "Only Salesman can access deliveries" });
    }

    const scope = await getSalesmanFieldScope(req);
    if (scope.error) return res.status(400).json({ ok: false, message: scope.error });

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const orders = await SalesOrder.find({
      saleType: "secondary",
      fieldId: scope.fieldId,
      status: { $in: ["approved", "dispatched"] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, orders: await attachPodMetaToOrders(orders) });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load salesman deliveries" });
  }
});

router.get("/supplier-deliveries", requireAuth, async (req, res) => {
  try {
    if (normalizeRole(req.user?.role) !== "supplier") {
      return res.status(403).json({ ok: false, message: "Only Supplier can access deliveries" });
    }

    const me = await getAuthenticatedUser(req);
    if (!me) return res.status(404).json({ ok: false, message: "User not found" });
    const { warehouseIds, warehouseNames } = await resolveSupplierWarehouseScope(me);
    if (!warehouseIds.length && !warehouseNames.length) {
      return res.status(400).json({ ok: false, message: "Supplier warehouse mapping is required" });
    }

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const scoped = withCompanyScope(me, { saleType: "primary", status: { $in: ["approved", "dispatched"] } });
    const warehouseFilters = [];
    if (warehouseIds.length) {
      warehouseFilters.push({ toWarehouseId: { $in: warehouseIds } });
      warehouseFilters.push({ warehouseId: { $in: warehouseIds } });
    }
    if (warehouseNames.length) {
      warehouseFilters.push({ toWarehouseName: { $in: warehouseNames } });
      warehouseFilters.push({ warehouseName: { $in: warehouseNames } });
    }
    if (warehouseFilters.length) scoped.$or = warehouseFilters;

    const [salesOrders, warehouseTransactions] = await Promise.all([
      SalesOrder.find(scoped).sort({ createdAt: -1 }).limit(limit).lean(),
      WarehouseTransaction.find({
        ...withCompanyScope(me, {
          transactionType: "SALE_STOCK",
          requestStatus: { $in: ["APPROVED", "DISPATCHED"] },
        }),
        ...(warehouseIds.length || warehouseNames.length
          ? {
            $or: [
              ...(warehouseIds.length ? [{ warehouseId: { $in: warehouseIds } }] : []),
              ...(warehouseNames.length ? [{ warehouseName: { $in: warehouseNames } }] : []),
            ],
          }
          : {}),
      })
        .sort({ transactionAt: -1, createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const mappedSalesOrders = (await attachPodMetaToOrders(salesOrders)).map((order) => ({ ...order, sourceModel: "sales_order" }));
    const mappedWarehouseTransactions = warehouseTransactions.map(mapWarehouseTransactionToSupplierOrder);
    const orders = [...mappedSalesOrders, ...mappedWarehouseTransactions]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);

    return res.json({ ok: true, orders });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load supplier deliveries" });
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
    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order) });
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

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order) });
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

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to upload proof of delivery" });
  }
});

router.post("/:orderId/pod", requireAuth, async (req, res) => {
  try {
    const requestRole = normalizeRole(req.user?.role);
    if (!POD_UPLOAD_ROLES.has(requestRole)) {
      return res.status(403).json({ ok: false, message: "Only Salesman or Supplier can upload POD" });
    }

    const objectKey = String(req.body?.objectKey || "").trim();
    const publicUrl = String(req.body?.publicUrl || "").trim();
    const sourceModel = String(req.body?.sourceModel || "sales_order").trim().toLowerCase();
    if (!objectKey || !publicUrl) {
      return res.status(400).json({ ok: false, message: "objectKey and publicUrl are required" });
    }

    if (requestRole === "supplier" && sourceModel === "warehouse_transaction") {
      const transaction = await WarehouseTransaction.findById(req.params.orderId);
      if (!transaction) return res.status(404).json({ ok: false, message: "Order not found" });
      const me = await getAuthenticatedUser(req);
      if (!me) return res.status(404).json({ ok: false, message: "User not found" });
      const { warehouseIds, warehouseNames } = await resolveSupplierWarehouseScope(me);
      if (!matchesSupplierWarehouseScope(transaction, warehouseIds, warehouseNames)) {
        return res.status(403).json({ ok: false, message: "Order is outside your supplier warehouse scope" });
      }
      if (String(transaction.requestStatus || "").toUpperCase() !== "DISPATCHED") {
        return res.status(400).json({ ok: false, message: "POD upload is allowed only for dispatched orders" });
      }

      transaction.podObjectKey = objectKey;
      transaction.podUrl = publicUrl;
      transaction.podUploadedAt = new Date();
      transaction.podUploadedBy = req.user?.uid;
      transaction.proofOfDeliveryImageUrl = publicUrl;
      transaction.proofOfDeliveryAt = transaction.podUploadedAt;
      transaction.proofOfDeliveryBy = req.user?.uid;
      await transaction.save();
      return res.json({ ok: true, order: mapWarehouseTransactionToSupplierOrder(transaction.toObject ? transaction.toObject() : transaction) });
    }

    const order = await SalesOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    if (requestRole === "salesman") {
      const scope = await getSalesmanFieldScope(req);
      if (scope.error) return res.status(400).json({ ok: false, message: scope.error });
      if (String(order.fieldId || "").trim() !== scope.fieldId) {
        return res.status(403).json({ ok: false, message: "Order is outside your field" });
      }
    }
    if (requestRole === "supplier") {
      if (String(order.saleType || "").trim().toLowerCase() !== "primary") {
        return res.status(400).json({ ok: false, message: "Supplier can upload POD only for primary orders" });
      }
      const me = await getAuthenticatedUser(req);
      if (!me) return res.status(404).json({ ok: false, message: "User not found" });
      const { warehouseIds, warehouseNames } = await resolveSupplierWarehouseScope(me);
      if (!matchesSupplierWarehouseScope(order, warehouseIds, warehouseNames)) {
        return res.status(403).json({ ok: false, message: "Order is outside your supplier warehouse scope" });
      }
    }
    if (order.status !== "dispatched") {
      return res.status(400).json({ ok: false, message: "POD upload is allowed only for dispatched orders" });
    }

    order.podObjectKey = objectKey;
    order.podUrl = publicUrl;
    order.podUploadedAt = new Date();
    order.podUploadedBy = req.user?.uid;
    order.proofOfDeliveryImageUrl = publicUrl;
    order.proofOfDeliveryAt = order.podUploadedAt;
    order.proofOfDeliveryBy = req.user?.uid;
    await order.save();

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order) });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to save POD" });
  }
});


router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const query = { _id: req.params.id, ...roleMatchQuery(req.user) };
    const order = await SalesOrder.findOne(query);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    if (String(order.saleType || "") !== "secondary") {
      return res.status(400).json({ ok: false, message: "Only secondary orders can be edited here" });
    }

    if (String(order.status || "") !== "pending") {
      return res.status(400).json({ ok: false, message: "Only pending orders can be edited" });
    }

    const body = req.body || {};

    if (body.customerName != null) order.customerName = String(body.customerName || "").trim() || order.customerName;
    if (body.address != null) order.address = String(body.address || "").trim();
    if (body.notes != null) order.notes = String(body.notes || "").trim();

    if (Array.isArray(body.items)) {
      const items = normalizeItems(body.items);
      if (!items.length) return res.status(400).json({ ok: false, message: "At least one valid item is required" });
      order.items = items;
      order.totalAmount = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    }

    await order.save();
    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order) });
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to update order" });
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
    const { status, dispatchTracking, dispatchVehicleId, dispatchVehicleName, dispatchDriverId, dispatchDriverName, rejectionReason, sourceModel } = req.body || {};
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const requestRole = normalizeRole(req.user?.role);
    const normalizedSourceModel = String(sourceModel || "sales_order").trim().toLowerCase();

    if (requestRole === "supplier" && status === "dispatched" && normalizedSourceModel === "warehouse_transaction") {
      const transaction = await WarehouseTransaction.findById(req.params.id);
      if (!transaction) return res.status(404).json({ ok: false, message: "Order not found" });
      const me = await getAuthenticatedUser(req);
      if (!me) return res.status(404).json({ ok: false, message: "User not found" });
      const { warehouseIds, warehouseNames } = await resolveSupplierWarehouseScope(me);
      if (!matchesSupplierWarehouseScope(transaction, warehouseIds, warehouseNames)) {
        return res.status(403).json({ ok: false, message: "Order is outside your supplier warehouse scope" });
      }
      const currentStatus = String(transaction.requestStatus || "").toUpperCase();
      if (!["APPROVED", "DISPATCHED"].includes(currentStatus)) {
        return res.status(400).json({ ok: false, message: "Invalid status transition" });
      }
      transaction.requestStatus = "DISPATCHED";
      transaction.requestReviewedAt = new Date();
      transaction.requestReviewedBy = req.user?.uid;
      await transaction.save();
      return res.json({ ok: true, order: mapWarehouseTransactionToSupplierOrder(transaction.toObject ? transaction.toObject() : transaction) });
    }

    let order;

    if ((requestRole === "salesman" || requestRole === "supplier") && status === "dispatched") {
      order = await SalesOrder.findById(req.params.id);
    } else {
      order = await SalesOrder.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) });
    }

    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }
    if (status === "delivered" && !DELIVERY_APPROVER_ROLES.has(requestRole)) {
      return res.status(403).json({ ok: false, message: "Only Admin, Warehouse Manager or Distributor can mark delivered" });
    }
    if (status === "delivered" && !String(order.podUrl || "").trim()) {
      return res.status(400).json({ ok: false, message: "POD required" });
    }
    if (requestRole === "salesman" && status === "dispatched") {
      const scope = await getSalesmanFieldScope(req);
      if (scope.error) return res.status(400).json({ ok: false, message: scope.error });
      if (String(order.fieldId || "").trim() !== scope.fieldId) {
        return res.status(403).json({ ok: false, message: "Order is outside your field" });
      }
    }
    if (requestRole === "supplier" && status === "dispatched") {
      if (String(order.saleType || "").trim().toLowerCase() !== "primary") {
        return res.status(400).json({ ok: false, message: "Supplier can dispatch only primary orders" });
      }
      const me = await getAuthenticatedUser(req);
      if (!me) return res.status(404).json({ ok: false, message: "User not found" });
      const { warehouseIds, warehouseNames } = await resolveSupplierWarehouseScope(me);
      if (!matchesSupplierWarehouseScope(order, warehouseIds, warehouseNames)) {
        return res.status(403).json({ ok: false, message: "Order is outside your supplier warehouse scope" });
      }
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

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order) });
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
    const normalizedRole = normalizeRole(role);
    const authUser = await User.findById(req.user?.uid).lean();
    const ownUserId = authUser?.userId || req.user?.uid || "";
    const isBrandManager = normalizedRole === "brand manager";
    const isDistributor = normalizedRole === "distributor";
    const companyId = String(req.body?.companyId || authUser?.companyId || req.user?.companyId || "").trim();
    const companyName = String(req.body?.companyName || authUser?.companyName || req.user?.companyName || "").trim();

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
      fieldId: req.body?.fieldId || authUser?.fieldId || "",
      fieldName: req.body?.fieldName || authUser?.fieldName || "",
      address: req.body?.address || authUser?.address || authUser?.shopAddress || "",
      companyId,
      companyName,
      statusHistory: [{ status: "pending", changedBy: req.user?.uid, changedAt: new Date(), note: "Order created" }],
    });

    return res.status(201).json({ ok: true, order });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create sales order" });
  }
});

module.exports = router;
