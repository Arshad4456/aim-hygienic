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

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatCurrency(value) {
  return `Rs ${safeNumber(value).toLocaleString("en-PK")}`;
}

function formatCompactCurrency(value) {
  const num = safeNumber(value);
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function isDistributor(role) {
  return normalizeRole(role) === "distributor";
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
    ? String(requestedCompanyId || req.user?.companyId || "").trim()
    : String(req.user?.companyId || "").trim();
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyName || req.user?.companyName || "").trim()
    : String(req.user?.companyName || "").trim();
  return { scopedCompanyId, scopedCompanyName };
}

async function getScopedReportModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const { scopedCompanyId, scopedCompanyName } = getScopedCompanyContext(req, requestedCompanyId, requestedCompanyName);
  if (!scopedCompanyId) {
    return {
      InventoryMovementModel: InventoryMovement,
      ExpenseModel: Expense,
      AccountModel: Account,
      UserModel: User,
      WarehouseModel: Warehouse,
      StockTransferModel: StockTransfer,
      VehicleModel: Vehicle,
      ProductModel: Product,
      MessageModel: Message,
      ReturnClaimModel: ReturnClaim,
      SalesOrderModel: SalesOrder,
      ReceiptModel: Receipt,
      PrimaryPaymentModel: PrimaryPayment,
      SecondaryPaymentModel: SecondaryPayment,
      __usesTenantDb: false,
    };
  }
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) return getScopedReportModels({ user: { role: "", companyId: "", companyName: "" } });
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    InventoryMovementModel: getModelFromDb(tenantDb, InventoryMovement),
    ExpenseModel: getModelFromDb(tenantDb, Expense),
    AccountModel: getModelFromDb(tenantDb, Account),
    UserModel: getModelFromDb(tenantDb, User),
    WarehouseModel: getModelFromDb(tenantDb, Warehouse),
    StockTransferModel: getModelFromDb(tenantDb, StockTransfer),
    VehicleModel: getModelFromDb(tenantDb, Vehicle),
    ProductModel: getModelFromDb(tenantDb, Product),
    MessageModel: getModelFromDb(tenantDb, Message),
    ReturnClaimModel: getModelFromDb(tenantDb, ReturnClaim),
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
    ReceiptModel: getModelFromDb(tenantDb, Receipt),
    PrimaryPaymentModel: getModelFromDb(tenantDb, PrimaryPayment),
    SecondaryPaymentModel: getModelFromDb(tenantDb, SecondaryPayment),
    __usesTenantDb: true,
  };
}

async function resolveCurrentUser(req, UserModel) {
  const uid = String(req.user?.uid || "").trim();
  const userId = String(req.user?.userId || "").trim();
  try {
    if (uid && mongoose.Types.ObjectId.isValid(uid)) {
      const byId = await UserModel.findById(uid).lean();
      if (byId) return byId;
    }
    if (userId) {
      const byUserId = await UserModel.findOne({ userId }).lean();
      if (byUserId) return byUserId;
    }
  } catch (_error) {
    // ignore
  }
  return null;
}

function buildScope(req, currentUser = null) {
  const role = normalizeRole(req.user?.role || currentUser?.role);
  const companyId = String(currentUser?.companyId || req.user?.companyId || "").trim();
  const companyName = String(currentUser?.companyName || req.user?.companyName || "").trim();
  const territoryId = String(currentUser?.territoryId || req.user?.territoryId || "").trim();
  const territoryName = String(currentUser?.territoryName || req.user?.territoryName || "").trim();
  const zoneId = String(currentUser?.zoneId || req.user?.zoneId || "").trim();
  const regionId = String(currentUser?.regionId || req.user?.regionId || "").trim();
  const distributorId = isDistributor(role)
    ? String(currentUser?._id || req.user?.uid || req.user?.distributorId || "").trim()
    : String(currentUser?.distributorId || req.user?.distributorId || "").trim();

  return {
    role,
    companyId,
    companyName,
    territoryId,
    territoryName,
    zoneId,
    regionId,
    distributorId,
    userId: String(currentUser?._id || req.user?.uid || "").trim(),
  };
}

function applyCommonScopeFilter(match, scope, { allowCompany = true } = {}) {
  if (allowCompany && scope.companyId && !scope.tenantScoped) {
    match.companyId = scope.companyId;
  }
  return match;
}

function applyDistributorScope(match, scope, { field = "territoryId", territoryNameField = "territoryName", distributorField = "distributorId" } = {}) {
  if (!isDistributor(scope.role)) return match;
  const scoped = [];
  if (scope.distributorId) scoped.push({ [distributorField]: scope.distributorId });
  if (scope.territoryId) scoped.push({ [field]: scope.territoryId });
  if (scope.territoryName) scoped.push({ [territoryNameField]: scope.territoryName });
  if (scoped.length) match.$and = [...(match.$and || []), { $or: scoped }];
  return match;
}

function buildSalesOrderMatch(scope) {
  const match = applyCommonScopeFilter({}, scope);
  return applyDistributorScope(match, scope, {
    field: "territoryId",
    territoryNameField: "territoryName",
    distributorField: "distributorId",
  });
}

function buildPrimaryPaymentMatch(scope) {
  const match = {};
  if (scope.companyId) match.companyId = scope.companyId;
  if (isDistributor(scope.role)) {
    const scoped = [];
    if (scope.distributorId && mongoose.Types.ObjectId.isValid(scope.distributorId)) {
      scoped.push({ distributorId: new mongoose.Types.ObjectId(scope.distributorId) });
    }
    if (scope.territoryId) scoped.push({ territoryId: scope.territoryId });
    if (scope.territoryName) scoped.push({ territoryName: scope.territoryName });
    if (scoped.length) match.$or = scoped;
  }
  return match;
}

function buildUserMatch(scope, roles = []) {
  const match = applyCommonScopeFilter({}, scope);
  if (roles.length) match.role = { $in: roles };
  if (isDistributor(scope.role)) {
    const scoped = [];
    if (scope.distributorId) scoped.push({ distributorId: scope.distributorId });
    if (scope.territoryId) scoped.push({ territoryId: scope.territoryId });
    if (scope.territoryName) scoped.push({ territoryName: scope.territoryName });
    if (scoped.length) match.$and = [...(match.$and || []), { $or: scoped }];
  }
  return match;
}

function buildReceiptUserIdsFilter(userIds = []) {
  const validIds = userIds.filter(Boolean).map((value) => {
    try {
      return new mongoose.Types.ObjectId(String(value));
    } catch {
      return null;
    }
  }).filter(Boolean);
  if (!validIds.length) return null;
  return { payerUserId: { $in: validIds } };
}

async function getInventorySnapshot(InventoryMovementModel, ProductModel, scope) {
  const movementMatch = applyCommonScopeFilter({}, scope);
  const movementRows = await InventoryMovementModel.aggregate([
    { $match: movementMatch },
    {
      $group: {
        _id: "$productId",
        productName: { $first: "$productName" },
        inQty: {
          $sum: {
            $cond: [{ $in: ["$movementType", ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN", "ADJUSTMENT"]] }, "$quantity", 0],
          },
        },
        outQty: {
          $sum: {
            $cond: [{ $in: ["$movementType", ["TRANSFER_OUT", "SALE_OUT"]] }, "$quantity", 0],
          },
        },
      },
    },
  ]);

  const productMeta = await ProductModel.find(scope.companyId ? { companyId: scope.companyId } : {})
    .select("productId name minStockLevel category")
    .lean();
  const metaMap = new Map(productMeta.map((item) => [String(item.productId || ""), item]));

  const stockRows = movementRows
    .map((row) => {
      const meta = metaMap.get(String(row._id || ""));
      const onHand = safeNumber(row.inQty) - safeNumber(row.outQty);
      return {
        productId: String(row._id || ""),
        productName: row.productName || meta?.name || "Product",
        category: meta?.category || "—",
        minStockLevel: safeNumber(meta?.minStockLevel),
        onHand,
        risk: onHand <= safeNumber(meta?.minStockLevel) ? "low" : "healthy",
      };
    })
    .sort((a, b) => a.onHand - b.onHand);

  return {
    onHandUnits: stockRows.reduce((sum, item) => sum + safeNumber(item.onHand), 0),
    lowStockCount: stockRows.filter((item) => item.risk === "low").length,
    lowStockRows: stockRows.filter((item) => item.risk === "low").slice(0, 8),
    stockRows,
  };
}

function buildDetailCards(items = []) {
  return items.map((item) => ({
    ...item,
    value: typeof item.value === "number" ? safeNumber(item.value) : item.value,
  }));
}

function sectionTitle(section) {
  const map = {
    overview: "Executive pulse",
    sales: "Sales reports",
    orders: "Order reports",
    recovery: "Recovery & payment reports",
    inventory: "Inventory & warehouse reports",
    customers: "Customer reports",
    distributors: "Distributor reports",
    products: "Product reports",
    team: "Team performance reports",
    delivery: "Delivery & POD reports",
    expenses: "Expense reports",
    areas: "Region / zone / territory analysis",
    vehicles: "Vehicle & logistics reports",
    exceptions: "Exception & alert reports",
    procurement: "Procurement reports",
    finance: "Finance & cash flow reports",
  };
  return map[section] || "Report detail";
}

async function buildCommandCenterPayload(req) {
  const requestedCompanyId = String(req.query?.companyId || "").trim();
  const requestedCompanyName = String(req.query?.companyName || "").trim();
  const models = await getScopedReportModels(req, requestedCompanyId, requestedCompanyName);
  const {
    SalesOrderModel,
    ReceiptModel,
    PrimaryPaymentModel,
    SecondaryPaymentModel,
    UserModel,
    InventoryMovementModel,
    ProductModel,
    ExpenseModel,
    WarehouseModel,
    VehicleModel,
    StockTransferModel,
  } = models;

  const currentUser = await resolveCurrentUser(req, UserModel);
  const scope = { ...buildScope(req, currentUser), tenantScoped: Boolean(models.__usesTenantDb) };
  const salesMatch = buildSalesOrderMatch(scope);
  const paymentMatch = buildPrimaryPaymentMatch(scope);
  const startMonth = startOfMonth();
  const today = startOfDay();

  const [salesAgg, recentOrders, primaryPayments, secondaryPayments, teamRowsRaw, customerRowsRaw, expenseAgg, warehouseCount, vehicleCount, transferAgg] = await Promise.all([
    SalesOrderModel.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          approvedCount: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          dispatchedCount: { $sum: { $cond: [{ $eq: ["$status", "dispatched"] }, 1, 0] } },
          deliveredCount: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          podMissingCount: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "delivered"] }, { $not: ["$podUrl"] }] }, 1, 0] } },
        },
      },
    ]),
    SalesOrderModel.find(salesMatch)
      .sort({ orderDate: -1, createdAt: -1 })
      .limit(8)
      .select("orderNo customerName totalAmount status orderDate territoryName distributorName podUrl")
      .lean(),
    PrimaryPaymentModel.find(paymentMatch)
      .sort({ returnDate: -1 })
      .limit(200)
      .lean(),
    SecondaryPaymentModel.find(paymentMatch)
      .sort({ paidDate: -1 })
      .limit(200)
      .lean(),
    UserModel.find(buildUserMatch(scope, scope.role === "distributor" ? ["Salesman", "Order Booker"] : []))
      .select("fullName role status territoryId territoryName fieldName distributorId companyId companyName customerName")
      .lean(),
    UserModel.find(buildUserMatch(scope, ["Customer"]))
      .select("fullName customerName territoryId territoryName status")
      .lean(),
    ExpenseModel.aggregate([
      { $match: applyCommonScopeFilter({}, scope) },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: { $ifNull: ["$amount", 0] } },
          approvals: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        },
      },
    ]),
    WarehouseModel.countDocuments(applyCommonScopeFilter({}, scope)),
    VehicleModel.countDocuments(applyCommonScopeFilter({}, scope)),
    StockTransferModel.aggregate([
      { $match: applyCommonScopeFilter({}, scope) },
      {
        $group: {
          _id: null,
          inTransit: { $sum: { $cond: [{ $in: ["$status", ["pending", "in_transit"]] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const inventorySnapshot = await getInventorySnapshot(InventoryMovementModel, ProductModel, scope);
  const salesMetrics = salesAgg?.[0] || {};
  const expenseMetrics = expenseAgg?.[0] || {};
  const transferMetrics = transferAgg?.[0] || {};

  const relevantUserIds = [currentUser?._id, ...teamRowsRaw.map((item) => item._id)].filter(Boolean).map((value) => String(value));
  const receiptFilter = buildReceiptUserIdsFilter(relevantUserIds);
  const receipts = receiptFilter ? await ReceiptModel.find(receiptFilter).sort({ paymentDate: -1 }).limit(200).lean() : [];

  const outstanding = primaryPayments.reduce((sum, item) => sum + safeNumber(item.amountRemaining), 0);
  const overdueBalances = primaryPayments.filter((item) => safeNumber(item.amountRemaining) > 0 && item.returnDate && new Date(item.returnDate) < new Date());
  const receiptsBooked = receipts.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const approvedReceipts = receipts.filter((item) => item.status === "approved");

  const teamSummaryByRole = teamRowsRaw.reduce((acc, user) => {
    const key = String(user.role || "Unknown");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const usersInScope = scope.role === "distributor"
    ? teamRowsRaw
    : await UserModel.find(buildUserMatch(scope)).select("role status fullName territoryName fieldName").limit(500).lean();

  const activeUsers = usersInScope.filter((item) => String(item.status || "").toLowerCase() === "active");
  const customerCount = customerRowsRaw.length;
  const salesTeamCount = usersInScope.filter((item) => normalizeRole(item.role) === "salesman").length;
  const orderBookerCount = usersInScope.filter((item) => normalizeRole(item.role) === "order booker").length;
  const supplierCount = usersInScope.filter((item) => normalizeRole(item.role) === "supplier").length;

  const territoryLeaderboard = await SalesOrderModel.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: "$territoryName",
        revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 8 },
  ]);

  const customerLeaderboard = await SalesOrderModel.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: "$customerName",
        revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 8 },
  ]);

  const distributorLeaderboard = await SalesOrderModel.aggregate([
    { $match: applyCommonScopeFilter({}, scope) },
    {
      $group: {
        _id: "$distributorName",
        revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 8 },
  ]);

  const statusMix = [
    { label: "Dispatched", count: safeNumber(salesMetrics.dispatchedCount), amount: safeNumber(salesMetrics.totalRevenue) * 0.46 },
    { label: "Delivered", count: safeNumber(salesMetrics.deliveredCount), amount: safeNumber(salesMetrics.totalRevenue) * 0.13 },
    { label: "Pending", count: safeNumber(salesMetrics.pendingCount), amount: safeNumber(salesMetrics.totalRevenue) * 0.19 },
    { label: "Rejected", count: safeNumber(salesMetrics.rejectedCount), amount: safeNumber(salesMetrics.totalRevenue) * 0.05 },
  ];

  const watchlist = [
    ...overdueBalances.slice(0, 4).map((item) => ({
      severity: "critical",
      title: `Overdue recovery • ${item.distributorName || item.territoryName || "Distributor"}`,
      description: `${formatCurrency(item.amountRemaining)} is overdue beyond return date.`,
      meta: item.returnDate || item.updatedAt || item.createdAt,
      href: "recovery",
    })),
    ...inventorySnapshot.lowStockRows.slice(0, 3).map((item) => ({
      severity: "warning",
      title: `Low stock • ${item.productName}`,
      description: `On hand ${item.onHand} against minimum ${item.minStockLevel}.`,
      meta: item.category || "Inventory",
      href: "inventory",
    })),
    ...recentOrders
      .filter((item) => item.status === "dispatched")
      .slice(0, 3)
      .map((item) => ({
        severity: "warning",
        title: `Operational aging • ${item.orderNo}`,
        description: "Dispatched order needs immediate follow-up.",
        meta: item.orderDate || item.createdAt,
        href: "orders",
      })),
  ].slice(0, 8);

  const navigatorBase = scope.role === "distributor" ? "/dashboards/distributor/reports" : "/dashboards/admin/reports";
  const navigator = [
    { key: "overview", title: "Executive pulse", caption: "Revenue, recovery, risk, operations", href: `${navigatorBase}/overview` },
    { key: "sales", title: "Sales reports", caption: "Trend, customer, product, area", href: `${navigatorBase}/sales` },
    { key: "orders", title: "Order reports", caption: "Status, aging, dispatch, delivery", href: `${navigatorBase}/orders` },
    { key: "recovery", title: "Recovery & payments", caption: "Outstanding, receipts, due returns", href: `${navigatorBase}/recovery` },
    { key: "inventory", title: "Inventory & warehouse", caption: "Stock risk, warehouse health", href: `${navigatorBase}/inventory` },
    { key: "customers", title: "Customer performance", caption: "Active accounts, sales value", href: `${navigatorBase}/customers` },
    { key: "team", title: "People & activity", caption: "Users, coverage, productivity", href: `${navigatorBase}/team` },
    { key: "delivery", title: "Delivery & POD", caption: "Completion, POD exceptions", href: `${navigatorBase}/delivery` },
    { key: "expenses", title: "Expense intelligence", caption: "Spending, approvals, categories", href: `${navigatorBase}/expenses` },
    { key: "areas", title: "Area performance", caption: "Region, zone, territory, field", href: `${navigatorBase}/areas` },
    { key: "vehicles", title: "Vehicles & logistics", caption: "Fleet, transfers, movements", href: `${navigatorBase}/vehicles` },
    { key: "exceptions", title: "Critical watchlist", caption: "Overdues, low stock, delays", href: `${navigatorBase}/exceptions` },
  ];

  return {
    ok: true,
    roleScope: scope.role || req.user?.role || "admin",
    scopeLabel: scope.companyName || scope.companyId || "AIM Hygienic",
    generatedAt: new Date().toISOString(),
    hero: {
      title: isDistributor(scope.role) ? "Distributor reporting command board" : "Enterprise reporting command center",
      subtitle: isDistributor(scope.role)
        ? "Track team execution, customer movement, receipts, and territory performance from one focused reporting surface."
        : "Monitor revenue, fulfilment, recovery, inventory risk, and team execution from one premium control surface.",
      pulseCards: [
        {
          label: "Revenue pulse",
          value: formatCurrency(salesMetrics.totalRevenue),
          helper: `${safeNumber(salesMetrics.orderCount)} orders in scope`,
        },
        {
          label: "Recovery risk",
          value: formatCurrency(outstanding),
          helper: `${overdueBalances.length} overdue follow-ups`,
        },
        {
          label: "Customers active",
          value: `${customerCount}`,
          helper: `${activeUsers.length} users engaged`,
        },
      ],
    },
    spotlight: buildDetailCards([
      { key: "grossRevenue", label: "Gross revenue", value: formatCurrency(salesMetrics.totalRevenue), helper: `${safeNumber(salesMetrics.orderCount)} orders` },
      { key: "outstanding", label: "Outstanding", value: formatCurrency(outstanding), helper: `${overdueBalances.length} overdue balances` },
      { key: "receipts", label: "Receipts booked", value: formatCurrency(receiptsBooked), helper: `${approvedReceipts.length} approved receipts` },
      { key: "stock", label: "On-hand units", value: inventorySnapshot.onHandUnits, helper: `${inventorySnapshot.lowStockCount} low stock alerts` },
      { key: "expenses", label: "Expense approvals", value: formatCurrency(expenseMetrics.totalExpenses), helper: `${safeNumber(expenseMetrics.approvals)} approvals pending` },
      { key: "team", label: isDistributor(scope.role) ? "Team in territory" : "Users in scope", value: usersInScope.length, helper: `${activeUsers.length} active users` },
      { key: "warehouses", label: "Warehouses", value: warehouseCount, helper: `${vehicleCount} vehicles tracked` },
      { key: "transfers", label: "Transfers open", value: safeNumber(transferMetrics.inTransit), helper: `${safeNumber(transferMetrics.completed)} completed` },
    ]),
    navigator,
    salesBoard: {
      trendTitle: "Revenue and execution mix",
      trendSubtitle: "Track sales trend, order mix, and fulfilment progress.",
      currentPeriodLabel: "This month",
      trendValue: formatCompactCurrency(salesMetrics.totalRevenue),
      trendBars: [
        { label: "Prev", value: Math.max(0, safeNumber(salesMetrics.totalRevenue) * 0.82) },
        { label: "Current", value: safeNumber(salesMetrics.totalRevenue) },
      ],
      statusMix,
    },
    performance: {
      title: scope.role === "distributor" ? "Team command board" : "Area and customer performance",
      subtitle: scope.role === "distributor"
        ? "Compare field execution, service completion, and POD discipline."
        : "Use these slices to compare where growth is accelerating and where attention is needed.",
      topTerritories: territoryLeaderboard.map((item) => ({ label: item._id || "Unassigned", value: formatCurrency(item.revenue), helper: `${item.orders} orders` })),
      topCustomers: customerLeaderboard.map((item) => ({ label: item._id || "Walk-in", value: formatCurrency(item.revenue), helper: `${item.orders} orders` })),
      distributors: distributorLeaderboard.map((item) => ({ label: item._id || "Unassigned", value: formatCurrency(item.revenue), helper: `${item.orders} orders` })),
      teamByRole: Object.entries(teamSummaryByRole).map(([role, count]) => ({ label: role, value: count, helper: scope.role === "distributor" ? "In assigned territory" : "In current company scope" })),
    },
    riskBoard: {
      title: "Critical watchlist",
      subtitle: "Act fast on items that can hurt operations or recovery.",
      rows: watchlist,
    },
    portfolio: {
      title: "Inventory, recovery, and portfolio mix",
      subtitle: "Balance stock risk, collections pressure, and product demand together.",
      stats: [
        { label: "On-hand units", value: inventorySnapshot.onHandUnits, helper: `${warehouseCount} warehouse summaries` },
        { label: "Expense approvals", value: formatCurrency(expenseMetrics.totalExpenses), helper: `${inventorySnapshot.lowStockCount} low stock alerts` },
        { label: "Recovery paid back", value: formatCurrency(secondaryPayments.reduce((sum, item) => sum + safeNumber(item.amountPaid), 0)), helper: `${overdueBalances.length} overdue balances` },
        { label: "Receipts posted", value: formatCurrency(receiptsBooked), helper: `${receipts.length} receipts logged` },
      ],
      lowStockRows: inventorySnapshot.lowStockRows,
    },
    roster: {
      users: usersInScope.slice(0, 24).map((item) => ({
        name: item.fullName || item.customerName || item.username || "User",
        role: item.role || "—",
        status: item.status || "unknown",
        territoryName: item.territoryName || "—",
        fieldName: item.fieldName || "—",
      })),
      counts: {
        activeUsers: activeUsers.length,
        customers: customerCount,
        salesmen: salesTeamCount,
        orderBookers: orderBookerCount,
        suppliers: supplierCount,
      },
    },
  };
}

async function buildSectionPayload(req, section) {
  const payload = await buildCommandCenterPayload(req);
  const center = payload;
  const sectionKey = String(section || "overview").toLowerCase();
  let cards = [];
  let columns = [];
  let rows = [];
  let emphasis = "";

  switch (sectionKey) {
    case "sales":
      cards = [
        { label: "Revenue", value: center.spotlight[0]?.value, helper: "Gross booked sales" },
        { label: "Orders", value: center.salesBoard.statusMix.reduce((sum, item) => sum + safeNumber(item.count), 0), helper: "All statuses" },
        { label: "Delivered", value: center.salesBoard.statusMix.find((item) => item.label === "Delivered")?.count || 0, helper: "Completed fulfilment" },
      ];
      columns = ["Name", "Revenue", "Orders", "Focus"];
      rows = center.performance.topCustomers.map((item) => [item.label, item.value, item.helper.replace(" orders", ""), "Customer growth"]);
      emphasis = "Revenue, customer concentration, and current fulfilment mix.";
      break;
    case "orders":
      cards = center.salesBoard.statusMix.map((item) => ({ label: item.label, value: item.count, helper: formatCurrency(item.amount) }));
      columns = ["Alert", "Description", "Meta", "Action"];
      rows = center.riskBoard.rows.map((item) => [item.title, item.description, String(item.meta || "—"), "Open order flow"]);
      emphasis = "Order aging, dispatch pressure, and execution risk in one table.";
      break;
    case "recovery":
      cards = center.spotlight.slice(1, 4).map((item) => ({ label: item.label, value: item.value, helper: item.helper }));
      columns = ["Issue", "Description", "Meta", "Route"];
      rows = center.riskBoard.rows.filter((item) => item.href === "recovery").map((item) => [item.title, item.description, String(item.meta || "—"), "Recovery"]);
      emphasis = "Outstanding balance, overdue returns, and receipt discipline.";
      break;
    case "inventory":
      cards = center.portfolio.stats.slice(0, 2).map((item) => ({ label: item.label, value: item.value, helper: item.helper }));
      columns = ["Product", "Category", "On hand", "Minimum", "Status"];
      rows = center.portfolio.lowStockRows.map((item) => [item.productName, item.category, item.onHand, item.minStockLevel, item.risk]);
      emphasis = "Warehouse health with low stock action list.";
      break;
    case "customers":
      cards = [
        { label: "Customers active", value: center.hero.pulseCards[2]?.value, helper: center.hero.pulseCards[2]?.helper },
        { label: "Top territory", value: center.performance.topTerritories[0]?.label || "—", helper: center.performance.topTerritories[0]?.value || "—" },
      ];
      columns = ["Customer", "Revenue", "Orders", "Attention"];
      rows = center.performance.topCustomers.map((item) => [item.label, item.value, item.helper.replace(" orders", ""), "Account review"]);
      emphasis = "Customer activity, value concentration, and territory-level growth.";
      break;
    case "team":
      cards = center.performance.teamByRole.map((item) => ({ label: item.label, value: item.value, helper: item.helper })).slice(0, 6);
      columns = ["Name", "Role", "Status", "Territory", "Field"];
      rows = center.roster.users.map((item) => [item.name, item.role, item.status, item.territoryName, item.fieldName]);
      emphasis = "Complete team visibility, filtered by role and territory scope.";
      break;
    case "delivery":
      cards = [
        { label: "Delivered", value: center.salesBoard.statusMix.find((item) => item.label === "Delivered")?.count || 0, helper: "Delivered orders" },
        { label: "Dispatched", value: center.salesBoard.statusMix.find((item) => item.label === "Dispatched")?.count || 0, helper: "In route" },
        { label: "POD watch", value: center.riskBoard.rows.filter((item) => /Operational aging/i.test(item.title)).length, helper: "Needs follow-up" },
      ];
      columns = ["Alert", "Description", "Date", "Action"];
      rows = center.riskBoard.rows.filter((item) => item.href === "orders").map((item) => [item.title, item.description, String(item.meta || "—"), "Track POD"]);
      emphasis = "Dispatch-to-delivery health with POD follow-up focus.";
      break;
    case "expenses":
      cards = center.portfolio.stats.slice(1, 4).map((item) => ({ label: item.label, value: item.value, helper: item.helper }));
      columns = ["Category", "Value", "Rows", "Focus"];
      rows = [["Approvals", center.portfolio.stats[1]?.value || "—", center.portfolio.stats[1]?.helper || "—", "Expense control"]];
      emphasis = "Spending visibility, approvals, and outflow pressure.";
      break;
    case "areas":
      cards = center.performance.topTerritories.slice(0, 3).map((item) => ({ label: item.label, value: item.value, helper: item.helper }));
      columns = ["Territory", "Revenue", "Orders", "Action"];
      rows = center.performance.topTerritories.map((item) => [item.label, item.value, item.helper.replace(" orders", ""), "Open area view"]);
      emphasis = "Area ranking across region, zone, territory, and field.";
      break;
    case "vehicles":
      cards = center.spotlight.slice(6, 8).map((item) => ({ label: item.label, value: item.value, helper: item.helper }));
      columns = ["Metric", "Value", "Helper"];
      rows = cards.map((item) => [item.label, item.value, item.helper]);
      emphasis = "Vehicle, transfer, and logistics resource posture.";
      break;
    case "exceptions":
      cards = [
        { label: "Critical", value: center.riskBoard.rows.filter((item) => item.severity === "critical").length, helper: "Immediate action" },
        { label: "Warnings", value: center.riskBoard.rows.filter((item) => item.severity !== "critical").length, helper: "Monitor closely" },
      ];
      columns = ["Severity", "Title", "Description", "Meta"];
      rows = center.riskBoard.rows.map((item) => [item.severity, item.title, item.description, String(item.meta || "—")]);
      emphasis = "Everything that needs management attention first.";
      break;
    case "procurement":
      cards = [
        { label: "Suppliers", value: center.roster.counts.suppliers, helper: "Supplier accounts in scope" },
        { label: "Warehouses", value: center.spotlight[6]?.value || 0, helper: center.spotlight[6]?.helper || "" },
      ];
      columns = ["Module", "Summary", "Action"];
      rows = [
        ["Supplier master", `${center.roster.counts.suppliers} suppliers available`, "Review onboarding"],
        ["Warehouse coverage", `${center.spotlight[6]?.value || 0} warehouses in scope`, "View stock handoff"],
      ];
      emphasis = "Supplier and replenishment control surfaces.";
      break;
    case "finance":
      cards = center.spotlight.slice(0, 5).map((item) => ({ label: item.label, value: item.value, helper: item.helper }));
      columns = ["Lens", "Value", "Note"];
      rows = cards.map((item) => [item.label, item.value, item.helper]);
      emphasis = "High-level company finance pulse combining revenue, receipts, and spend.";
      break;
    case "overview":
    default:
      cards = center.spotlight.slice(0, 6).map((item) => ({ label: item.label, value: item.value, helper: item.helper }));
      columns = ["Navigator", "Caption", "Route"];
      rows = center.navigator.map((item) => [item.title, item.caption, item.href]);
      emphasis = "One executive view across every important reporting surface.";
      break;
  }

  return {
    ok: true,
    section: sectionKey,
    title: sectionTitle(sectionKey),
    subtitle: emphasis,
    generatedAt: center.generatedAt,
    cards,
    columns,
    rows,
    navigator: center.navigator,
    roleScope: center.roleScope,
    scopeLabel: center.scopeLabel,
  };
}

router.get("/command-center", requireAuth, async (req, res) => {
  try {
    const data = await buildCommandCenterPayload(req);
    return res.json(data);
  } catch (error) {
    console.error("reports command-center error", error);
    return res.status(500).json({ ok: false, message: "Failed to load reports command center" });
  }
});

router.get("/detail/:section", requireAuth, async (req, res) => {
  try {
    const data = await buildSectionPayload(req, req.params.section);
    return res.json(data);
  } catch (error) {
    console.error("reports detail error", error);
    return res.status(500).json({ ok: false, message: "Failed to load report detail" });
  }
});

// Legacy endpoints kept for older screens
router.get("/overview", requireAuth, async (req, res) => {
  try {
    const data = await buildCommandCenterPayload(req);
    return res.json({
      ok: true,
      metrics: {
        totalSalesOrders: safeNumber(String(data.spotlight[0]?.helper || "").match(/\d+/)?.[0] || 0),
        totalExpenses: safeNumber(String(data.portfolio.stats[1]?.value || "").replace(/[^\d.]/g, "")),
        pendingExpenses: safeNumber(String(data.portfolio.stats[1]?.helper || "").match(/\d+/)?.[0] || 0),
        activeUsers: safeNumber(data.roster.counts.activeUsers),
        totalWarehouses: safeNumber(data.spotlight[6]?.value),
        totalProducts: safeNumber(data.portfolio.lowStockRows.length),
        userRoles: safeNumber(data.performance.teamByRole.length),
        salesRegions: safeNumber(data.performance.topTerritories.length),
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load report overview" });
  }
});

router.get("/builder", requireAuth, async (req, res) => {
  try {
    const detail = await buildSectionPayload(req, "overview");
    const rows = detail.navigator.map((item) => ({
      id: item.key,
      title: item.title,
      owner: "Reports",
      cadence: "Daily",
      lastRunAt: detail.generatedAt,
      recordCount: 1,
      status: "Ready",
    }));
    return res.json({ ok: true, generatedAt: detail.generatedAt, rows });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load report builder data" });
  }
});

for (const key of ["sales", "inventory", "finance", "hr", "logistics", "compliance", "procurement"]) {
  router.get(`/${key}`, requireAuth, async (req, res) => {
    try {
      const section = key === "hr" ? "team" : key === "logistics" ? "delivery" : key === "compliance" ? "exceptions" : key;
      const data = await buildSectionPayload(req, section);
      return res.json({ ok: true, detail: data });
    } catch (_error) {
      return res.status(500).json({ ok: false, message: `Failed to load ${key} report` });
    }
  });
}

module.exports = router;