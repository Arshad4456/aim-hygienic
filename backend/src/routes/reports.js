const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../utils/auth");
const InventoryMovement = require("../models/InventoryMovement");
const Expense = require("../models/Expense");
const Account = require("../models/Account");
const Company = require("../models/Company");
const User = require("../models/User");
const Warehouse = require("../models/Warehouse");
const StockTransfer = require("../models/StockTransfer");
const Vehicle = require("../models/Vehicle");
const VehicleTrip = require("../models/VehicleTrip");
const Product = require("../models/Product");
const Message = require("../models/Message");
const ReturnClaim = require("../models/ReturnClaim");
const SalesOrder = require("../models/SalesOrder");
const Receipt = require("../models/Receipt");
const PrimaryPayment = require("../models/PrimaryPayment");
const SecondaryPayment = require("../models/SecondaryPayment");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function isDistributorRole(role) {
  return normalizeRole(role) === "distributor";
}

function asObjectId(value) {
  const raw = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(raw) ? new mongoose.Types.ObjectId(raw) : null;
}

function compact(values) {
  return [...new Set(values.filter(Boolean))];
}

function getDistributorCandidates(user = {}) {
  const stringValues = compact([
    String(user?.distributorId || "").trim(),
    String(user?.uid || "").trim(),
    String(user?._id || "").trim(),
    String(user?.userId || "").trim(),
  ]);
  const objectIds = compact(stringValues.map(asObjectId));
  return { stringValues, objectIds };
}

function buildMixedMatch(field, values = []) {
  const stringValues = compact(values.map((value) => String(value || "").trim()));
  const objectIds = compact(stringValues.map(asObjectId));
  const clauses = [];
  if (stringValues.length) clauses.push({ [field]: { $in: stringValues } });
  if (objectIds.length) clauses.push({ [field]: { $in: objectIds } });
  if (!clauses.length) return {};
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function buildDistributorMatch(field, user) {
  const { stringValues, objectIds } = getDistributorCandidates(user);
  const clauses = [];
  if (stringValues.length) clauses.push({ [field]: { $in: stringValues } });
  if (objectIds.length) clauses.push({ [field]: { $in: objectIds } });
  if (!clauses.length) return { _id: null };
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function monthLabel(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatMaybeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function scoreSeverity(level) {
  if (level === "critical") return 3;
  if (level === "warning") return 2;
  return 1;
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  const normalizedCompanyName = String(companyName || "").trim();
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

function getScopedCompanyContext(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyId || "").trim()
    : String(req.user?.companyId || "").trim();
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyName || "").trim()
    : String(req.user?.companyName || "").trim();
  return { scopedCompanyId, scopedCompanyName };
}

async function getScopedReportModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const { scopedCompanyId, scopedCompanyName } = getScopedCompanyContext(req, requestedCompanyId, requestedCompanyName);
  const fallback = {
    InventoryMovementModel: InventoryMovement,
    ExpenseModel: Expense,
    AccountModel: Account,
    UserModel: User,
    WarehouseModel: Warehouse,
    StockTransferModel: StockTransfer,
    VehicleModel: Vehicle,
    VehicleTripModel: VehicleTrip,
    ProductModel: Product,
    MessageModel: Message,
    ReturnClaimModel: ReturnClaim,
    SalesOrderModel: SalesOrder,
    ReceiptModel: Receipt,
    PrimaryPaymentModel: PrimaryPayment,
    SecondaryPaymentModel: SecondaryPayment,
  };

  if (!scopedCompanyId) return fallback;
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) return fallback;

  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    InventoryMovementModel: getModelFromDb(tenantDb, InventoryMovement),
    ExpenseModel: getModelFromDb(tenantDb, Expense),
    AccountModel: getModelFromDb(tenantDb, Account),
    UserModel: getModelFromDb(tenantDb, User),
    WarehouseModel: getModelFromDb(tenantDb, Warehouse),
    StockTransferModel: getModelFromDb(tenantDb, StockTransfer),
    VehicleModel: getModelFromDb(tenantDb, Vehicle),
    VehicleTripModel: getModelFromDb(tenantDb, VehicleTrip),
    ProductModel: getModelFromDb(tenantDb, Product),
    MessageModel: getModelFromDb(tenantDb, Message),
    ReturnClaimModel: getModelFromDb(tenantDb, ReturnClaim),
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
    ReceiptModel: getModelFromDb(tenantDb, Receipt),
    PrimaryPaymentModel: getModelFromDb(tenantDb, PrimaryPayment),
    SecondaryPaymentModel: getModelFromDb(tenantDb, SecondaryPayment),
  };
}

function buildScopedMatches(req) {
  const role = normalizeRole(req.user?.role);
  const distributorOrderMatch = isDistributorRole(role) ? buildDistributorMatch("distributorId", req.user) : {};
  const distributorUserMatch = isDistributorRole(role) ? buildMixedMatch("distributorId", getDistributorCandidates(req.user).stringValues) : {};
  const distributorExpenseMatch = isDistributorRole(role) ? buildDistributorMatch("distributorId", req.user) : {};
  const distributorReceiptMatch = isDistributorRole(role)
    ? buildMixedMatch("payerUserId", [req.user?.uid, req.user?._id])
    : {};

  return {
    role,
    orderMatch: distributorOrderMatch,
    userMatch: distributorUserMatch,
    expenseMatch: distributorExpenseMatch,
    receiptMatch: distributorReceiptMatch,
    paymentMatch: isDistributorRole(role) ? buildDistributorMatch("distributorId", req.user) : {},
    distributorScope: isDistributorRole(role),
  };
}

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((safeNumber(part) / safeNumber(whole)) * 100);
}

async function buildOverviewPayload(req) {
  const models = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
  const {
    InventoryMovementModel,
    ExpenseModel,
    AccountModel,
    UserModel,
    WarehouseModel,
    StockTransferModel,
    VehicleModel,
    VehicleTripModel,
    ProductModel,
    MessageModel,
    ReturnClaimModel,
    SalesOrderModel,
    ReceiptModel,
    PrimaryPaymentModel,
    SecondaryPaymentModel,
  } = models;

  const scope = buildScopedMatches(req);
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const salesMatch = scope.orderMatch;
  const expenseMatch = scope.expenseMatch;
  const receiptMatch = scope.receiptMatch;
  const paymentMatch = scope.paymentMatch;
  const userMatch = scope.userMatch;

  const [
    orderSummary,
    orderStatus,
    monthlySales,
    areaPerformance,
    topCustomers,
    topProducts,
    expenseSummary,
    expenseCategories,
    receiptSummary,
    receiptStatus,
    primaryPaymentSummary,
    overduePayments,
    secondaryPaymentSummary,
    warehouseCount,
    productCount,
    warehouseMovements,
    lowStockItems,
    userRoleCounts,
    activeUsers,
    activeCustomers,
    activeDistributors,
    vehicleTrips,
    vehicleCount,
    transferStatus,
    returnClaimsCount,
    messageCount,
    recentOrders,
    deliveryExceptions,
    supplierCount,
  ] = await Promise.all([
    SalesOrderModel.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          deliveredRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "delivered"] }, { $ifNull: ["$totalAmount", 0] }, 0],
            },
          },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          dispatched: { $sum: { $cond: [{ $eq: ["$status", "dispatched"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          missingPod: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "delivered"] },
                    { $eq: [{ $ifNull: ["$podUrl", ""] }, ""] },
                    { $eq: [{ $ifNull: ["$proofOfDeliveryImageUrl", ""] }, ""] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          podUploaded: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $ne: [{ $ifNull: ["$podUrl", ""] }, ""] },
                    { $ne: [{ $ifNull: ["$proofOfDeliveryImageUrl", ""] }, ""] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    SalesOrderModel.aggregate([
      { $match: salesMatch },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 }, amount: { $sum: { $ifNull: ["$totalAmount", 0] } } } },
      { $sort: { count: -1 } },
    ]),
    SalesOrderModel.aggregate([
      { $match: { ...salesMatch, orderDate: { $gte: ninetyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
          },
          amount: { $sum: { $ifNull: ["$totalAmount", 0] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    SalesOrderModel.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: {
            territory: { $ifNull: ["$territoryName", "Unassigned"] },
            region: { $ifNull: ["$regionName", "Unassigned"] },
          },
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          orders: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    SalesOrderModel.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: { $ifNull: ["$customerName", "Unassigned"] },
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          orders: { $sum: 1 },
          lastOrderDate: { $max: "$orderDate" },
          outstanding: {
            $sum: {
              $cond: [
                { $eq: ["$status", "delivered"] },
                0,
                { $ifNull: ["$totalAmount", 0] },
              ],
            },
          },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    SalesOrderModel.aggregate([
      { $match: salesMatch },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $ifNull: ["$items.productName", "Unassigned"] },
          quantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
          revenue: { $sum: { $multiply: [{ $ifNull: ["$items.quantity", 0] }, { $ifNull: ["$items.unitPrice", 0] }] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    ExpenseModel.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$amount", 0] } },
          approved: { $sum: { $cond: [{ $in: ["$status", ["approved", "paid", "posted"]] }, { $ifNull: ["$amount", 0] }, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        },
      },
    ]),
    ExpenseModel.aggregate([
      { $match: expenseMatch },
      { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, total: { $sum: { $ifNull: ["$amount", 0] } }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
    ReceiptModel.aggregate([
      { $match: receiptMatch },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } }, count: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, { $ifNull: ["$amount", 0] }, 0] } } } },
    ]),
    ReceiptModel.aggregate([
      { $match: receiptMatch },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 }, amount: { $sum: { $ifNull: ["$amount", 0] } } } },
      { $sort: { count: -1 } },
    ]),
    PrimaryPaymentModel.aggregate([
      { $match: paymentMatch },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amountTotal", 0] } }, outstanding: { $sum: { $ifNull: ["$amountRemaining", 0] } }, open: { $sum: { $cond: [{ $gt: ["$amountRemaining", 0] }, 1, 0] } }, closed: { $sum: { $cond: [{ $eq: ["$amountRemaining", 0] }, 1, 0] } } } },
    ]),
    PrimaryPaymentModel.aggregate([
      { $match: { ...paymentMatch, amountRemaining: { $gt: 0 }, returnDate: { $lt: now } } },
      { $sort: { returnDate: 1 } },
      { $limit: 10 },
      { $project: { distributorName: 1, invoiceNo: 1, amountRemaining: 1, returnDate: 1, territoryName: 1, warehouseName: 1 } },
    ]),
    SecondaryPaymentModel.aggregate([
      { $match: paymentMatch },
      { $group: { _id: null, paidBack: { $sum: { $ifNull: ["$amountPaid", 0] } }, count: { $sum: 1 } } },
    ]),
    scope.distributorScope ? Promise.resolve(0) : WarehouseModel.countDocuments(),
    ProductModel.countDocuments(),
    scope.distributorScope
      ? Promise.resolve([])
      : InventoryMovementModel.aggregate([
          {
            $group: {
              _id: { $ifNull: ["$warehouseName", "Unassigned"] },
              inQty: { $sum: { $cond: [{ $in: ["$movementType", ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"]] }, "$quantity", 0] } },
              outQty: { $sum: { $cond: [{ $in: ["$movementType", ["SALE_OUT", "TRANSFER_OUT"]] }, "$quantity", 0] } },
              adjusted: { $sum: { $cond: [{ $eq: ["$movementType", "ADJUSTMENT"] }, "$quantity", 0] } },
              lastMovementAt: { $max: "$createdAt" },
            },
          },
          { $sort: { lastMovementAt: -1 } },
          { $limit: 8 },
        ]),
    scope.distributorScope
      ? Promise.resolve([])
      : ProductModel.aggregate([
          {
            $lookup: {
              from: "inventorymovements",
              let: { pid: "$productId" },
              pipeline: [
                { $match: { $expr: { $eq: ["$productId", "$$pid"] } } },
                {
                  $group: {
                    _id: null,
                    inQty: { $sum: { $cond: [{ $in: ["$movementType", ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"]] }, "$quantity", 0] } },
                    outQty: { $sum: { $cond: [{ $in: ["$movementType", ["SALE_OUT", "TRANSFER_OUT"]] }, "$quantity", 0] } },
                  },
                },
              ],
              as: "movementAgg",
            },
          },
          {
            $addFields: {
              movementAgg: { $ifNull: [{ $arrayElemAt: ["$movementAgg", 0] }, { inQty: 0, outQty: 0 }] },
            },
          },
          {
            $addFields: {
              onHand: { $subtract: [{ $ifNull: ["$movementAgg.inQty", 0] }, { $ifNull: ["$movementAgg.outQty", 0] }] },
            },
          },
          {
            $match: {
              $expr: {
                $lte: ["$onHand", { $ifNull: ["$minStockLevel", 0] }],
              },
            },
          },
          { $sort: { onHand: 1, minStockLevel: -1 } },
          { $limit: 8 },
          { $project: { name: 1, productId: 1, category: 1, onHand: 1, minStockLevel: 1 } },
        ]),
    UserModel.aggregate([
      { $match: userMatch },
      { $group: { _id: { $ifNull: ["$role", "Unassigned"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    UserModel.countDocuments({ ...(userMatch || {}), status: "active" }),
    scope.distributorScope
      ? SalesOrderModel.distinct("customerId", salesMatch).then((rows) => rows.filter(Boolean).length)
      : UserModel.countDocuments({ ...(userMatch || {}), role: { $regex: /customer/i }, status: "active" }),
    scope.distributorScope
      ? Promise.resolve(1)
      : UserModel.countDocuments({ role: { $regex: /distributor/i }, status: "active" }),
    VehicleTripModel.aggregate([
      { $group: { _id: null, distance: { $sum: { $ifNull: ["$distance", 0] } }, trips: { $sum: 1 } } },
    ]),
    VehicleModel.countDocuments(),
    StockTransferModel.aggregate([
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ReturnClaimModel.countDocuments(),
    MessageModel.countDocuments(),
    SalesOrderModel.find(salesMatch)
      .sort({ orderDate: -1 })
      .limit(100)
      .select("salesmanName orderBookerName totalAmount status podUrl proofOfDeliveryImageUrl orderDate deliveredAt territoryName customerName")
      .lean(),
    SalesOrderModel.aggregate([
      {
        $match: {
          ...salesMatch,
          status: { $in: ["pending", "approved", "dispatched"] },
          orderDate: { $lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
        },
      },
      { $project: { orderNo: 1, customerName: 1, status: 1, orderDate: 1, territoryName: 1, totalAmount: 1 } },
      { $limit: 8 },
    ]),
    UserModel.countDocuments({ role: { $regex: /supplier/i }, ...(userMatch || {}) }),
  ]);

  const orderSummaryDoc = orderSummary[0] || {};
  const expenseSummaryDoc = expenseSummary[0] || {};
  const receiptSummaryDoc = receiptSummary[0] || {};
  const primarySummaryDoc = primaryPaymentSummary[0] || {};
  const secondarySummaryDoc = secondaryPaymentSummary[0] || {};
  const vehicleTripsDoc = vehicleTrips[0] || {};

  const revenue = safeNumber(orderSummaryDoc.revenue);
  const orders = safeNumber(orderSummaryDoc.orders);
  const delivered = safeNumber(orderSummaryDoc.delivered);
  const pending = safeNumber(orderSummaryDoc.pending);
  const dispatched = safeNumber(orderSummaryDoc.dispatched);
  const rejected = safeNumber(orderSummaryDoc.rejected);
  const podMissing = safeNumber(orderSummaryDoc.missingPod);
  const podUploaded = safeNumber(orderSummaryDoc.podUploaded);
  const totalExpenses = safeNumber(expenseSummaryDoc.total);
  const approvedExpenses = safeNumber(expenseSummaryDoc.approved);
  const totalReceipts = safeNumber(receiptSummaryDoc.total);
  const approvedReceipts = safeNumber(receiptSummaryDoc.approved);
  const outstanding = safeNumber(primarySummaryDoc.outstanding);
  const recoveryRate = primarySummaryDoc.total ? Math.round(((safeNumber(primarySummaryDoc.total) - outstanding) / safeNumber(primarySummaryDoc.total)) * 100) : 0;
  const onTimeDeliveryRate = pct(delivered, orders || 1);
  const totalOnHand = warehouseMovements.reduce((sum, row) => sum + safeNumber(row.inQty) - safeNumber(row.outQty), 0);

  const kpis = [
    {
      label: scope.distributorScope ? "Distributor revenue" : "Gross revenue",
      value: revenue,
      displayValue: formatCurrency(revenue),
      helper: `${orders} total orders`,
      accent: "violet",
      delta: `${delivered} delivered`,
    },
    {
      label: "Outstanding",
      value: outstanding,
      displayValue: formatCurrency(outstanding),
      helper: `${primarySummaryDoc.open || 0} open balances`,
      accent: "rose",
      delta: `${recoveryRate}% recovered`,
    },
    {
      label: scope.distributorScope ? "Collections" : "Receipts booked",
      value: totalReceipts,
      displayValue: formatCurrency(totalReceipts),
      helper: `${approvedReceipts ? formatCurrency(approvedReceipts) : "No approved receipts yet"}`,
      accent: "emerald",
      delta: `${receiptSummaryDoc.count || 0} receipts`,
    },
    {
      label: scope.distributorScope ? "Team activity" : "People & operations",
      value: activeUsers,
      displayValue: String(activeUsers),
      helper: `${supplierCount} suppliers • ${activeCustomers} active customers`,
      accent: "sky",
      delta: `${vehicleCount} vehicles`,
    },
    {
      label: scope.distributorScope ? "Proof of delivery" : "Delivery health",
      value: podUploaded,
      displayValue: String(podUploaded),
      helper: `${podMissing} missing POD`,
      accent: "amber",
      delta: `${onTimeDeliveryRate}% fulfilment pace`,
    },
    {
      label: scope.distributorScope ? "Cash burn / spend" : "Expense control",
      value: totalExpenses,
      displayValue: formatCurrency(totalExpenses),
      helper: `${expenseSummaryDoc.pendingCount || 0} pending approvals`,
      accent: "fuchsia",
      delta: `${formatCurrency(approvedExpenses)} approved`,
    },
  ];

  const insights = [
    revenue
      ? `${scope.distributorScope ? "Distributor sales" : "Sales execution"} generated ${formatCurrency(revenue)} across ${orders} orders.`
      : "No sales orders have been booked yet for the current reporting scope.",
    outstanding
      ? `${formatCurrency(outstanding)} is still outstanding and needs recovery follow-up.`
      : "Outstanding balances are currently under control.",
    lowStockItems.length
      ? `${lowStockItems.length} products are already at or below minimum stock threshold.`
      : scope.distributorScope
        ? "Inventory is being hidden at distributor level to avoid exposing warehouse-wide stock data."
        : "No critical low-stock items were detected in the sampled inventory report.",
    deliveryExceptions.length
      ? `${deliveryExceptions.length} orders are ageing beyond the 48-hour dispatch/delivery attention window.`
      : "No aged operational order bottlenecks were detected in the current queue.",
  ];

  const salesTrend = monthlySales.map((row) => ({
    label: monthLabel(new Date(row._id.year, row._id.month - 1, 1)),
    revenue: safeNumber(row.amount),
    orders: safeNumber(row.orders),
  }));

  const statusBreakdown = orderStatus.map((row) => ({
    label: String(row._id || "unknown").replace(/\b\w/g, (char) => char.toUpperCase()),
    value: safeNumber(row.count),
    amount: safeNumber(row.amount),
  }));

  const financeMix = expenseCategories.map((row) => ({
    label: row._id,
    value: safeNumber(row.total),
    count: safeNumber(row.count),
  }));

  const receiptMix = receiptStatus.map((row) => ({
    label: String(row._id || "unknown").replace(/\b\w/g, (char) => char.toUpperCase()),
    value: safeNumber(row.amount),
    count: safeNumber(row.count),
  }));

  const warehouseHealth = warehouseMovements.map((row) => {
    const onHand = safeNumber(row.inQty) - safeNumber(row.outQty);
    return {
      name: row._id,
      onHand,
      inQty: safeNumber(row.inQty),
      outQty: safeNumber(row.outQty),
      adjusted: safeNumber(row.adjusted),
      health: onHand > 0 ? "stable" : "watch",
      lastMovementAt: formatMaybeDate(row.lastMovementAt),
    };
  });

  const teamMap = new Map();
  recentOrders.forEach((order) => {
    const entries = [
      { name: order.salesmanName, role: "Salesman" },
      { name: order.orderBookerName, role: "Order Booker" },
    ];
    entries.forEach((entry) => {
      const name = String(entry.name || "").trim();
      if (!name) return;
      const current = teamMap.get(`${entry.role}:${name}`) || {
        name,
        role: entry.role,
        orders: 0,
        revenue: 0,
        delivered: 0,
        podUploaded: 0,
      };
      current.orders += 1;
      current.revenue += safeNumber(order.totalAmount);
      current.delivered += order.status === "delivered" ? 1 : 0;
      current.podUploaded += order.podUrl || order.proofOfDeliveryImageUrl ? 1 : 0;
      teamMap.set(`${entry.role}:${name}`, current);
    });
  });
  const teamPerformance = [...teamMap.values()]
    .map((row) => ({
      ...row,
      podRate: row.delivered ? pct(row.podUploaded, row.delivered) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
    .slice(0, 8);

  const distributorRows = scope.distributorScope
    ? []
    : await SalesOrderModel.aggregate([
        { $match: { distributorId: { $ne: null, $exists: true, $ne: "" } } },
        {
          $group: {
            _id: { $ifNull: ["$distributorId", "Unassigned"] },
            distributorName: { $last: { $ifNull: ["$fromEntityName", "Distributor"] } },
            territoryName: { $last: { $ifNull: ["$territoryName", "Unassigned"] } },
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
            lastOrderDate: { $max: "$orderDate" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]).catch(() => []);

  const alerts = [
    ...overduePayments.map((row) => ({
      title: `Overdue recovery • ${row.distributorName || row.invoiceNo || "Account"}`,
      severity: "critical",
      reason: `${formatCurrency(row.amountRemaining)} is overdue beyond return date.`,
      metric: formatMaybeDate(row.returnDate),
    })),
    ...deliveryExceptions.map((row) => ({
      title: `Operational ageing • ${row.orderNo || row.customerName || "Order"}`,
      severity: "warning",
      reason: `${row.status || "pending"} order needs immediate follow-up.`,
      metric: formatMaybeDate(row.orderDate),
    })),
    ...lowStockItems.slice(0, 4).map((row) => ({
      title: `Low stock • ${row.name || row.productId}`,
      severity: "warning",
      reason: `On hand ${safeNumber(row.onHand)} against minimum ${safeNumber(row.minStockLevel)}.`,
      metric: row.category || "Inventory",
    })),
  ].sort((a, b) => scoreSeverity(b.severity) - scoreSeverity(a.severity));

  const tables = {
    areaRows: areaPerformance.map((row) => ({
      territoryName: row._id.territory,
      regionName: row._id.region,
      orders: safeNumber(row.orders),
      revenue: safeNumber(row.revenue),
      delivered: safeNumber(row.delivered),
      deliveryRate: pct(row.delivered, row.orders),
    })),
    customerRows: topCustomers.map((row) => ({
      customerName: row._id,
      orders: safeNumber(row.orders),
      revenue: safeNumber(row.revenue),
      outstanding: safeNumber(row.outstanding),
      lastOrderDate: formatMaybeDate(row.lastOrderDate),
    })),
    productRows: topProducts.map((row) => ({
      productName: row._id,
      quantity: safeNumber(row.quantity),
      revenue: safeNumber(row.revenue),
    })),
    teamRows: teamPerformance,
    distributorRows: distributorRows.map((row) => ({
      distributorId: row._id,
      distributorName: row.distributorName || row._id,
      territoryName: row.territoryName || "Unassigned",
      orders: safeNumber(row.orders),
      revenue: safeNumber(row.revenue),
      delivered: safeNumber(row.delivered),
      lastOrderDate: formatMaybeDate(row.lastOrderDate),
    })),
    warehouseRows: warehouseHealth,
    alertRows: alerts,
    lowStockRows: lowStockItems.map((row) => ({
      productId: row.productId,
      name: row.name,
      category: row.category,
      onHand: safeNumber(row.onHand),
      minStockLevel: safeNumber(row.minStockLevel),
    })),
  };

  const legacyMetrics = {
    totalSalesOrders: orders,
    totalSalesQuantity: topProducts.reduce((sum, row) => sum + safeNumber(row.quantity), 0),
    totalExpenses,
    pendingExpenses: safeNumber(expenseSummaryDoc.pendingCount),
    totalUsers: userRoleCounts.reduce((sum, row) => sum + safeNumber(row.count), 0),
    activeUsers,
    totalProducts: productCount,
    totalWarehouses: warehouseCount,
    expenseCategories: financeMix.length,
    userRoles: userRoleCounts.length,
    salesRegions: compact(areaPerformance.map((row) => row._id.region)).length,
    transferStatuses: transferStatus.length,
  };

  return {
    ok: true,
    generatedAt: now.toISOString(),
    context: {
      role: req.user?.role || "User",
      companyId: req.user?.companyId || "",
      companyName: req.user?.companyName || "",
      scope: scope.distributorScope ? "distributor" : isSystemLevelAdmin(req.user?.role) ? "system-admin" : "company",
    },
    metrics: legacyMetrics,
    dashboard: {
      hero: {
        title: scope.distributorScope ? "Distributor performance intelligence" : "Enterprise reporting command center",
        subtitle: scope.distributorScope
          ? "Track recovery, sales momentum, team productivity, and risk signals inside your operating territory."
          : "Monitor revenue, fulfilment, recovery, inventory risk, and team execution from one premium control surface.",
      },
      headline: {
        revenue,
        orders,
        outstanding,
        totalReceipts,
        totalExpenses,
        totalOnHand,
        lowStockCount: lowStockItems.length,
        activeUsers,
        activeCustomers,
        activeDistributors,
        supplierCount,
        podMissing,
        onTimeDeliveryRate,
        overdueRecoveryCount: overduePayments.length,
        returnClaimsCount,
        messagesCount: messageCount,
        transferStatus,
        tripsDistance: safeNumber(vehicleTripsDoc.distance),
        tripsCount: safeNumber(vehicleTripsDoc.trips),
        secondaryPaidBack: safeNumber(secondarySummaryDoc.paidBack),
        vehicleCount,
      },
      kpis,
      insights,
      sections: {
        salesTrend,
        statusBreakdown,
        financeMix,
        receiptMix,
        warehouseHealth,
        roleMix: userRoleCounts.map((row) => ({ label: row._id, value: safeNumber(row.count) })),
      },
      tables,
    },
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load reports overview" });
  }
});

router.get("/builder", requireAuth, async (req, res) => {
  try {
    const overview = await buildOverviewPayload(req);
    const headline = overview.dashboard?.headline || {};
    const rows = [
      {
        id: "executive-overview",
        title: "Executive overview board",
        owner: overview.context?.scope === "distributor" ? "Distributor" : "Management",
        cadence: "Live",
        lastRunAt: overview.generatedAt,
        recordCount: safeNumber(headline.orders),
        status: headline.overdueRecoveryCount || headline.podMissing ? "Needs review" : "Ready",
      },
      {
        id: "recovery-watchlist",
        title: "Recovery and outstanding watchlist",
        owner: "Finance",
        cadence: "Daily",
        lastRunAt: overview.generatedAt,
        recordCount: safeNumber(headline.overdueRecoveryCount) + safeNumber(headline.activeCustomers),
        status: headline.outstanding ? "Needs review" : "Ready",
      },
      {
        id: "inventory-risk",
        title: "Inventory risk and replenishment monitor",
        owner: "Supply chain",
        cadence: "Daily",
        lastRunAt: overview.generatedAt,
        recordCount: safeNumber(headline.lowStockCount),
        status: headline.lowStockCount ? "Needs review" : "Ready",
      },
      {
        id: "team-productivity",
        title: "Team productivity and service quality",
        owner: "Operations",
        cadence: "Weekly",
        lastRunAt: overview.generatedAt,
        recordCount: safeNumber(headline.activeUsers),
        status: headline.podMissing ? "Needs review" : "Ready",
      },
    ];

    return res.json({ ok: true, generatedAt: overview.generatedAt, rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load report builder data" });
  }
});

router.get("/sales", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({
      ok: true,
      regions: payload.dashboard?.tables?.areaRows || [],
      trend: payload.dashboard?.sections?.salesTrend || [],
      products: payload.dashboard?.tables?.productRows || [],
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load sales report" });
  }
});

router.get("/inventory", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({
      ok: true,
      totalProducts: payload.metrics?.totalProducts || 0,
      warehouses: payload.dashboard?.tables?.warehouseRows || [],
      lowStockItems: payload.dashboard?.tables?.lowStockRows || [],
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load inventory report" });
  }
});

router.get("/finance", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({
      ok: true,
      totals: {
        totalExpenses: payload.dashboard?.headline?.totalExpenses || 0,
        totalReceipts: payload.dashboard?.headline?.totalReceipts || 0,
        outstanding: payload.dashboard?.headline?.outstanding || 0,
        secondaryPaidBack: payload.dashboard?.headline?.secondaryPaidBack || 0,
      },
      expensesByCategory: payload.dashboard?.sections?.financeMix || [],
      receiptsByStatus: payload.dashboard?.sections?.receiptMix || [],
      overdue: payload.dashboard?.tables?.alertRows?.filter((row) => row.title?.includes("Overdue")) || [],
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load finance report" });
  }
});

router.get("/hr", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({
      ok: true,
      totalUsers: payload.metrics?.totalUsers || 0,
      roleCounts: payload.dashboard?.sections?.roleMix || [],
      topTeam: payload.dashboard?.tables?.teamRows || [],
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load HR report" });
  }
});

router.get("/logistics", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({
      ok: true,
      vehicleCount: payload.dashboard?.headline?.vehicleCount || 0,
      transferCounts: payload.dashboard?.headline?.transferStatus || [],
      delayedOrders: payload.dashboard?.tables?.alertRows?.filter((row) => row.title?.includes("Operational ageing")) || [],
      podMissing: payload.dashboard?.headline?.podMissing || 0,
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load logistics report" });
  }
});

router.get("/compliance", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({
      ok: true,
      adjustmentCount: 0,
      returnCount: payload.dashboard?.headline?.returnClaimsCount || 0,
      messageCount: payload.dashboard?.headline?.messagesCount || 0,
      missingPod: payload.dashboard?.headline?.podMissing || 0,
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load compliance report" });
  }
});

router.get("/distributors", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({ ok: true, distributors: payload.dashboard?.tables?.distributorRows || [] });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load distributor report" });
  }
});

router.get("/exceptions", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({ ok: true, alerts: payload.dashboard?.tables?.alertRows || [] });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load exception report" });
  }
});

router.get("/team-performance", requireAuth, async (req, res) => {
  try {
    const payload = await buildOverviewPayload(req);
    return res.json({ ok: true, rows: payload.dashboard?.tables?.teamRows || [] });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load team performance report" });
  }
});

router.get("/procurement", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, UserModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    const [supplierTotal, supplierActive, purchaseAgg, recentPurchases, trendAgg] = await Promise.all([
      UserModel.countDocuments({ role: { $regex: /supplier/i } }),
      UserModel.countDocuments({ role: { $regex: /supplier/i }, status: "active" }),
      InventoryMovementModel.aggregate([
        { $match: { movementType: "PURCHASE_IN" } },
        { $group: { _id: null, count: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
      ]),
      InventoryMovementModel.find({ movementType: "PURCHASE_IN" })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      InventoryMovementModel.aggregate([
        { $match: { movementType: "PURCHASE_IN", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              y: { $year: "$createdAt" },
              m: { $month: "$createdAt" },
              d: { $dayOfMonth: "$createdAt" },
            },
            quantity: { $sum: "$quantity" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
      ]),
    ]);

    return res.json({
      ok: true,
      totals: {
        suppliers: supplierTotal,
        activeSuppliers: supplierActive,
        purchaseCount: purchaseAgg[0]?.count || 0,
        purchaseQuantity: purchaseAgg[0]?.quantity || 0,
      },
      recentPurchases,
      trend: trendAgg.map((row) => ({ label: `${row._id.d}/${row._id.m}`, quantity: row.quantity, count: row.count })),
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load procurement report" });
  }
});

module.exports = router;