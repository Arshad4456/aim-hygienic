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
const WarehouseTransaction = require("../models/WarehouseTransaction");
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

function isAdminLike(role) {
  return ["admin", "system admin", "company admin"].includes(normalizeRole(role));
}

function isDistributorRole(role) {
  return normalizeRole(role) === "distributor";
}

function asIdList(...values) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function titleize(value) {
  return String(value || "Unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function companyQuery(req, requestedCompanyId = "", requestedCompanyName = "") {
  if (isSystemLevelAdmin(req.user?.role)) {
    const companyId = String(requestedCompanyId || "").trim();
    return companyId ? { companyId } : {};
  }
  const companyId = String(req.user?.companyId || "").trim();
  return companyId ? { companyId } : {};
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
      WarehouseTransactionModel: WarehouseTransaction,
    };
  }
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) {
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
      WarehouseTransactionModel: WarehouseTransaction,
    };
  }
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
    WarehouseTransactionModel: getModelFromDb(tenantDb, WarehouseTransaction),
  };
}

function buildDistributorSalesOrderMatch(user, extra = {}) {
  const distributorIds = asIdList(user?.userId, user?.distributorId);
  const territoryNames = asIdList(user?.territoryName, user?.areaName);
  const clauses = [];
  if (distributorIds.length) clauses.push({ distributorId: { $in: distributorIds } });
  if (territoryNames.length) clauses.push({ territoryName: { $in: territoryNames } });
  if (!clauses.length) return { _id: null };
  return { $and: [extra, { $or: clauses }] };
}

function buildDistributorTeamMatch(user, extra = {}) {
  const distributorIds = asIdList(user?.userId, user?.distributorId);
  const territoryNames = asIdList(user?.territoryName, user?.areaName);
  const clauses = [];
  if (distributorIds.length) clauses.push({ distributorId: { $in: distributorIds } });
  if (territoryNames.length) clauses.push({ territoryName: { $in: territoryNames } });
  if (!clauses.length) return { _id: null };
  return {
    $and: [
      extra,
      { role: { $regex: /salesman|order\s*booker/i } },
      { $or: clauses },
    ],
  };
}

function buildDistributorExpenseMatch(user, extra = {}) {
  const territoryNames = asIdList(user?.territoryName, user?.areaName);
  const clauses = [{ distributorId: user?.uid }].filter(Boolean);
  if (territoryNames.length) clauses.push({ territory: { $in: territoryNames } });
  if (!clauses.length) return { _id: null };
  return { $and: [extra, { $or: clauses }] };
}

function buildDistributorReceiptMatch(user, extra = {}) {
  return {
    $and: [
      extra,
      {
        $or: [
          { payerUserId: user?.uid },
          { payerRole: { $regex: /distributor/i } },
          { receivedByUserId: user?.uid },
        ],
      },
    ],
  };
}

function buildDistributorPrimaryPaymentMatch(user, extra = {}) {
  return { $and: [extra, { distributorId: user?.uid }] };
}

function buildDistributorSecondaryPaymentMatch(user, extra = {}) {
  return { $and: [extra, { distributorId: user?.uid }] };
}

function buildDistributorReturnMatch(_user, extra = {}) {
  return extra;
}

function buildOrderScope(req, extra = {}) {
  if (isDistributorRole(req.user?.role)) return buildDistributorSalesOrderMatch(req.user, extra);
  return { ...companyQuery(req), ...extra };
}

function buildTeamScope(req, extra = {}) {
  if (isDistributorRole(req.user?.role)) return buildDistributorTeamMatch(req.user, extra);
  return { ...companyQuery(req), ...extra };
}

function buildExpenseScope(req, extra = {}) {
  if (isDistributorRole(req.user?.role)) return buildDistributorExpenseMatch(req.user, extra);
  return { ...companyQuery(req), ...extra };
}

function buildReceiptScope(req, extra = {}) {
  if (isDistributorRole(req.user?.role)) return buildDistributorReceiptMatch(req.user, extra);
  return { ...extra };
}

function buildPrimaryPaymentScope(req, extra = {}) {
  if (isDistributorRole(req.user?.role)) return buildDistributorPrimaryPaymentMatch(req.user, extra);
  return extra;
}

function buildSecondaryPaymentScope(req, extra = {}) {
  if (isDistributorRole(req.user?.role)) return buildDistributorSecondaryPaymentMatch(req.user, extra);
  return extra;
}

function buildReturnScope(req, extra = {}) {
  if (isDistributorRole(req.user?.role)) return buildDistributorReturnMatch(req.user, extra);
  return extra;
}

function countByStatusRows(rows = []) {
  const statusMap = rows.reduce((acc, row) => {
    acc[String(row._id || "unknown").toLowerCase()] = safeNumber(row.count);
    return acc;
  }, {});
  return statusMap;
}

function buildRecentActivity({ orders = [], receipts = [], expenses = [] }) {
  return [
    ...orders.map((item) => ({
      id: `order-${item._id}`,
      at: item.createdAt,
      title: `${item.orderNo || "Order"} • ${titleize(item.status)}`,
      meta: `${item.customerName || "Customer"} • ${item.saleType || "sale"}`,
      tone: item.status === "delivered" ? "emerald" : item.status === "pending" ? "amber" : "zinc",
    })),
    ...receipts.map((item) => ({
      id: `receipt-${item._id}`,
      at: item.paymentDate || item.createdAt,
      title: `${item.receiptNo || "Receipt"} • ${titleize(item.status)}`,
      meta: `${item.payerName || item.payerRole || "Payer"} • ₨ ${safeNumber(item.amount).toLocaleString()}`,
      tone: item.status === "approved" ? "emerald" : item.status === "pending" ? "amber" : "rose",
    })),
    ...expenses.map((item) => ({
      id: `expense-${item._id}`,
      at: item.expenseDate || item.createdAt,
      title: `${item.title || item.category || "Expense"} • ${titleize(item.status)}`,
      meta: `${item.category || "Expense"} • ₨ ${safeNumber(item.amount).toLocaleString()}`,
      tone: item.status === "approved" || item.status === "paid" ? "emerald" : item.status === "pending" ? "amber" : "rose",
    })),
  ]
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
    .slice(0, 8);
}

function buildDashboardCards(role, basePath) {
  const adminCards = [
    {
      key: "sales",
      title: "Sales & order intelligence",
      description: "Revenue, order mix, regional movement, and recent customer demand.",
      href: `${basePath}/sales`,
      badge: "Executive",
    },
    {
      key: "inventory",
      title: "Inventory & warehouse health",
      description: "On-hand movement, warehouse throughput, and stock handling pressure points.",
      href: `${basePath}/inventory`,
      badge: "Warehouse",
    },
    {
      key: "finance",
      title: "Finance, collections & account balances",
      description: "Expenses, receipts, account positions, and cash discipline in one place.",
      href: `${basePath}/finance`,
      badge: "Accounts",
    },
    {
      key: "hr",
      title: "People, roles & productivity",
      description: "Headcount distribution, active workforce, and role coverage snapshots.",
      href: `${basePath}/hr`,
      badge: "People",
    },
    {
      key: "logistics",
      title: "Logistics, transfers & fleet",
      description: "Movement of goods, delivery pipeline, and vehicle support visibility.",
      href: `${basePath}/logistics`,
      badge: "Operations",
    },
    {
      key: "compliance",
      title: "Compliance, returns & audit readiness",
      description: "Returns, adjustments, message load, and control exceptions.",
      href: `${basePath}/compliance`,
      badge: "Risk",
    },
    {
      key: "procurement",
      title: "Supplier & procurement intelligence",
      description: "Supplier footprint, inbound flow, and purchase activity monitoring.",
      href: `${basePath}/procurement`,
      badge: "Procurement",
    },
  ];

  if (isDistributorRole(role)) {
    return [
      {
        key: "sales",
        title: "Territory sales performance",
        description: "Secondary orders, delivered volumes, and territory demand trends.",
        href: "",
        badge: "Distributor",
      },
      {
        key: "finance",
        title: "Collections & payment discipline",
        description: "Receipts, primary balances, and paid-back amounts for your territory.",
        href: "",
        badge: "Cash flow",
      },
      {
        key: "team",
        title: "Field team execution",
        description: "Salesman and order booker footprint, status, and territory coverage.",
        href: "",
        badge: "Field",
      },
      {
        key: "compliance",
        title: "Returns & control signals",
        description: "Issues that need attention before they impact service levels.",
        href: "",
        badge: "Control",
      },
    ];
  }

  return adminCards;
}

async function getDashboardPayload(req) {
  const models = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
  const {
    SalesOrderModel,
    ReceiptModel,
    ExpenseModel,
    UserModel,
    WarehouseModel,
    ProductModel,
    StockTransferModel,
    VehicleModel,
    ReturnClaimModel,
    MessageModel,
    PrimaryPaymentModel,
    SecondaryPaymentModel,
    InventoryMovementModel,
  } = models;

  const salesScope = buildOrderScope(req);
  const teamScope = buildTeamScope(req);
  const expenseScope = buildExpenseScope(req);
  const receiptScope = buildReceiptScope(req);
  const primaryPaymentScope = buildPrimaryPaymentScope(req);
  const secondaryPaymentScope = buildSecondaryPaymentScope(req);
  const returnScope = buildReturnScope(req);

  const [
    salesStatusRows,
    salesTypeRows,
    regionRows,
    totalSalesValueRows,
    recentOrders,
    receiptStatusRows,
    paymentMethodRows,
    recentReceipts,
    expenseCategoryRows,
    expenseStatusRows,
    recentExpenses,
    teamRoleRows,
    teamStatusRows,
    totalWarehouses,
    totalProducts,
    transferStatusRows,
    totalVehicles,
    totalReturns,
    totalMessages,
    paymentAgingRows,
    paidBackRows,
    inventoryWarehouseRows,
  ] = await Promise.all([
    SalesOrderModel.aggregate([
      { $match: salesScope },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
    ]),
    SalesOrderModel.aggregate([
      { $match: salesScope },
      { $group: { _id: { $ifNull: ["$saleType", "unknown"] }, count: { $sum: 1 } } },
    ]),
    SalesOrderModel.aggregate([
      { $match: salesScope },
      {
        $group: {
          _id: { $ifNull: [isDistributorRole(req.user?.role) ? "$territoryName" : "$regionName", "Unassigned"] },
          orders: { $sum: 1 },
          value: { $sum: "$totalAmount" },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
        },
      },
      { $sort: { value: -1, orders: -1 } },
      { $limit: 8 },
    ]),
    SalesOrderModel.aggregate([
      { $match: salesScope },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    SalesOrderModel.find(salesScope).sort({ createdAt: -1 }).limit(6).lean(),
    ReceiptModel.aggregate([
      { $match: receiptScope },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]),
    ReceiptModel.aggregate([
      { $match: receiptScope },
      { $group: { _id: { $ifNull: ["$paymentMethod", "unknown"] }, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]),
    ReceiptModel.find(receiptScope).sort({ createdAt: -1 }).limit(6).lean(),
    ExpenseModel.aggregate([
      { $match: expenseScope },
      { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } },
      { $limit: 8 },
    ]),
    ExpenseModel.aggregate([
      { $match: expenseScope },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    ]),
    ExpenseModel.find(expenseScope).sort({ createdAt: -1 }).limit(6).lean(),
    UserModel.aggregate([
      { $match: teamScope },
      { $group: { _id: { $ifNull: ["$role", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    UserModel.aggregate([
      { $match: teamScope },
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
    ]),
    isDistributorRole(req.user?.role) ? Promise.resolve(0) : WarehouseModel.countDocuments(companyQuery(req, req.query?.companyId, req.query?.companyName)),
    isDistributorRole(req.user?.role) ? Promise.resolve(0) : ProductModel.countDocuments(companyQuery(req, req.query?.companyId, req.query?.companyName)),
    isDistributorRole(req.user?.role)
      ? SalesOrderModel.aggregate([
          { $match: salesScope },
          { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
        ])
      : StockTransferModel.aggregate([
          { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
        ]),
    isDistributorRole(req.user?.role) ? Promise.resolve(0) : VehicleModel.countDocuments(companyQuery(req, req.query?.companyId, req.query?.companyName)),
    ReturnClaimModel.countDocuments(returnScope),
    MessageModel.countDocuments(),
    PrimaryPaymentModel.aggregate([
      { $match: primaryPaymentScope },
      {
        $group: {
          _id: null,
          openInvoices: { $sum: { $cond: [{ $gt: ["$amountRemaining", 0] }, 1, 0] } },
          outstanding: { $sum: "$amountRemaining" },
          total: { $sum: "$amountTotal" },
        },
      },
    ]),
    SecondaryPaymentModel.aggregate([
      { $match: secondaryPaymentScope },
      { $group: { _id: null, paidBack: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
    ]),
    isDistributorRole(req.user?.role)
      ? Promise.resolve([])
      : InventoryMovementModel.aggregate([
          {
            $group: {
              _id: { $ifNull: ["$warehouseName", "Unassigned"] },
              inQty: { $sum: { $cond: [{ $in: ["$movementType", ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"]] }, "$quantity", 0] } },
              outQty: { $sum: { $cond: [{ $in: ["$movementType", ["SALE_OUT", "TRANSFER_OUT"]] }, "$quantity", 0] } },
              movementCount: { $sum: 1 },
            },
          },
          { $sort: { movementCount: -1 } },
          { $limit: 6 },
        ]),
  ]);

  const salesStatus = countByStatusRows(salesStatusRows);
  const receiptStatus = countByStatusRows(receiptStatusRows);
  const expenseStatus = countByStatusRows(expenseStatusRows);
  const teamStatus = countByStatusRows(teamStatusRows);
  const transferStatus = countByStatusRows(transferStatusRows);

  const totalOrders = Object.values(salesStatus).reduce((sum, count) => sum + safeNumber(count), 0);
  const deliveredOrders = safeNumber(salesStatus.delivered);
  const pendingOrders = safeNumber(salesStatus.pending);
  const approvedReceipts = safeNumber(receiptStatus.approved);
  const totalExpense = expenseCategoryRows.reduce((sum, row) => sum + safeNumber(row.amount), 0);
  const activeUsers = safeNumber(teamStatus.active);
  const salesValue = safeNumber(totalSalesValueRows?.[0]?.total);
  const outstanding = safeNumber(paymentAgingRows?.[0]?.outstanding);
  const paidBack = safeNumber(paidBackRows?.[0]?.paidBack);
  const openInvoices = safeNumber(paymentAgingRows?.[0]?.openInvoices);
  const totalTeam = teamRoleRows.reduce((sum, row) => sum + safeNumber(row.count), 0);

  const basePath = isDistributorRole(req.user?.role) ? "/dashboards/distributor/reports" : "/dashboards/admin/reports";
  const role = normalizeRole(req.user?.role);
  const scopeName = isDistributorRole(role)
    ? req.user?.territoryName || req.user?.distributorName || "Distributor territory"
    : req.query?.companyName || req.user?.companyName || (isSystemLevelAdmin(role) ? "Company reporting" : "Business reporting");

  const kpis = isDistributorRole(role)
    ? [
        { key: "orders", label: "Territory orders", value: totalOrders, helper: `${deliveredOrders} delivered`, tone: "emerald" },
        { key: "sales", label: "Booked value", value: salesValue, format: "currency", helper: `${pendingOrders} pending`, tone: "sky" },
        { key: "receipts", label: "Approved receipts", value: approvedReceipts, helper: `${safeNumber(receiptStatus.pending)} pending`, tone: "amber" },
        { key: "outstanding", label: "Outstanding primary", value: outstanding, format: "currency", helper: `${openInvoices} open invoices`, tone: "rose" },
        { key: "paidBack", label: "Paid back", value: paidBack, format: "currency", helper: `${safeNumber(paidBackRows?.[0]?.count)} repayments`, tone: "violet" },
        { key: "team", label: "Field team", value: totalTeam, helper: `${activeUsers} active`, tone: "emerald" },
      ]
    : [
        { key: "orders", label: "Orders processed", value: totalOrders, helper: `${deliveredOrders} delivered`, tone: "emerald" },
        { key: "sales", label: "Gross sales value", value: salesValue, format: "currency", helper: `${pendingOrders} pending`, tone: "sky" },
        { key: "receipts", label: "Approved receipts", value: approvedReceipts, helper: `${safeNumber(receiptStatus.pending)} pending review`, tone: "amber" },
        { key: "expenses", label: "Expense spend", value: totalExpense, format: "currency", helper: `${safeNumber(expenseStatus.pending)} pending approvals`, tone: "rose" },
        { key: "team", label: "Active people", value: activeUsers, helper: `${teamRoleRows.length} role buckets`, tone: "emerald" },
        { key: "warehouses", label: "Warehouses", value: totalWarehouses, helper: `${totalProducts} products tracked`, tone: "violet" },
        { key: "transfers", label: "In-progress transfers", value: safeNumber(transferStatus.pending) + safeNumber(transferStatus["transit-in"]), helper: `${safeNumber(transferStatus.completed)} completed`, tone: "amber" },
        { key: "risk", label: "Control flags", value: totalReturns + safeNumber(expenseStatus.rejected), helper: `${totalMessages} messages logged`, tone: "rose" },
      ];

  return {
    ok: true,
    scope: {
      role,
      label: scopeName,
      companyId: String(req.query?.companyId || req.user?.companyId || "").trim(),
      companyName: String(req.query?.companyName || req.user?.companyName || "").trim(),
    },
    hero: {
      eyebrow: isDistributorRole(role) ? "Distributor performance" : "Business intelligence workspace",
      title: isDistributorRole(role)
        ? "Distributor Reports Command Center"
        : "Reports Command Center",
      description: isDistributorRole(role)
        ? "Monitor territory demand, collections, field team execution, and payment discipline in one streamlined distributor workspace."
        : "Run daily operational reviews across sales, inventory, finance, logistics, compliance, procurement, and people management from one unified reporting surface.",
    },
    kpis,
    cards: buildDashboardCards(role, basePath),
    spotlight: {
      orderStatuses: salesStatusRows.map((row) => ({ label: titleize(row._id), value: row.count })),
      receiptStatuses: receiptStatusRows.map((row) => ({ label: titleize(row._id), value: row.count, amount: row.amount })),
      expenseCategories: expenseCategoryRows.map((row) => ({ label: row._id, value: row.amount, count: row.count })),
      teamRoles: teamRoleRows.map((row) => ({ label: titleize(row._id), value: row.count })),
      regionalSales: regionRows.map((row) => ({ label: row._id, orders: row.orders, value: row.value, delivered: row.delivered })),
      paymentExposure: {
        openInvoices,
        outstanding,
        paidBack,
      },
      warehouseFlow: inventoryWarehouseRows.map((row) => ({
        warehouse: row._id,
        inQty: row.inQty,
        outQty: row.outQty,
        movementCount: row.movementCount,
      })),
      transferStatus: transferStatusRows.map((row) => ({ label: titleize(row._id), value: row.count })),
      returns: totalReturns,
      messages: totalMessages,
    },
    recentActivity: buildRecentActivity({ orders: recentOrders, receipts: recentReceipts, expenses: recentExpenses }),
    metrics: {
      totalSalesOrders: totalOrders,
      totalSalesQuantity: regionRows.reduce((sum, row) => sum + safeNumber(row.orders), 0),
      totalExpenses: totalExpense,
      pendingExpenses: safeNumber(expenseStatus.pending),
      totalUsers: totalTeam,
      activeUsers,
      totalProducts,
      totalWarehouses,
      expenseCategories: expenseCategoryRows.length,
      userRoles: teamRoleRows.length,
      salesRegions: regionRows.length,
      transferStatuses: transferStatusRows.length,
      outstandingPrimaryPayments: outstanding,
      approvedReceipts,
    },
  };
}

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    return res.json(await getDashboardPayload(req));
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load reports dashboard" });
  }
});

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const payload = await getDashboardPayload(req);
    return res.json({ ok: true, metrics: payload.metrics });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load report overview" });
  }
});

router.get("/builder", requireAuth, async (req, res) => {
  try {
    const payload = await getDashboardPayload(req);
    const rows = payload.cards.map((card, index) => ({
      id: card.key,
      title: card.title,
      owner: isDistributorRole(req.user?.role) ? "Distributor" : ["Sales", "Supply Chain", "Accounts", "HR", "Logistics", "Compliance", "Procurement"][index] || "Operations",
      cadence: index % 2 === 0 ? "Daily" : "Weekly",
      lastRunAt: payload.recentActivity[0]?.at || new Date().toISOString(),
      recordCount: payload.spotlight[card.key === "inventory" ? "warehouseFlow" : card.key === "finance" ? "receiptStatuses" : card.key === "hr" || card.key === "team" ? "teamRoles" : card.key === "compliance" ? "orderStatuses" : "regionalSales"]?.length || 0,
      status: index % 3 === 0 ? "Ready" : index % 3 === 1 ? "Needs review" : "Draft",
    }));
    return res.json({ ok: true, generatedAt: new Date().toISOString(), rows });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load report builder data" });
  }
});

router.get("/sales", requireAuth, async (req, res) => {
  try {
    const { SalesOrderModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const match = buildOrderScope(req);
    const [regions, statuses, saleTypes, recentOrders] = await Promise.all([
      SalesOrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $ifNull: [isDistributorRole(req.user?.role) ? "$territoryName" : "$regionName", "Unassigned"] },
            orders: { $sum: 1 },
            quantity: { $sum: { $size: { $ifNull: ["$items", []] } } },
            value: { $sum: "$totalAmount" },
            lastMovementAt: { $max: "$createdAt" },
          },
        },
        { $sort: { value: -1 } },
      ]),
      SalesOrderModel.aggregate([{ $match: match }, { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 }, value: { $sum: "$totalAmount" } } }]),
      SalesOrderModel.aggregate([{ $match: match }, { $group: { _id: { $ifNull: ["$saleType", "unknown"] }, count: { $sum: 1 }, value: { $sum: "$totalAmount" } } }]),
      SalesOrderModel.find(match).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return res.json({
      ok: true,
      regions: regions.map((row) => ({ region: row._id, orders: row.orders, quantity: row.quantity, value: row.value, lastMovementAt: row.lastMovementAt })),
      statuses: statuses.map((row) => ({ status: row._id, count: row.count, value: row.value })),
      saleTypes: saleTypes.map((row) => ({ type: row._id, count: row.count, value: row.value })),
      recentOrders,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load sales report" });
  }
});

router.get("/inventory", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, ProductModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const inTypes = ["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN"];
    const outTypes = ["SALE_OUT", "TRANSFER_OUT"];

    const rows = await InventoryMovementModel.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$warehouseName", "Unassigned"] },
          inQty: { $sum: { $cond: [{ $in: ["$movementType", inTypes] }, "$quantity", 0] } },
          outQty: { $sum: { $cond: [{ $in: ["$movementType", outTypes] }, "$quantity", 0] } },
          movementCount: { $sum: 1 },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastMovementAt: -1 } },
    ]);

    const movementTypes = await InventoryMovementModel.aggregate([
      { $group: { _id: { $ifNull: ["$movementType", "unknown"] }, count: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
      { $sort: { count: -1 } },
    ]);

    const totalProducts = await ProductModel.countDocuments(companyQuery(req, req.query?.companyId, req.query?.companyName));

    return res.json({
      ok: true,
      totalProducts,
      warehouses: rows.map((row) => ({ warehouse: row._id, inQty: row.inQty, outQty: row.outQty, onHand: row.inQty - row.outQty, movementCount: row.movementCount, lastMovementAt: row.lastMovementAt })),
      movementTypes: movementTypes.map((row) => ({ type: row._id, count: row.count, quantity: row.quantity })),
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load inventory report" });
  }
});

router.get("/finance", requireAuth, async (req, res) => {
  try {
    const { ExpenseModel, AccountModel, ReceiptModel, PrimaryPaymentModel, SecondaryPaymentModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const [expenseTotals, expensesByCategory, accounts, receiptStatusRows, paymentMethodRows, primaryOpenRows, secondaryPaidRows] = await Promise.all([
      ExpenseModel.aggregate([{ $match: buildExpenseScope(req) }, { $group: { _id: null, total: { $sum: "$amount" }, approved: { $sum: { $cond: [{ $in: ["$status", ["approved", "paid", "posted"]] }, "$amount", 0] } } } }]),
      ExpenseModel.aggregate([{ $match: buildExpenseScope(req) }, { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      isDistributorRole(req.user?.role) ? Promise.resolve([]) : AccountModel.find(companyQuery(req, req.query?.companyId, req.query?.companyName)).select("accountName accountType currency currentBalance").sort({ accountName: 1 }).lean(),
      ReceiptModel.aggregate([{ $match: buildReceiptScope(req) }, { $group: { _id: { $ifNull: ["$status", "unknown"] }, amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      ReceiptModel.aggregate([{ $match: buildReceiptScope(req) }, { $group: { _id: { $ifNull: ["$paymentMethod", "unknown"] }, amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      PrimaryPaymentModel.aggregate([{ $match: buildPrimaryPaymentScope(req) }, { $group: { _id: null, totalAmount: { $sum: "$amountTotal" }, outstandingAmount: { $sum: "$amountRemaining" }, openInvoices: { $sum: { $cond: [{ $gt: ["$amountRemaining", 0] }, 1, 0] } } } }]),
      SecondaryPaymentModel.aggregate([{ $match: buildSecondaryPaymentScope(req) }, { $group: { _id: null, totalPaidBack: { $sum: "$amountPaid" }, count: { $sum: 1 } } }]),
    ]);

    return res.json({
      ok: true,
      totals: {
        totalExpenses: safeNumber(expenseTotals?.[0]?.total),
        approvedExpenses: safeNumber(expenseTotals?.[0]?.approved),
        totalReceiptAmount: receiptStatusRows.reduce((sum, row) => sum + safeNumber(row.amount), 0),
        outstandingPrimaryPayments: safeNumber(primaryOpenRows?.[0]?.outstandingAmount),
        paidBackAmount: safeNumber(secondaryPaidRows?.[0]?.totalPaidBack),
      },
      expensesByCategory: expensesByCategory.map((row) => ({ category: row._id, total: row.total, count: row.count })),
      accounts,
      receiptStatuses: receiptStatusRows.map((row) => ({ status: row._id, amount: row.amount, count: row.count })),
      paymentMethods: paymentMethodRows.map((row) => ({ method: row._id, amount: row.amount, count: row.count })),
      primaryPayments: primaryOpenRows?.[0] || { totalAmount: 0, outstandingAmount: 0, openInvoices: 0 },
      secondaryPayments: secondaryPaidRows?.[0] || { totalPaidBack: 0, count: 0 },
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load finance report" });
  }
});

router.get("/hr", requireAuth, async (req, res) => {
  try {
    const { UserModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const match = buildTeamScope(req);
    const [roleCounts, statusCounts, totalUsers, areaCounts] = await Promise.all([
      UserModel.aggregate([{ $match: match }, { $group: { _id: { $ifNull: ["$role", "Unassigned"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      UserModel.aggregate([{ $match: match }, { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } }]),
      UserModel.countDocuments(match),
      UserModel.aggregate([{ $match: match }, { $group: { _id: { $ifNull: [isDistributorRole(req.user?.role) ? "$territoryName" : "$regionName", "Unassigned"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    ]);

    return res.json({
      ok: true,
      totalUsers,
      roleCounts: roleCounts.map((row) => ({ role: row._id, count: row.count })),
      statusCounts: statusCounts.map((row) => ({ status: row._id, count: row.count })),
      areaCounts: areaCounts.map((row) => ({ area: row._id, count: row.count })),
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load HR report" });
  }
});

router.get("/logistics", requireAuth, async (req, res) => {
  try {
    const { StockTransferModel, VehicleModel, SalesOrderModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    if (isDistributorRole(req.user?.role)) {
      const orderStatus = await SalesOrderModel.aggregate([{ $match: buildOrderScope(req) }, { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } }]);
      return res.json({ ok: true, vehicleCount: 0, transferCounts: orderStatus.map((row) => ({ status: row._id, count: row.count })) });
    }

    const [transferCounts, vehicleCount] = await Promise.all([
      StockTransferModel.aggregate([{ $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } }]),
      VehicleModel.countDocuments(companyQuery(req, req.query?.companyId, req.query?.companyName)),
    ]);

    return res.json({ ok: true, vehicleCount, transferCounts: transferCounts.map((row) => ({ status: row._id, count: row.count })) });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load logistics report" });
  }
});

router.get("/compliance", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, MessageModel, ReturnClaimModel, SalesOrderModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const [adjustmentCount, returnCount, messageCount, rejectedOrders] = await Promise.all([
      isDistributorRole(req.user?.role) ? Promise.resolve(0) : InventoryMovementModel.countDocuments({ movementType: "ADJUSTMENT" }),
      ReturnClaimModel.countDocuments(buildReturnScope(req)),
      MessageModel.countDocuments(),
      SalesOrderModel.countDocuments({ ...buildOrderScope(req), status: "rejected" }),
    ]);

    return res.json({ ok: true, adjustmentCount, returnCount, messageCount, rejectedOrders });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load compliance report" });
  }
});

router.get("/procurement", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, UserModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    const [supplierTotal, supplierActive, purchaseAgg, recentPurchases, trendAgg] = await Promise.all([
      UserModel.countDocuments({ ...companyQuery(req, req.query?.companyId, req.query?.companyName), role: { $regex: /supplier/i } }),
      UserModel.countDocuments({ ...companyQuery(req, req.query?.companyId, req.query?.companyName), role: { $regex: /supplier/i }, status: "active" }),
      InventoryMovementModel.aggregate([{ $match: { movementType: "PURCHASE_IN" } }, { $group: { _id: null, count: { $sum: 1 }, quantity: { $sum: "$quantity" } } }]),
      InventoryMovementModel.find({ movementType: "PURCHASE_IN" }).sort({ createdAt: -1 }).limit(5).lean(),
      InventoryMovementModel.aggregate([
        { $match: { movementType: "PURCHASE_IN", createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, quantity: { $sum: "$quantity" }, count: { $sum: 1 } } },
      ]),
    ]);

    const trendMap = trendAgg.reduce((acc, row) => {
      acc[row._id] = { quantity: safeNumber(row.quantity), count: safeNumber(row.count) };
      return acc;
    }, {});

    const trendDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return date;
    });

    const inboundTrend = trendDates.map((date) => {
      const key = date.toISOString().slice(0, 10);
      return { label: date.toLocaleDateString("en-US", { weekday: "short" }), quantity: trendMap[key]?.quantity || 0, count: trendMap[key]?.count || 0 };
    });

    return res.json({ ok: true, kpis: { totalSuppliers: supplierTotal, activeSuppliers: supplierActive, totalReceipts: purchaseAgg?.[0]?.count || 0, totalQuantity: safeNumber(purchaseAgg?.[0]?.quantity) }, recentPurchases, inboundTrend });
  } catch (_e) {
    return res.status(500).json({ ok: false, message: "Failed to load procurement report" });
  }
});

module.exports = router;