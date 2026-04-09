const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../utils/auth");
const SalesOrder = require("../models/SalesOrder");
const User = require("../models/User");
const Company = require("../models/Company");
const { isModuleSectionAllowed } = require("../utils/moduleAccess");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

const ALLOWED_STATUSES = ["pending", "approved", "rejected", "dispatched", "delivered"];
const ADMIN_ROLES = new Set(["admin", "system admin", "company admin"]);
const DELIVERY_APPROVER_ROLES = new Set(["admin", "warehouse manager", "distributor"]);

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}


function normalizeText(value) {
  return String(value || "").trim();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = normalizeText(companyId);
  const normalizedCompanyName = normalizeText(companyName);
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name companyId").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  const collectionName = baseModel.collection?.name;
  return db.models[modelName] || db.model(modelName, baseModel.schema, collectionName);
}

function resolveScopedCompany(req, requestedCompanyId = "", requestedCompanyName = "") {
  if (isSystemLevelAdmin(req.user?.role)) {
    return {
      companyId: normalizeText(requestedCompanyId || req.user?.companyId),
      companyName: normalizeText(requestedCompanyName || req.user?.companyName),
    };
  }
  return {
    companyId: normalizeText(req.user?.companyId),
    companyName: normalizeText(req.user?.companyName),
  };
}

async function getScopedOrderModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scope = resolveScopedCompany(req, requestedCompanyId, requestedCompanyName);
  if (!scope.companyId) {
    return { SalesOrderModel: SalesOrder, UserModel: User, scope };
  }
  const dbName = await resolveTenantDbName(scope.companyId, scope.companyName);
  if (!dbName) {
    return { SalesOrderModel: SalesOrder, UserModel: User, scope };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
    UserModel: getModelFromDb(tenantDb, User),
    scope,
  };
}

function moduleKeyForSaleType(saleType, role = "") {
  const normalizedSaleType = String(saleType || "").trim().toLowerCase();
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "distributor") {
    if (normalizedSaleType === "secondary") return "distributor.secondary-order";
    return "distributor.primary-order";
  }
  return normalizedSaleType === "secondary"
    ? "order-management.secondary"
    : "order-management.primary";
}

async function ensureOrderSectionAccess(user, saleType) {
  return isModuleSectionAllowed({
    companyId: user?.companyId,
    role: user?.role,
    key: moduleKeyForSaleType(saleType, user?.role),
  });
}

async function filterOrdersByModuleAccess(user, orders = []) {
  const filtered = [];
  for (const order of orders) {
    if (await ensureOrderSectionAccess(user, order?.saleType)) filtered.push(order);
  }
  return filtered;
}

function getCompanyScopeQuery(user) {
  const companyId = normalizeText(user?.companyId);
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

async function getAuthenticatedUser(req, UserModel = User) {
  if (!req.user?.uid) return null;
  let authUser = null;
  try {
    authUser = await UserModel.findById(req.user.uid).lean();
  } catch (_error) {
    authUser = null;
  }
  if (!authUser && UserModel !== User) {
    try {
      authUser = await User.findById(req.user.uid).lean();
    } catch (_error) {
      authUser = null;
    }
  }
  return authUser;
}

function getFieldScope(user, fallbackUser = null) {
  return normalizeText(
    user?.fieldId ||
    user?.field_id ||
    fallbackUser?.fieldId ||
    fallbackUser?.field_id ||
    ""
  );
}

async function getSalesmanFieldScope(req, UserModel = User) {
  const authUser = await getAuthenticatedUser(req, UserModel);
  const fieldId = getFieldScope(authUser, req.user);
  const salesmanIds = Array.from(
    new Set(
      [
        normalizeText(authUser?.userId),
        normalizeText(authUser?.salesmanId),
        normalizeText(req.user?.userId),
        normalizeText(req.user?.salesmanId),
        normalizeText(req.user?.uid),
      ].filter(Boolean)
    )
  );
  if (!fieldId && !salesmanIds.length) return { error: "Salesman field not configured" };
  return { authUser: authUser || req.user || null, fieldId, salesmanIds };
}

function buildSalesmanScopeQuery(scope = {}) {
  const or = [];
  if (scope.fieldId) or.push({ fieldId: scope.fieldId });
  if (Array.isArray(scope.salesmanIds) && scope.salesmanIds.length) {
    or.push({ salesmanId: { $in: scope.salesmanIds } });
  }
  if (!or.length) return { _id: null };
  return or.length === 1 ? or[0] : { $or: or };
}

function orderMatchesSalesmanScope(order, scope = {}) {
  if (!order) return false;
  const orderFieldId = normalizeText(order.fieldId);
  const orderSalesmanId = normalizeText(order.salesmanId);
  if (scope.fieldId && orderFieldId && orderFieldId === scope.fieldId) return true;
  if (Array.isArray(scope.salesmanIds) && scope.salesmanIds.length && orderSalesmanId && scope.salesmanIds.includes(orderSalesmanId)) return true;
  return false;
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

async function attachPodMetaToOrders(orders = [], UserModel = User) {
  const podUserIds = Array.from(
    new Set(
      orders
        .map((order) => String(order?.podUploadedBy || "").trim())
        .filter(Boolean)
    )
  );

  let uploaderById = {};
  if (podUserIds.length) {
    const users = await UserModel.find({ _id: { $in: podUserIds } }).select("fullName name userId").lean();
    uploaderById = users.reduce((acc, user) => {
      acc[String(user._id)] = serializePodUploader(user);
      return acc;
    }, {});
  }

  return orders.map((order) => withPodFields(order, uploaderById));
}

async function attachPodMetaToOrder(order, UserModel = User) {
  if (!order) return order;
  const [mapped] = await attachPodMetaToOrders([order], UserModel);
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
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.query?.companyId, req.query?.companyName);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const query = roleMatchQuery(req.user);
    const [orders, total] = await Promise.all([
      SalesOrderModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SalesOrderModel.countDocuments(query),
    ]);
    const allowedOrders = await filterOrdersByModuleAccess(req.user, orders);
    return res.json({
      ok: true,
      orders: await attachPodMetaToOrders(allowedOrders, UserModel),
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
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.query?.companyId, req.query?.companyName);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrderModel.find(roleMatchQuery(req.user)).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders: await attachPodMetaToOrders(await filterOrdersByModuleAccess(req.user, orders), UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dashboard orders" });
  }
});

router.get("/secondary/distributor", requireAuth, async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== "distributor") return res.status(403).json({ ok: false, message: "Forbidden" });

    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.query?.companyId, req.query?.companyName);
    const me = await getAuthenticatedUser(req, UserModel);
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

    const orders = await SalesOrderModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, orders: await attachPodMetaToOrders(await filterOrdersByModuleAccess(req.user, orders), UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load distributor secondary orders" });
  }
});

router.get("/approvals", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.query?.companyId, req.query?.companyName);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrderModel.find({ ...roleMatchQuery(req.user), status: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ ok: true, orders: await attachPodMetaToOrders(await filterOrdersByModuleAccess(req.user, orders), UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load approval queue" });
  }
});

router.get("/dispatch", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.query?.companyId, req.query?.companyName);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await SalesOrderModel.find({ ...roleMatchQuery(req.user), status: { $in: ["approved", "dispatched"] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ ok: true, orders: await attachPodMetaToOrders(await filterOrdersByModuleAccess(req.user, orders), UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load dispatch queue" });
  }
});

router.get("/salesman-deliveries", requireAuth, async (req, res) => {
  try {
    if (String(req.user?.role || "") !== "Salesman") {
      return res.status(403).json({ ok: false, message: "Only Salesman can access deliveries" });
    }

    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.query?.companyId, req.query?.companyName);
    const scope = await getSalesmanFieldScope(req, UserModel);
    if (scope.error) return res.status(400).json({ ok: false, message: scope.error });

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const orders = await SalesOrderModel.find({
      saleType: "secondary",
      status: { $in: ["approved", "dispatched"] },
      ...buildSalesmanScopeQuery(scope),
      ...getCompanyScopeQuery(req.user),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, orders: await attachPodMetaToOrders(await filterOrdersByModuleAccess(req.user, orders), UserModel) });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load salesman deliveries" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.query?.companyId, req.query?.companyName);
    const match = roleMatchQuery(req.user);
    const [summary] = await SalesOrderModel.aggregate([
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

    const recentOrders = await SalesOrderModel.find(match).sort({ createdAt: -1 }).limit(5).lean();
    const allowedRecentOrders = await filterOrdersByModuleAccess(req.user, recentOrders);

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
      recentOrders: await attachPodMetaToOrders(allowedRecentOrders, UserModel),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales order summary" });
  }
});

router.patch("/:id/mark-read", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const order = await SalesOrderModel.findById(req.params.id);
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
    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to mark order as read" });
  }
});

router.patch("/:id/receipt-agreement", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const agreement = String(req.body?.agreement || "").trim();
    if (!["agreed", "not_agreed"].includes(agreement)) {
      return res.status(400).json({ ok: false, message: "Invalid agreement action" });
    }

    const order = await SalesOrderModel.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    if (!(await ensureOrderSectionAccess(req.user, order.saleType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!["Brand Manager", "Distributor"].includes(String(req.user?.role || ""))) {
      return res.status(403).json({ ok: false, message: "Only Brand Manager or Distributor can confirm receipt" });
    }

    order.receiptAgreement = agreement;
    order.receiptAgreementAt = new Date();
    order.receiptAgreementBy = req.user?._id;
    await order.save();

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to save receipt response" });
  }
});

router.patch("/:id/proof-of-delivery", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const proofOfDeliveryImageUrl = String(req.body?.proofOfDeliveryImageUrl || "").trim();
    if (!proofOfDeliveryImageUrl) {
      return res.status(400).json({ ok: false, message: "Proof image URL is required" });
    }
    if (!["Salesman", "Delivery Boy"].includes(String(req.user?.role || ""))) {
      return res.status(403).json({ ok: false, message: "Only Salesman or Delivery Boy can upload proof" });
    }

    const order = await SalesOrderModel.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    if (!(await ensureOrderSectionAccess(req.user, order.saleType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }

    order.proofOfDeliveryImageUrl = proofOfDeliveryImageUrl;
    order.proofOfDeliveryAt = new Date();
    order.proofOfDeliveryBy = req.user?._id;
    await order.save();

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to upload proof of delivery" });
  }
});

router.post("/:orderId/pod", requireAuth, async (req, res) => {
  try {
    if (String(req.user?.role || "") !== "Salesman") {
      return res.status(403).json({ ok: false, message: "Only Salesman can upload POD" });
    }

    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const objectKey = String(req.body?.objectKey || "").trim();
    const publicUrl = String(req.body?.publicUrl || "").trim();
    if (!objectKey || !publicUrl) {
      return res.status(400).json({ ok: false, message: "objectKey and publicUrl are required" });
    }

    const scope = await getSalesmanFieldScope(req, UserModel);
    if (scope.error) return res.status(400).json({ ok: false, message: scope.error });

    const order = await SalesOrderModel.findById(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    if (!(await ensureOrderSectionAccess(req.user, order.saleType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!orderMatchesSalesmanScope(order, scope)) {
      return res.status(403).json({ ok: false, message: "Order is outside your field" });
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

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order, UserModel) });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to save POD" });
  }
});


router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const query = { _id: req.params.id, ...roleMatchQuery(req.user) };
    const order = await SalesOrderModel.findOne(query);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    if (!(await ensureOrderSectionAccess(req.user, order.saleType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }

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
    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order, UserModel) });
  } catch {
    return res.status(500).json({ ok: false, message: "Failed to update order" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel } = await getScopedOrderModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const existing = await SalesOrderModel.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) }).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Order not found" });
    if (!(await ensureOrderSectionAccess(req.user, existing.saleType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    await SalesOrderModel.findByIdAndDelete(req.params.id);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to delete order" });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel } = await getScopedOrderModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const { status, dispatchTracking, dispatchVehicleId, dispatchVehicleName, dispatchDriverId, dispatchDriverName, rejectionReason } = req.body || {};
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const requestRole = normalizeRole(req.user?.role);
    let order;

    if (requestRole === "salesman" && status === "dispatched") {
      order = await SalesOrderModel.findById(req.params.id);
    } else {
      order = await SalesOrderModel.findOne({ _id: req.params.id, ...roleMatchQuery(req.user) });
    }

    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }
    if (!(await ensureOrderSectionAccess(req.user, order.saleType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (status === "delivered" && !DELIVERY_APPROVER_ROLES.has(requestRole)) {
      return res.status(403).json({ ok: false, message: "Only Admin, Warehouse Manager or Distributor can mark delivered" });
    }
    if (status === "delivered" && !String(order.podUrl || "").trim()) {
      return res.status(400).json({ ok: false, message: "POD required" });
    }
    if (requestRole === "salesman" && status === "dispatched") {
      const scope = await getSalesmanFieldScope(req, UserModel);
      if (scope.error) return res.status(400).json({ ok: false, message: scope.error });
      if (!orderMatchesSalesmanScope(order, scope)) {
        return res.status(403).json({ ok: false, message: "Order is outside your field" });
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

    return res.json({ ok: true, order: await attachPodMetaToOrder(order.toObject ? order.toObject() : order, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update order status" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel, UserModel, scope } = await getScopedOrderModels(req, req.body?.companyId, req.body?.companyName);
    const { orderNo, customerName, customerType, expectedDelivery, notes, saleType, sourceType } = req.body || {};
    const items = normalizeItems(req.body?.items || []);
    const normalizedSaleType = saleType === "secondary" ? "secondary" : "primary";

    if (!(await ensureOrderSectionAccess(req.user, normalizedSaleType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }

    if (!customerName || !items.length) {
      return res.status(400).json({ ok: false, message: "Customer name and order items are required" });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const role = String(req.user?.role || "").trim();
    const normalizedRole = normalizeRole(role);
    const authUser = await getAuthenticatedUser(req, UserModel);
    const ownUserId = authUser?.userId || req.user?.uid || "";
    const isBrandManager = normalizedRole === "brand manager";
    const isDistributor = normalizedRole === "distributor";
    const companyId = normalizeText(req.body?.companyId || authUser?.companyId || req.user?.companyId || scope?.companyId || "");
    const companyName = normalizeText(req.body?.companyName || authUser?.companyName || req.user?.companyName || scope?.companyName || "");

    const order = await SalesOrderModel.create({
      orderNo: orderNo || `SO-${Date.now()}`,
      customerName: String(customerName).trim(),
      customerType: customerType || "customer",
      saleType: normalizedSaleType,
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
      fieldId: req.body?.fieldId || authUser?.fieldId || req.user?.fieldId || "",
      fieldName: req.body?.fieldName || authUser?.fieldName || req.user?.fieldName || "",
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