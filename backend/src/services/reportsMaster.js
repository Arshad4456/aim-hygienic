const mongoose = require("mongoose");
const Company = require("../models/Company");
const User = require("../models/User");
const Product = require("../models/Product");
const Warehouse = require("../models/Warehouse");
const InventoryMovement = require("../models/InventoryMovement");
const Expense = require("../models/Expense");
const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const StockTransfer = require("../models/StockTransfer");
const Vehicle = require("../models/Vehicle");
const Message = require("../models/Message");
const ReturnClaim = require("../models/ReturnClaim");
const WarehouseTransaction = require("../models/WarehouseTransaction");
const SalesOrder = require("../models/SalesOrder");
const Receipt = require("../models/Receipt");
const PrimaryPayment = require("../models/PrimaryPayment");
const SecondaryPayment = require("../models/SecondaryPayment");
const Loan = require("../models/Loan");
const LoanPayment = require("../models/LoanPayment");
const Region = require("../models/Region");
const Zone = require("../models/Zone");
const Area = require("../models/Area");
const Field = require("../models/Field");
const VehicleTrip = require("../models/VehicleTrip");
const VehicleRefuel = require("../models/VehicleRefuel");
const VehicleMaintenance = require("../models/VehicleMaintenance");
const { getLocationModelsForDb } = require("../modules/location/models");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function asText(value) {
  return String(value || "").trim();
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

const ORDER_TRANSACTION_TYPES = ["SALE_STOCK", "STOCK_OUT", "RETURN_TO_SD", "PURCHASING_OUT"];
const PRIMARY_SOURCE_ROLES = ["brand manager", "brand", "distributor"];
const SECONDARY_SOURCE_ROLES = ["order management", "order booker", "orderbooker", "customer", "salesman", "admin"];

function sourceRoleFilter(roles = []) {
  const normalized = roles.map((role) => String(role || "").trim().toLowerCase()).filter(Boolean);
  if (!normalized.length) return {};
  return {
    $expr: {
      $in: [
        {
          $toLower: {
            $ifNull: ["$requestSourceRole", { $ifNull: ["$fromEntityType", ""] }],
          },
        },
        normalized,
      ],
    },
  };
}

function orderTransactionFilter() {
  return { transactionType: { $in: ORDER_TRANSACTION_TYPES } };
}

function sumTransactionItemsExpression(path = "$items") {
  return {
    $reduce: {
      input: { $ifNull: [path, []] },
      initialValue: 0,
      in: {
        $add: [
          "$$value",
          { $ifNull: ["$$this.totalPacks", { $ifNull: ["$$this.quantity", 0] }] },
        ],
      },
    },
  };
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString("en-PK");
}

function formatCurrency(value, currency = "PKR") {
  return `${currency} ${formatNumber(value)}`;
}

function formatPercent(value) {
  return `${safeNumber(value).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

function titleCase(value) {
  return asText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "—";
}

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
}

function computeDeltaPercent(currentValue, previousValue) {
  const current = safeNumber(currentValue);
  const previous = safeNumber(previousValue);
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return ((current - previous) / previous) * 100;
}

function getTrendTone(deltaPercent) {
  if (deltaPercent > 5) return "positive";
  if (deltaPercent < -5) return "negative";
  return "neutral";
}

function compareBlock(currentValue, previousValue, currentLabel, previousLabel) {
  const deltaPercent = computeDeltaPercent(currentValue, previousValue);
  return {
    currentValue: safeNumber(currentValue),
    previousValue: safeNumber(previousValue),
    currentLabel,
    previousLabel,
    deltaPercent,
    deltaText: `${deltaPercent >= 0 ? "+" : ""}${deltaPercent.toFixed(1)}%`,
    tone: getTrendTone(deltaPercent),
  };
}

function getRangeLabel(period) {
  const labels = {
    all: "All time",
    day: "Today",
    week: "This week",
    month: "This month",
    quarter: "This quarter",
    year: "This year",
  };
  return labels[period] || labels.month;
}

function getPreviousRangeLabel(period) {
  const labels = {
    all: "Previous 30 days",
    day: "Yesterday",
    week: "Previous week",
    month: "Previous month",
    quarter: "Previous quarter",
    year: "Previous year",
  };
  return labels[period] || labels.month;
}

function getPeriodRange(period = "month") {
  const now = new Date();
  const end = new Date(now);
  const currentStart = new Date(now);
  const previousStart = new Date(now);
  const previousEnd = new Date(now);

  if (period === "all") {
    previousStart.setDate(previousStart.getDate() - 30);
    return {
      period,
      current: { start: null, end },
      previous: { start: previousStart, end },
      currentLabel: getRangeLabel(period),
      previousLabel: getPreviousRangeLabel(period),
    };
  }

  if (period === "day") {
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setDate(previousStart.getDate() - 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    const day = currentStart.getDay();
    const diffToMonday = (day + 6) % 7;
    currentStart.setDate(currentStart.getDate() - diffToMonday);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setTime(currentStart.getTime());
    previousStart.setDate(previousStart.getDate() - 7);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else if (period === "quarter") {
    const month = currentStart.getMonth();
    const quarterStartMonth = Math.floor(month / 3) * 3;
    currentStart.setMonth(quarterStartMonth, 1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setMonth(quarterStartMonth - 3, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else if (period === "year") {
    currentStart.setMonth(0, 1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setFullYear(currentStart.getFullYear() - 1, 0, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else {
    currentStart.setDate(1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setMonth(previousStart.getMonth() - 1, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  }

  return {
    period,
    current: { start: currentStart, end },
    previous: { start: previousStart, end: previousEnd },
    currentLabel: getRangeLabel(period),
    previousLabel: getPreviousRangeLabel(period),
  };
}

function applyDateFilter(baseMatch = {}, fieldName, range) {
  const next = { ...baseMatch };
  if (!range?.start) return next;
  next[fieldName] = { $gte: range.start, $lte: range.end || new Date() };
  return next;
}

function addOrScope(baseMatch = {}, scopeQueries = []) {
  const filtered = scopeQueries.filter(Boolean);
  if (!filtered.length) return { ...baseMatch };
  if (!Object.keys(baseMatch).length) return { $or: filtered };
  return { $and: [{ ...baseMatch }, { $or: filtered }] };
}

function table(title, columns, rows, count, description = "") {
  return {
    title,
    description,
    columns,
    rows,
    count: safeNumber(count ?? rows?.length ?? 0),
  };
}

function ensureNarrativeRows(rows, fallbackText) {
  const normalized = Array.isArray(rows) ? rows.filter(Boolean) : [];
  return normalized.length ? normalized : [fallbackText];
}

function normalizeSegment(segment = {}, moduleTitle = "Module") {
  return {
    key: asText(segment.key) || `segment-${Date.now()}`,
    title: segment.title || moduleTitle,
    description: segment.description || "",
    badge: segment.badge || "Detailed analysis",
    kpis: Array.isArray(segment.kpis) ? segment.kpis : [],
    alerts: ensureNarrativeRows(segment.alerts, `No critical alerts in ${segment.title || moduleTitle} for the selected period.`),
    insights: ensureNarrativeRows(segment.insights, `Performance is stable in ${segment.title || moduleTitle}. Review the detailed tables for action opportunities.`),
    tables: Array.isArray(segment.tables) ? segment.tables : [],
  };
}

function moduleCard(key, title, description, data = {}) {
  return {
    key,
    title,
    description,
    routeSegment: data.routeSegment || key,
    kpis: Array.isArray(data.kpis) ? data.kpis : [],
    comparison: data.comparison || compareBlock(0, 0, "Current", "Previous"),
    alerts: ensureNarrativeRows(data.alerts, `No critical alerts in ${title} for the selected period.`),
    insights: ensureNarrativeRows(data.insights, `Performance is stable in ${title}. Review the detailed tables for action opportunities.`),
    tables: Array.isArray(data.tables) ? data.tables : [],
    segments: Array.isArray(data.segments) ? data.segments.map((segment) => normalizeSegment(segment, title)) : [],
    heroTone: data.heroTone || "indigo",
    badge: data.badge || "Operational intelligence",
  };
}

function summarizeCard(card) {
  const primary = card.kpis?.[0] || null;
  return {
    key: card.key,
    title: card.title,
    description: card.description,
    routeSegment: card.routeSegment,
    badge: card.badge,
    primaryMetric: primary,
    comparison: card.comparison,
    alertCount: card.alerts?.length || 0,
  };
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function resolveViewerScope(req) {
  const role = normalizeRole(req.user?.role);
  return {
    role,
    uid: asText(req.user?.uid),
    userId: asText(req.user?.userId),
    distributorId: asText(req.user?.distributorId),
    companyId: asText(req.user?.companyId),
    companyName: asText(req.user?.companyName),
    warehouseId: asText(req.user?.warehouseId || req.user?.warehouse_id),
    warehouseName: asText(req.user?.warehouseName),
    regionId: asText(req.user?.regionId),
    regionName: asText(req.user?.regionName),
    zoneId: asText(req.user?.zoneId),
    zoneName: asText(req.user?.zoneName),
    territoryId: asText(req.user?.territoryId),
    territoryName: asText(req.user?.territoryName),
    fieldId: asText(req.user?.fieldId),
    fieldName: asText(req.user?.fieldName),
    isDistributor: role === "distributor",
    isSystemAdmin: isSystemLevelAdmin(role),
    isCompanyAdmin: role === "company admin",
  };
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = asText(companyId);
  const normalizedCompanyName = asText(companyName);
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

async function getScopedModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scope = resolveViewerScope(req);
  const scopedCompanyId = scope.isSystemAdmin ? asText(requestedCompanyId) : scope.companyId;
  const scopedCompanyName = scope.isSystemAdmin ? asText(requestedCompanyName) : scope.companyName;
  if (!scopedCompanyId) {
    return {
      CompanyModel: Company,
      UserModel: User,
      ProductModel: Product,
      WarehouseModel: Warehouse,
      InventoryMovementModel: InventoryMovement,
      ExpenseModel: Expense,
      AccountModel: Account,
      AccountTransactionModel: AccountTransaction,
      StockTransferModel: StockTransfer,
      VehicleModel: Vehicle,
      MessageModel: Message,
      ReturnClaimModel: ReturnClaim,
      WarehouseTransactionModel: WarehouseTransaction,
      orderBaseMatch: {},
      SalesOrderModel: SalesOrder,
      ReceiptModel: Receipt,
      PrimaryPaymentModel: PrimaryPayment,
      SecondaryPaymentModel: SecondaryPayment,
      LoanModel: Loan,
      LoanPaymentModel: LoanPayment,
      RegionModel: Region,
      ZoneModel: Zone,
      AreaModel: Area,
      FieldModel: Field,
      VehicleTripModel: VehicleTrip,
      VehicleRefuelModel: VehicleRefuel,
      VehicleMaintenanceModel: VehicleMaintenance,
      locationModels: null,
    };
  }

  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) {
    return {
      CompanyModel: Company,
      UserModel: User,
      ProductModel: Product,
      WarehouseModel: Warehouse,
      InventoryMovementModel: InventoryMovement,
      ExpenseModel: Expense,
      AccountModel: Account,
      AccountTransactionModel: AccountTransaction,
      StockTransferModel: StockTransfer,
      VehicleModel: Vehicle,
      MessageModel: Message,
      ReturnClaimModel: ReturnClaim,
      WarehouseTransactionModel: WarehouseTransaction,
      orderBaseMatch: { companyId: scopedCompanyId },
      SalesOrderModel: SalesOrder,
      ReceiptModel: Receipt,
      PrimaryPaymentModel: PrimaryPayment,
      SecondaryPaymentModel: SecondaryPayment,
      LoanModel: Loan,
      LoanPaymentModel: LoanPayment,
      RegionModel: Region,
      ZoneModel: Zone,
      AreaModel: Area,
      FieldModel: Field,
      VehicleTripModel: VehicleTrip,
      VehicleRefuelModel: VehicleRefuel,
      VehicleMaintenanceModel: VehicleMaintenance,
      locationModels: null,
    };
  }

  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  const tenantOrderCollectionName = WarehouseTransaction.collection?.name || "warehousetransactions";
  let usePrimaryOrders = false;
  try {
    const hasTenantOrders = await tenantDb.db.listCollections({ name: tenantOrderCollectionName }).hasNext();
    usePrimaryOrders = !hasTenantOrders;
  } catch (_error) {
    usePrimaryOrders = false;
  }

  return {
    CompanyModel: Company,
    UserModel: getModelFromDb(tenantDb, User),
    ProductModel: getModelFromDb(tenantDb, Product),
    WarehouseModel: getModelFromDb(tenantDb, Warehouse),
    InventoryMovementModel: getModelFromDb(tenantDb, InventoryMovement),
    ExpenseModel: getModelFromDb(tenantDb, Expense),
    AccountModel: getModelFromDb(tenantDb, Account),
    AccountTransactionModel: getModelFromDb(tenantDb, AccountTransaction),
    StockTransferModel: getModelFromDb(tenantDb, StockTransfer),
    VehicleModel: getModelFromDb(tenantDb, Vehicle),
    MessageModel: getModelFromDb(tenantDb, Message),
    ReturnClaimModel: getModelFromDb(tenantDb, ReturnClaim),
    WarehouseTransactionModel: usePrimaryOrders ? WarehouseTransaction : getModelFromDb(tenantDb, WarehouseTransaction),
    orderBaseMatch: usePrimaryOrders ? { companyId: scopedCompanyId } : {},
    SalesOrderModel: usePrimaryOrders ? SalesOrder : getModelFromDb(tenantDb, SalesOrder),
    ReceiptModel: getModelFromDb(tenantDb, Receipt),
    PrimaryPaymentModel: getModelFromDb(tenantDb, PrimaryPayment),
    SecondaryPaymentModel: getModelFromDb(tenantDb, SecondaryPayment),
    LoanModel: getModelFromDb(tenantDb, Loan),
    LoanPaymentModel: getModelFromDb(tenantDb, LoanPayment),
    RegionModel: getModelFromDb(tenantDb, Region),
    ZoneModel: getModelFromDb(tenantDb, Zone),
    AreaModel: getModelFromDb(tenantDb, Area),
    FieldModel: getModelFromDb(tenantDb, Field),
    VehicleTripModel: getModelFromDb(tenantDb, VehicleTrip),
    VehicleRefuelModel: getModelFromDb(tenantDb, VehicleRefuel),
    VehicleMaintenanceModel: getModelFromDb(tenantDb, VehicleMaintenance),
    locationModels: getLocationModelsForDb(tenantDb),
  };
}

function scopedOrderQuery(models, scope, query = {}) {
  const base = { ...(models?.orderBaseMatch || {}), ...(query || {}) };
  return distributorOrderScope(scope, base);
}

function scopedSalesOrderQuery(models, scope, query = {}) {
  const base = { ...(models?.orderBaseMatch || {}), ...(query || {}) };
  return distributorSalesOrderScope(scope, base);
}

async function resolveRoleScope(models, rawScope) {
  const scope = { ...rawScope };
  scope.viewerObjectId = toObjectId(scope.uid);
  scope.viewerTextIds = uniq([scope.uid, scope.userId, scope.distributorId]);
  scope.viewerObjectIds = uniq([scope.viewerObjectId, toObjectId(scope.distributorId)].filter(Boolean).map((value) => String(value))).map(toObjectId).filter(Boolean);
  scope.scopeLabel = scope.isDistributor
    ? `Distributor territory ${scope.territoryName || scope.regionName || "scope"}`
    : scope.isSystemAdmin
      ? "All companies"
      : (scope.companyName || "Company scope");

  if (!scope.isDistributor) {
    scope.teamUserObjectIds = scope.viewerObjectIds;
    scope.teamUserTextIds = scope.viewerTextIds;
    return scope;
  }

  const or = [];
  if (scope.distributorId) or.push({ distributorId: scope.distributorId });
  if (scope.uid) or.push({ _id: toObjectId(scope.uid) || undefined });
  if (scope.userId) or.push({ userId: scope.userId });
  if (scope.territoryId) or.push({ territoryId: scope.territoryId });
  if (scope.territoryName) or.push({ territoryName: scope.territoryName });
  const normalizedOr = or.filter((item) => Object.values(item).every(Boolean));

  let teamUsers = [];
  if (normalizedOr.length) {
    teamUsers = await models.UserModel.find({ $or: normalizedOr })
      .select("_id userId role fullName distributorId territoryId territoryName fieldId fieldName")
      .lean();
  }

  const distributorObjectIds = teamUsers.map((row) => toObjectId(row._id)).filter(Boolean);
  const distributorTextIds = uniq([
    ...teamUsers.map((row) => asText(row.userId)),
    ...teamUsers.map((row) => asText(row.distributorId)),
    scope.uid,
    scope.userId,
    scope.distributorId,
  ]);

  scope.teamUsers = teamUsers;
  scope.teamUserObjectIds = distributorObjectIds;
  scope.teamUserTextIds = distributorTextIds;
  return scope;
}

function distributorOrderScope(scope, base = {}) {
  if (!scope.isDistributor) return { ...base };
  const or = [];
  if (scope.distributorId) or.push({ distributorId: scope.distributorId });
  if (scope.territoryName) or.push({ territoryName: scope.territoryName });
  if (scope.territoryName) or.push({ territory: scope.territoryName });
  if (scope.teamUserTextIds?.length) {
    or.push({ customerId: { $in: scope.teamUserTextIds } });
    or.push({ orderBookerId: { $in: scope.teamUserTextIds } });
    or.push({ salesmanId: { $in: scope.teamUserTextIds } });
    or.push({ createdBy: { $in: scope.teamUserTextIds.map(toObjectId).filter(Boolean) } });
  }
  if (!or.length) return { ...base, _id: null };
  return addOrScope(base, or);
}

function distributorSalesOrderScope(scope, base = {}) {
  if (!scope.isDistributor) return { ...base };
  const or = [];
  if (scope.distributorId) or.push({ distributorId: scope.distributorId });
  if (scope.territoryName) or.push({ territoryName: scope.territoryName });
  if (scope.teamUserTextIds?.length) {
    or.push({ customerId: { $in: scope.teamUserTextIds } });
    or.push({ orderBookerId: { $in: scope.teamUserTextIds } });
    or.push({ salesmanId: { $in: scope.teamUserTextIds } });
    or.push({ createdBy: { $in: scope.teamUserTextIds.map(toObjectId).filter(Boolean) } });
  }
  if (!or.length) return { ...base, _id: null };
  return addOrScope(base, or);
}

function distributorExpenseScope(scope, base = {}) {
  if (!scope.isDistributor) return { ...base };
  const or = [];
  if (scope.territoryName) or.push({ territory: scope.territoryName });
  if (scope.teamUserObjectIds?.length) {
    or.push({ distributorId: { $in: scope.teamUserObjectIds } });
    or.push({ spenderUserId: { $in: scope.teamUserObjectIds } });
    or.push({ createdBy: { $in: scope.teamUserObjectIds } });
  }
  if (!or.length) return { ...base, _id: null };
  return addOrScope(base, or);
}

function distributorPaymentScope(scope, base = {}) {
  if (!scope.isDistributor) return { ...base };
  const or = [];
  if (scope.territoryName) or.push({ territoryName: scope.territoryName });
  if (scope.teamUserObjectIds?.length) or.push({ distributorId: { $in: scope.teamUserObjectIds } });
  if (!or.length) return { ...base, _id: null };
  return addOrScope(base, or);
}

function distributorReceiptScope(scope, scopedOrderIds = [], base = {}) {
  if (!scope.isDistributor) return { ...base };
  const or = [];
  if (scope.teamUserObjectIds?.length) {
    or.push({ payerUserId: { $in: scope.teamUserObjectIds } });
    or.push({ createdByUserId: { $in: scope.teamUserObjectIds } });
    or.push({ receivedByUserId: { $in: scope.teamUserObjectIds } });
  }
  if (scopedOrderIds?.length) or.push({ linkedOrderId: { $in: scopedOrderIds } });
  if (!or.length) return { ...base, _id: null };
  return addOrScope(base, or);
}

function distributorMessageScope(scope, base = {}) {
  if (!scope.isDistributor) return { ...base };
  const or = [];
  if (scope.teamUserTextIds?.length) {
    or.push({ senderUserId: { $in: scope.teamUserTextIds } });
    or.push({ readByUserIds: { $in: scope.teamUserTextIds } });
  }
  or.push({ recipientRole: { $in: ["distributor", "salesman", "order booker", "orderbooker", "customer"] } });
  if (!or.length) return { ...base, _id: null };
  return addOrScope(base, or);
}

async function getScopedOrderRefs(models, scope, currentRange) {
  const match = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter() }, "transactionAt", currentRange));
  const rows = await models.WarehouseTransactionModel.find(match).select("_id transactionCode").limit(5000).lean();
  return {
    orderIds: rows.map((row) => row._id).filter(Boolean),
    orderNos: rows.map((row) => row.transactionCode).filter(Boolean),
  };
}

async function buildDashboardModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentOrderMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter() }, "transactionAt", currentRange));
  const previousOrderMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter() }, "transactionAt", previousRange));
  const currentExpenseMatch = distributorExpenseScope(scope, applyDateFilter({}, "createdAt", currentRange));
  const previousExpenseMatch = distributorExpenseScope(scope, applyDateFilter({}, "createdAt", previousRange));

  const [
    currentOrders,
    previousOrders,
    currentExpensesAgg,
    previousExpensesAgg,
    usersTotal,
    recentOrders,
    statusMix,
  ] = await Promise.all([
    models.WarehouseTransactionModel.countDocuments(currentOrderMatch),
    models.WarehouseTransactionModel.countDocuments(previousOrderMatch),
    models.ExpenseModel.aggregate([{ $match: currentExpenseMatch }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    models.ExpenseModel.aggregate([{ $match: previousExpenseMatch }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    scope.isDistributor
      ? models.UserModel.countDocuments(addOrScope({}, [scope.territoryName ? { territoryName: scope.territoryName } : null, scope.distributorId ? { distributorId: scope.distributorId } : null]))
      : models.UserModel.countDocuments(),
    models.WarehouseTransactionModel.find(currentOrderMatch).sort({ transactionAt: -1 }).limit(5).select("transactionCode toEntityName requestStatus grandTotal transactionAt territory").lean(),
    models.WarehouseTransactionModel.aggregate([
      { $match: currentOrderMatch },
      { $group: { _id: "$requestStatus", count: { $sum: 1 }, amount: { $sum: "$grandTotal" } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const currentExpenseTotal = safeNumber(currentExpensesAgg?.[0]?.total);
  const previousExpenseTotal = safeNumber(previousExpensesAgg?.[0]?.total);

  return moduleCard("dashboard", "Dashboard Overview", "Top-level company intelligence for orders, costs, and execution health.", {
    badge: scope.isDistributor ? "Territory overview" : "Executive overview",
    heroTone: "indigo",
    kpis: [
      { label: "Orders in period", value: formatNumber(currentOrders), note: currentLabel },
      { label: "Expense in period", value: formatCurrency(currentExpenseTotal), note: currentLabel },
      { label: "People covered", value: formatNumber(usersTotal), note: scope.scopeLabel },
      { label: "Best status", value: titleCase(statusMix[0]?._id || "n/a"), note: statusMix[0] ? `${formatNumber(statusMix[0].count)} orders` : "No orders" },
    ],
    comparison: compareBlock(currentOrders, previousOrders, currentLabel, previousLabel),
    alerts: [
      currentOrders < previousOrders ? "Order creation is slower than the previous comparison period." : "",
      currentExpenseTotal > previousExpenseTotal * 1.2 && previousExpenseTotal > 0 ? "Expense growth is significantly higher than the previous period." : "",
    ],
    insights: [
      statusMix[0]?._id ? `${titleCase(statusMix[0]._id)} is the dominant operational status in ${currentLabel.toLowerCase()}.` : "",
      scope.isDistributor ? `Distributor reporting is restricted to ${scope.territoryName || "assigned territory"}.` : "",
    ],
    tables: [
      table(
        "Recent orders",
        [
          { key: "orderNo", label: "Order #" },
          { key: "customerName", label: "Customer" },
          { key: "territoryName", label: "Territory" },
          { key: "status", label: "Status" },
          { key: "totalAmount", label: "Amount" },
          { key: "createdAt", label: "Created" },
        ],
        recentOrders.map((row) => ({
          orderNo: row.transactionCode || "—",
          customerName: row.toEntityName || "—",
          territoryName: row.territory || "—",
          status: titleCase(row.requestStatus),
          totalAmount: formatCurrency(row.grandTotal),
          createdAt: formatDate(row.transactionAt),
        })),
        recentOrders.length,
        "Latest order activity that needs business attention."
      ),
      table(
        "Order status mix",
        [
          { key: "status", label: "Status" },
          { key: "count", label: "Orders" },
          { key: "amount", label: "Order value" },
        ],
        statusMix.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), amount: formatCurrency(row.amount) })),
        statusMix.length,
        "Shows the operational spread of the current order pipeline."
      ),
    ],
  });
}

async function buildCompaniesModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const companyMatch = scope.isSystemAdmin ? {} : { companyId: scope.companyId };
  const [totalCompanies, previousCompanies, currentCompanies, latestCompanies] = await Promise.all([
    models.CompanyModel.countDocuments(companyMatch),
    models.CompanyModel.countDocuments(applyDateFilter(companyMatch, "createdAt", previousRange)),
    models.CompanyModel.countDocuments(applyDateFilter(companyMatch, "createdAt", currentRange)),
    models.CompanyModel.find(companyMatch).sort({ createdAt: -1 }).limit(5).select("name companyId contactEmail createdAt").lean(),
  ]);

  return moduleCard("companies", "Company Management", "New company onboarding, latest additions, and company registry visibility.", {
    badge: scope.isSystemAdmin ? "System scope" : "Tenant scope",
    heroTone: "fuchsia",
    kpis: [
      { label: "Companies", value: formatNumber(totalCompanies), note: scope.isSystemAdmin ? "Global registry" : "Accessible company scope" },
      { label: "New in period", value: formatNumber(currentCompanies), note: currentLabel },
      { label: "Last added", value: latestCompanies[0]?.name || "—", note: latestCompanies[0] ? formatDate(latestCompanies[0].createdAt) : "No companies" },
      { label: "Company code", value: latestCompanies[0]?.companyId || scope.companyId || "—", note: "Latest reference" },
    ],
    comparison: compareBlock(currentCompanies, previousCompanies, currentLabel, previousLabel),
    alerts: [!scope.isSystemAdmin ? "Company admin can only review their assigned company scope." : ""],
    insights: [totalCompanies ? "Company registry is ready for audit and onboarding reviews." : "No companies found in current scope."],
    tables: [
      table(
        "Latest companies",
        [
          { key: "name", label: "Company" },
          { key: "companyId", label: "Company ID" },
          { key: "contactEmail", label: "Contact" },
          { key: "createdAt", label: "Created" },
        ],
        latestCompanies.map((row) => ({
          name: row.name || "—",
          companyId: row.companyId || "—",
          contactEmail: row.contactEmail || "—",
          createdAt: formatDate(row.createdAt),
        })),
        totalCompanies,
        "The newest registered companies in the accessible scope."
      ),
    ],
  });
}

async function buildProductsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const [totalProducts, currentNew, previousNew, categoryAgg, recentProducts] = await Promise.all([
    models.ProductModel.countDocuments(),
    models.ProductModel.countDocuments(applyDateFilter({}, "createdAt", currentRange)),
    models.ProductModel.countDocuments(applyDateFilter({}, "createdAt", previousRange)),
    models.ProductModel.aggregate([
      { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    models.ProductModel.find({}).sort({ createdAt: -1 }).limit(8).select("name category retailPrice wholesalePrice createdAt").lean(),
  ]);

  return moduleCard("products", "Products Management", "Catalog growth, category concentration, and latest price setup.", {
    badge: "Catalog control",
    heroTone: "violet",
    kpis: [
      { label: "Products", value: formatNumber(totalProducts), note: "Catalog size" },
      { label: "New in period", value: formatNumber(currentNew), note: currentLabel },
      { label: "Top category", value: categoryAgg[0]?._id || "—", note: categoryAgg[0] ? `${formatNumber(categoryAgg[0].count)} items` : "No categories" },
      { label: "Latest price", value: recentProducts[0] ? formatCurrency(recentProducts[0].retailPrice) : "—", note: recentProducts[0]?.name || "No products" },
    ],
    comparison: compareBlock(currentNew, previousNew, currentLabel, previousLabel),
    alerts: [!currentNew ? `No new products were added in ${currentLabel.toLowerCase()}.` : ""],
    insights: [categoryAgg[0]?._id ? `${categoryAgg[0]._id} is the biggest product category.` : ""],
    tables: [
      table(
        "Category split",
        [{ key: "category", label: "Category" }, { key: "count", label: "Products" }],
        categoryAgg.map((row) => ({ category: row._id, count: formatNumber(row.count) })),
        categoryAgg.length,
        "Most populated product categories."
      ),
      table(
        "Latest products",
        [
          { key: "name", label: "Product" },
          { key: "category", label: "Category" },
          { key: "retail", label: "Retail" },
          { key: "wholesale", label: "Wholesale" },
          { key: "createdAt", label: "Created" },
        ],
        recentProducts.map((row) => ({
          name: row.name || "—",
          category: row.category || "—",
          retail: formatCurrency(row.retailPrice),
          wholesale: formatCurrency(row.wholesalePrice),
          createdAt: formatDate(row.createdAt),
        })),
        totalProducts,
        "Latest product additions and configured prices."
      ),
    ],
  });
}

async function buildInventoryModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentMovementMatch = applyDateFilter({}, "createdAt", currentRange);
  const previousMovementMatch = applyDateFilter({}, "createdAt", previousRange);
  const currentSalesTxnMatch = scopedOrderQuery(
    models,
    scope,
    applyDateFilter({ transactionType: { $in: ORDER_TRANSACTION_TYPES } }, "transactionAt", currentRange)
  );
  const currentReturnTxnMatch = scopedOrderQuery(models, scope, applyDateFilter({ transactionType: "RETURN_STOCK" }, "transactionAt", currentRange));
  const now = new Date();
  const nearExpiryCutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [
    warehouses,
    currentMoves,
    previousMoves,
    movementTypeAgg,
    warehouseAgg,
    recentMoves,
    topDistributorAgg,
    mostReturnAgg,
    topBrandAgg,
    stockSummaryAgg,
    productMeta,
    nearExpiryRows,
    expiredRows,
    damageRows,
  ] = await Promise.all([
    models.WarehouseModel.countDocuments(),
    models.InventoryMovementModel.countDocuments(currentMovementMatch),
    models.InventoryMovementModel.countDocuments(previousMovementMatch),
    models.InventoryMovementModel.aggregate([
      { $match: currentMovementMatch },
      { $group: { _id: "$movementType", quantity: { $sum: "$quantity" }, count: { $sum: 1 } } },
      { $sort: { quantity: -1 } },
    ]),
    models.InventoryMovementModel.aggregate([
      { $match: currentMovementMatch },
      { $group: { _id: { $ifNull: ["$warehouseName", "Unknown"] }, quantity: { $sum: "$quantity" }, count: { $sum: 1 } } },
      { $sort: { quantity: -1 } },
      { $limit: 8 },
    ]),
    models.InventoryMovementModel.find(currentMovementMatch).sort({ createdAt: -1 }).limit(8).select("productName warehouseName movementType quantity createdAt").lean(),
    models.WarehouseTransactionModel.aggregate([
      { $match: currentSalesTxnMatch },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $ifNull: ["$distributorName", { $ifNull: ["$toEntityName", "Unknown"] }] },
          quantity: { $sum: { $ifNull: ["$items.totalPacks", 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 1 },
    ]),
    models.WarehouseTransactionModel.aggregate([
      { $match: currentReturnTxnMatch },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $ifNull: ["$distributorName", { $ifNull: ["$fromEntityName", "Unknown"] }] },
          quantity: { $sum: { $ifNull: ["$items.totalPacks", 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 1 },
    ]),
    models.WarehouseTransactionModel.aggregate([
      { $match: currentSalesTxnMatch },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $ifNull: ["$brandName", "Unknown"] },
          quantity: { $sum: { $ifNull: ["$items.totalPacks", 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 1 },
    ]),
    models.InventoryMovementModel.aggregate([
      {
        $group: {
          _id: { productId: "$productId", warehouseId: "$warehouseId" },
          productId: { $first: "$productId" },
          productName: { $first: "$productName" },
          warehouseId: { $first: "$warehouseId" },
          warehouseName: { $first: "$warehouseName" },
          quantity: { $sum: "$quantity" },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $match: { quantity: { $gt: 0 } } },
      { $sort: { quantity: 1, lastMovementAt: -1 } },
    ]),
    models.ProductModel.find({}).select("productId name minStockLevel").lean(),
    models.InventoryMovementModel.aggregate([
      {
        $match: {
          batchExpiryDate: { $gte: now, $lte: nearExpiryCutoff },
        },
      },
      {
        $group: {
          _id: {
            productId: "$productId",
            warehouseId: "$warehouseId",
            manufactureDate: "$batchManufactureDate",
            expiryDate: "$batchExpiryDate",
          },
          productName: { $first: "$productName" },
          warehouseName: { $first: "$warehouseName" },
          quantity: { $sum: "$quantity" },
        },
      },
      { $match: { quantity: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          warehouseId: "$_id.warehouseId",
          productName: 1,
          warehouseName: 1,
          quantity: 1,
          manufactureDate: "$_id.manufactureDate",
          expiryDate: "$_id.expiryDate",
        },
      },
      { $sort: { expiryDate: 1, quantity: -1 } },
    ]),
    models.InventoryMovementModel.aggregate([
      {
        $match: {
          batchExpiryDate: { $lt: now },
        },
      },
      {
        $group: {
          _id: {
            productId: "$productId",
            warehouseId: "$warehouseId",
            expiryDate: "$batchExpiryDate",
          },
          productName: { $first: "$productName" },
          warehouseName: { $first: "$warehouseName" },
          quantity: { $sum: "$quantity" },
        },
      },
      { $match: { quantity: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          warehouseId: "$_id.warehouseId",
          productName: 1,
          warehouseName: 1,
          quantity: 1,
          expiryDate: "$_id.expiryDate",
        },
      },
      { $sort: { expiryDate: 1, quantity: -1 } },
    ]),
    models.WarehouseTransactionModel.aggregate([
      { $match: applyDateFilter({ transactionType: "DAMAGE_STOCK" }, "transactionAt", currentRange) },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            transactionCode: "$transactionCode",
            transactionAt: "$transactionAt",
            warehouseName: "$warehouseName",
            productId: "$items.productId",
            productName: "$items.productName",
            expiryDate: "$items.expiryDate",
          },
          quantity: { $sum: { $ifNull: ["$items.totalPacks", 0] } },
          amount: { $sum: { $ifNull: ["$items.totalPrice", 0] } },
          note: { $first: "$note" },
        },
      },
      {
        $project: {
          _id: 0,
          transactionCode: "$_id.transactionCode",
          transactionAt: "$_id.transactionAt",
          warehouseName: "$_id.warehouseName",
          productId: "$_id.productId",
          productName: "$_id.productName",
          expiryDate: "$_id.expiryDate",
          quantity: 1,
          amount: 1,
          note: 1,
        },
      },
      { $sort: { transactionAt: -1 } },
    ]),
  ]);

  const productMetaMap = new Map(
    (productMeta || []).map((row) => [
      asText(row.productId),
      {
        name: row.name || row.productName || "—",
        minStockLevel: safeNumber(row.minStockLevel),
      },
    ])
  );

  const stockSummaryRows = (stockSummaryAgg || []).map((row) => {
    const productInfo = productMetaMap.get(asText(row.productId || row._id?.productId)) || {};
    const quantity = safeNumber(row.quantity);
    const minStockLevel = safeNumber(productInfo.minStockLevel);
    return {
      productId: row.productId || row._id?.productId || "",
      productName: row.productName || productInfo.name || "—",
      warehouseId: row.warehouseId || row._id?.warehouseId || "",
      warehouseName: row.warehouseName || "—",
      quantity,
      minStockLevel,
      shortage: Math.max(minStockLevel - quantity, 0),
      stockStatus: quantity <= 0 ? "Out of stock" : quantity <= minStockLevel ? "Low stock" : "Healthy",
      lastMovementAt: row.lastMovementAt,
    };
  });

  const productsWithoutStock = (productMeta || [])
    .filter((row) => safeNumber(row.minStockLevel) > 0)
    .filter((row) => !stockSummaryRows.some((stockRow) => asText(stockRow.productId) === asText(row.productId)))
    .map((row) => ({
      productId: row.productId || "",
      productName: row.name || "—",
      warehouseId: "",
      warehouseName: "Unassigned warehouse",
      quantity: 0,
      minStockLevel: safeNumber(row.minStockLevel),
      shortage: safeNumber(row.minStockLevel),
      stockStatus: "Out of stock",
      lastMovementAt: null,
    }));

  const lowStockRows = [...stockSummaryRows, ...productsWithoutStock]
    .filter((row) => row.quantity <= row.minStockLevel)
    .sort((a, b) => {
      if (b.shortage !== a.shortage) return b.shortage - a.shortage;
      if (a.quantity !== b.quantity) return a.quantity - b.quantity;
      return String(a.productName || "").localeCompare(String(b.productName || ""));
    });

  const totalOnHand = stockSummaryRows.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const nearExpiryQty = nearExpiryRows.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const expiredQty = expiredRows.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const damagedQty = damageRows.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const healthyCount = stockSummaryRows.filter((row) => row.stockStatus === "Healthy").length;
  const criticalLowStockCount = lowStockRows.filter((row) => row.quantity <= 0).length;

  const segments = [
    {
      key: "stock-summary",
      title: "Stock Summary Reports",
      description: "Current on-hand stock by product and warehouse with minimum stock benchmark visibility.",
      badge: "Stock position",
      kpis: [
        { label: "Active stock rows", value: formatNumber(stockSummaryRows.length), note: "Product and warehouse balances" },
        { label: "On hand qty", value: formatNumber(totalOnHand), note: "Current available quantity" },
        { label: "Healthy rows", value: formatNumber(healthyCount), note: "Above minimum stock" },
        { label: "Top shortage", value: lowStockRows[0]?.productName || "—", note: lowStockRows[0] ? `${formatNumber(lowStockRows[0].shortage)} units short` : "No shortage" },
      ],
      alerts: [lowStockRows.length ? `${formatNumber(lowStockRows.length)} stock rows are at or below minimum stock.` : ""],
      insights: [stockSummaryRows[0]?.warehouseName ? `${stockSummaryRows[0].warehouseName} has the most urgent low-balance stock rows.` : ""],
      tables: [
        table(
          "Current stock summary",
          [
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "quantity", label: "On hand" },
            { key: "minStockLevel", label: "Min stock" },
            { key: "shortage", label: "Shortage" },
            { key: "stockStatus", label: "Status" },
            { key: "lastMovementAt", label: "Last movement" },
          ],
          stockSummaryRows.slice(0, 15).map((row) => ({
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            quantity: formatNumber(row.quantity),
            minStockLevel: formatNumber(row.minStockLevel),
            shortage: formatNumber(row.shortage),
            stockStatus: row.stockStatus,
            lastMovementAt: formatDate(row.lastMovementAt),
          })),
          stockSummaryRows.length,
          "Live stock balance after combining all inventory movements."
        ),
      ],
    },
    {
      key: "low-stock-alerts",
      title: "Low Stock Alerts Reports",
      description: "Products that already reached or dropped below their configured minimum stock level.",
      badge: "Alert queue",
      kpis: [
        { label: "Low stock rows", value: formatNumber(lowStockRows.length), note: "Need replenishment" },
        { label: "Zero stock", value: formatNumber(criticalLowStockCount), note: "Immediate action" },
        { label: "Min stock coverage", value: formatPercent(stockSummaryRows.length ? ((stockSummaryRows.length - lowStockRows.length) / stockSummaryRows.length) * 100 : 100), note: "Healthy coverage" },
        { label: "Worst product", value: lowStockRows[0]?.productName || "—", note: lowStockRows[0] ? `${formatNumber(lowStockRows[0].quantity)} on hand` : "No alert" },
      ],
      alerts: [criticalLowStockCount ? `${formatNumber(criticalLowStockCount)} rows already have zero stock.` : ""],
      insights: [lowStockRows[0]?.warehouseName ? `${lowStockRows[0].warehouseName} needs the first replenishment review.` : ""],
      tables: [
        table(
          "Low stock alerts",
          [
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "quantity", label: "On hand" },
            { key: "minStockLevel", label: "Min stock" },
            { key: "shortage", label: "Shortage" },
            { key: "stockStatus", label: "Priority" },
          ],
          lowStockRows.slice(0, 15).map((row) => ({
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            quantity: formatNumber(row.quantity),
            minStockLevel: formatNumber(row.minStockLevel),
            shortage: formatNumber(row.shortage),
            stockStatus: row.quantity <= 0 ? "Critical" : "Reorder now",
          })),
          lowStockRows.length,
          "Products below minimum stock threshold."
        ),
      ],
    },
    {
      key: "near-expiry-products",
      title: "Near to Expire Product Reports",
      description: "Positive stock batches expiring within the next 90 days so teams can rotate or return them in time.",
      badge: "Expiry watch",
      kpis: [
        { label: "Expiring batches", value: formatNumber(nearExpiryRows.length), note: "Next 90 days" },
        { label: "Expiring qty", value: formatNumber(nearExpiryQty), note: "Units at risk" },
        { label: "Nearest expiry", value: nearExpiryRows[0]?.expiryDate ? formatDate(nearExpiryRows[0].expiryDate) : "—", note: nearExpiryRows[0]?.productName || "No near expiry" },
        { label: "Warehouses impacted", value: formatNumber(uniq(nearExpiryRows.map((row) => row.warehouseName)).length), note: "Need stock rotation" },
      ],
      alerts: [nearExpiryRows.length ? `${formatNumber(nearExpiryRows.length)} batches will expire within 90 days.` : ""],
      insights: [nearExpiryRows[0]?.warehouseName ? `${nearExpiryRows[0].warehouseName} has the closest batch expiry to review.` : ""],
      tables: [
        table(
          "Near expiry products",
          [
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "quantity", label: "Qty" },
            { key: "manufactureDate", label: "Manufacture" },
            { key: "expiryDate", label: "Expiry" },
          ],
          nearExpiryRows.slice(0, 15).map((row) => ({
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            quantity: formatNumber(row.quantity),
            manufactureDate: formatDate(row.manufactureDate),
            expiryDate: formatDate(row.expiryDate),
          })),
          nearExpiryRows.length,
          "Batches that should be sold, returned, or rotated before expiry."
        ),
      ],
    },
    {
      key: "damage-expired-products",
      title: "Damage or Expire Products Reports",
      description: "Tracks damaged stock transactions in the selected period and any already expired stock still remaining on hand.",
      badge: "Loss control",
      kpis: [
        { label: "Damage rows", value: formatNumber(damageRows.length), note: currentLabel },
        { label: "Damage qty", value: formatNumber(damagedQty), note: "Damaged in period" },
        { label: "Expired rows", value: formatNumber(expiredRows.length), note: "Still on hand" },
        { label: "Expired qty", value: formatNumber(expiredQty), note: "Must clear urgently" },
      ],
      alerts: [expiredRows.length ? `${formatNumber(expiredRows.length)} expired stock rows are still available in inventory.` : ""],
      insights: [damageRows[0]?.warehouseName ? `${damageRows[0].warehouseName} recorded the latest damage activity.` : ""],
      tables: [
        table(
          "Damage stock transactions",
          [
            { key: "transactionCode", label: "Txn #" },
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "quantity", label: "Qty" },
            { key: "amount", label: "Amount" },
            { key: "expiryDate", label: "Expiry" },
            { key: "transactionAt", label: "Date" },
          ],
          damageRows.slice(0, 12).map((row) => ({
            transactionCode: row.transactionCode || "—",
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            quantity: formatNumber(row.quantity),
            amount: formatCurrency(row.amount),
            expiryDate: formatDate(row.expiryDate),
            transactionAt: formatDate(row.transactionAt),
          })),
          damageRows.length,
          "Damage stock ledger entries recorded in the selected period."
        ),
        table(
          "Expired products still on hand",
          [
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "quantity", label: "Qty" },
            { key: "expiryDate", label: "Expiry" },
          ],
          expiredRows.slice(0, 12).map((row) => ({
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            quantity: formatNumber(row.quantity),
            expiryDate: formatDate(row.expiryDate),
          })),
          expiredRows.length,
          "Expired stock that still remains in inventory and needs immediate disposal or return."
        ),
      ],
    },
    {
      key: "stock-movements",
      title: "Stock Movements",
      description: "Movement mix, warehouse activity, and latest stock transactions for the selected period.",
      badge: "Movement flow",
      kpis: [
        { label: "Moves in period", value: formatNumber(currentMoves), note: currentLabel },
        { label: "Top warehouse", value: warehouseAgg[0]?._id || "—", note: warehouseAgg[0] ? `${formatNumber(warehouseAgg[0].quantity)} units` : "No warehouse activity" },
        { label: "Top brand", value: topBrandAgg[0]?._id || "—", note: topBrandAgg[0] ? `${formatNumber(topBrandAgg[0].quantity)} units sold` : "No brand sales" },
        { label: "Top distributor", value: topDistributorAgg[0]?._id || "—", note: topDistributorAgg[0] ? `${formatNumber(topDistributorAgg[0].quantity)} units issued` : "No sale stock" },
      ],
      alerts: [!currentMoves ? `No inventory movements recorded in ${currentLabel.toLowerCase()}.` : ""],
      insights: [warehouseAgg[0]?._id ? `${warehouseAgg[0]._id} handled the highest stock volume.` : ""],
      tables: [
        table(
          "Movement mix",
          [{ key: "type", label: "Movement type" }, { key: "count", label: "Rows" }, { key: "quantity", label: "Quantity" }],
          movementTypeAgg.map((row) => ({ type: titleCase(row._id), count: formatNumber(row.count), quantity: formatNumber(row.quantity) })),
          movementTypeAgg.length,
          "Breakdown of inventory events by movement type."
        ),
        table(
          "Warehouse activity",
          [{ key: "warehouse", label: "Warehouse" }, { key: "count", label: "Rows" }, { key: "quantity", label: "Quantity" }],
          warehouseAgg.map((row) => ({ warehouse: row._id, count: formatNumber(row.count), quantity: formatNumber(row.quantity) })),
          warehouseAgg.length,
          "Warehouses with the largest movement load."
        ),
        table(
          "Recent stock movements",
          [
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "movementType", label: "Type" },
            { key: "quantity", label: "Quantity" },
            { key: "createdAt", label: "Created" },
          ],
          recentMoves.map((row) => ({
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            movementType: titleCase(row.movementType),
            quantity: formatNumber(row.quantity),
            createdAt: formatDate(row.createdAt),
          })),
          currentMoves,
          "Latest stock movement lines for warehouse review."
        ),
      ],
    },
  ];

  return moduleCard("inventory", "Warehouse & Inventory", "Stock movements, stock health, low stock alerts, expiry risk, and damage visibility for the selected period.", {
    badge: "Stock intelligence",
    heroTone: "blue",
    kpis: [
      { label: "Warehouses", value: formatNumber(warehouses), note: "Available storage points" },
      { label: "On hand qty", value: formatNumber(totalOnHand), note: "Current live balance" },
      { label: "Low stock alerts", value: formatNumber(lowStockRows.length), note: "Need replenishment" },
      { label: "Near expiry qty", value: formatNumber(nearExpiryQty), note: "Next 90 days" },
      { label: "Damage + expired", value: formatNumber(damagedQty + expiredQty), note: "Loss control qty" },
    ],
    comparison: compareBlock(currentMoves, previousMoves, currentLabel, previousLabel),
    alerts: [
      !currentMoves ? `No inventory movements recorded in ${currentLabel.toLowerCase()}.` : "",
      lowStockRows.length ? `${formatNumber(lowStockRows.length)} stock rows require replenishment attention.` : "",
      expiredRows.length ? `${formatNumber(expiredRows.length)} expired stock rows are still on hand.` : "",
    ],
    insights: [
      warehouseAgg[0]?._id ? `${warehouseAgg[0]._id} handled the highest stock volume.` : "",
      topDistributorAgg[0]?._id ? `${topDistributorAgg[0]._id} received the highest product volume from warehouses.` : "",
      mostReturnAgg[0]?._id ? `${mostReturnAgg[0]._id} generated the highest return volume back to warehouses.` : "",
      topBrandAgg[0]?._id ? `${topBrandAgg[0]._id} is the top-selling brand in warehouse dispatch.` : "",
    ],
    segments,
  });
}


async function buildTerritoryModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const [regions, zones, territories, fields, currentNewFields, previousNewFields, coverageAgg] = await Promise.all([
    models.RegionModel.countDocuments(),
    models.ZoneModel.countDocuments(),
    models.AreaModel.countDocuments(),
    models.FieldModel.countDocuments(),
    models.FieldModel.countDocuments(applyDateFilter({}, "createdAt", currentRange)),
    models.FieldModel.countDocuments(applyDateFilter({}, "createdAt", previousRange)),
    models.UserModel.aggregate([
      { $group: { _id: { territory: { $ifNull: ["$territoryName", "Unassigned"] }, role: { $ifNull: ["$role", "Unknown"] } }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  return moduleCard("territory", "Territory & Assets", "Geographic coverage, field expansion, and team density across markets.", {
    badge: "Market coverage",
    heroTone: "sky",
    kpis: [
      { label: "Regions", value: formatNumber(regions), note: `${formatNumber(zones)} zones` },
      { label: "Territories", value: formatNumber(territories), note: `${formatNumber(fields)} fields` },
      { label: "New fields", value: formatNumber(currentNewFields), note: currentLabel },
      { label: "Coverage hotspot", value: coverageAgg[0]?._id?.territory || "—", note: coverageAgg[0] ? `${formatNumber(coverageAgg[0].count)} users` : "No users" },
    ],
    comparison: compareBlock(currentNewFields, previousNewFields, currentLabel, previousLabel),
    alerts: [!territories ? "No territories have been configured yet." : ""],
    insights: [coverageAgg[0]?._id?.territory ? `${coverageAgg[0]._id.territory} has the highest user density.` : ""],
    tables: [
      table(
        "Coverage hotspots",
        [{ key: "territory", label: "Territory" }, { key: "role", label: "Role" }, { key: "count", label: "Users" }],
        coverageAgg.map((row) => ({ territory: row._id.territory, role: titleCase(row._id.role), count: formatNumber(row.count) })),
        coverageAgg.length,
        "Territory and role combinations with the highest assigned user count."
      ),
    ],
  });
}

async function buildSalesModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentMatch = scopedSalesOrderQuery(models, scope, applyDateFilter({}, "orderDate", currentRange));
  const previousMatch = scopedSalesOrderQuery(models, scope, applyDateFilter({}, "orderDate", previousRange));
  const primaryMatch = scopedSalesOrderQuery(models, scope, applyDateFilter({ saleType: "primary" }, "orderDate", currentRange));
  const secondaryMatch = scopedSalesOrderQuery(models, scope, applyDateFilter({ saleType: "secondary" }, "orderDate", currentRange));
  const primaryPreviousMatch = scopedSalesOrderQuery(models, scope, applyDateFilter({ saleType: "primary" }, "orderDate", previousRange));
  const secondaryPreviousMatch = scopedSalesOrderQuery(models, scope, applyDateFilter({ saleType: "secondary" }, "orderDate", previousRange));
  const primaryTxnCurrentMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), ...sourceRoleFilter(PRIMARY_SOURCE_ROLES) }, "transactionAt", currentRange));
  const primaryTxnPreviousMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), ...sourceRoleFilter(PRIMARY_SOURCE_ROLES) }, "transactionAt", previousRange));
  const secondaryTxnCurrentMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), ...sourceRoleFilter(SECONDARY_SOURCE_ROLES) }, "transactionAt", currentRange));
  const secondaryTxnPreviousMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), ...sourceRoleFilter(SECONDARY_SOURCE_ROLES) }, "transactionAt", previousRange));
  const returnTxnCurrentMatch = scopedOrderQuery(models, scope, applyDateFilter({ transactionType: "RETURN_STOCK" }, "transactionAt", currentRange));

  const scopedSalesOrders = scope.isDistributor
    ? await models.SalesOrderModel.find(scopedSalesOrderQuery(models, scope, {})).select("_id orderNo").limit(5000).lean()
    : [];
  const claimBase = scope.isDistributor
    ? (scopedSalesOrders.length
        ? addOrScope({}, [
            { orderId: { $in: scopedSalesOrders.map((row) => row._id).filter(Boolean) } },
            { orderNo: { $in: scopedSalesOrders.map((row) => row.orderNo).filter(Boolean) } },
          ])
        : { _id: null })
    : {};
  const currentClaimsMatch = applyDateFilter(claimBase, "createdAt", currentRange);
  const previousClaimsMatch = applyDateFilter(claimBase, "createdAt", previousRange);

  const [
    currentOrders,
    previousOrders,
    currentSalesAgg,
    previousSalesAgg,
    statusAgg,
    territoryAgg,
    recentOrders,
    primaryCurrentCount,
    primaryPreviousCount,
    primaryStatusAgg,
    primaryRecentOrders,
    secondaryCurrentCount,
    secondaryPreviousCount,
    secondaryStatusAgg,
    secondaryRecentOrders,
    returnCurrentCount,
    returnPreviousCount,
    returnStatusAgg,
    returnRecentClaims,
    currentOrderTxnCount,
    primaryTxnCount,
    primaryTxnPreviousCount,
    primaryTxnStatusAgg,
    primaryRecentTxns,
    primaryTxnCodes,
    secondaryTxnCount,
    secondaryTxnPreviousCount,
    secondaryTxnStatusAgg,
    secondaryRecentTxns,
    secondaryTxnCodes,
    returnTxnCount,
    returnRecentTxns,
    returnTxnCodes,
  ] = await Promise.all([
    models.SalesOrderModel.countDocuments(currentMatch),
    models.SalesOrderModel.countDocuments(previousMatch),
    models.SalesOrderModel.aggregate([{ $match: currentMatch }, { $group: { _id: null, total: { $sum: "$totalAmount" }, units: { $sum: { $sum: "$items.quantity" } } } }]),
    models.SalesOrderModel.aggregate([{ $match: previousMatch }, { $group: { _id: null, total: { $sum: "$totalAmount" }, units: { $sum: { $sum: "$items.quantity" } } } }]),
    models.SalesOrderModel.aggregate([{ $match: currentMatch }, { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } }, { $sort: { count: -1 } }]),
    models.SalesOrderModel.aggregate([{ $match: currentMatch }, { $group: { _id: { $ifNull: ["$territoryName", "Unassigned"] }, count: { $sum: 1 }, total: { $sum: "$totalAmount" } } }, { $sort: { total: -1 } }, { $limit: 8 }]),
    models.SalesOrderModel.find(currentMatch).sort({ orderDate: -1, createdAt: -1 }).limit(8).select("orderNo customerName territoryName status totalAmount saleType sourceType orderDate").lean(),
    models.SalesOrderModel.countDocuments(primaryMatch),
    models.SalesOrderModel.countDocuments(primaryPreviousMatch),
    models.SalesOrderModel.aggregate([{ $match: primaryMatch }, { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } }, { $sort: { count: -1 } }]),
    models.SalesOrderModel.find(primaryMatch).sort({ orderDate: -1, createdAt: -1 }).limit(8).select("orderNo customerName territoryName status totalAmount orderDate sourceType").lean(),
    models.SalesOrderModel.countDocuments(secondaryMatch),
    models.SalesOrderModel.countDocuments(secondaryPreviousMatch),
    models.SalesOrderModel.aggregate([{ $match: secondaryMatch }, { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } }, { $sort: { count: -1 } }]),
    models.SalesOrderModel.find(secondaryMatch).sort({ orderDate: -1, createdAt: -1 }).limit(8).select("orderNo customerName territoryName status totalAmount orderDate sourceType").lean(),
    models.ReturnClaimModel.countDocuments(currentClaimsMatch),
    models.ReturnClaimModel.countDocuments(previousClaimsMatch),
    models.ReturnClaimModel.aggregate([{ $match: currentClaimsMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    models.ReturnClaimModel.find(currentClaimsMatch).sort({ createdAt: -1 }).limit(8).select("orderNo customerName reason status quantity createdAt").lean(),
    models.WarehouseTransactionModel.countDocuments(scopedOrderQuery(models, scope, applyDateFilter(orderTransactionFilter(), "transactionAt", currentRange))),
    models.WarehouseTransactionModel.countDocuments(primaryTxnCurrentMatch),
    models.WarehouseTransactionModel.countDocuments(primaryTxnPreviousMatch),
    models.WarehouseTransactionModel.aggregate([
      { $match: primaryTxnCurrentMatch },
      {
        $group: {
          _id: "$requestStatus",
          count: { $sum: 1 },
          total: { $sum: "$grandTotal" },
          quantity: { $sum: sumTransactionItemsExpression() },
        },
      },
      { $sort: { count: -1 } },
    ]),
    models.WarehouseTransactionModel.find(primaryTxnCurrentMatch).sort({ transactionAt: -1, createdAt: -1 }).limit(8).select("transactionCode transactionType requestSourceRole fromEntityType toEntityName warehouseName requestStatus grandTotal transactionAt items").lean(),
    models.WarehouseTransactionModel.find(primaryTxnCurrentMatch).select("transactionCode").limit(5000).lean(),
    models.WarehouseTransactionModel.countDocuments(secondaryTxnCurrentMatch),
    models.WarehouseTransactionModel.countDocuments(secondaryTxnPreviousMatch),
    models.WarehouseTransactionModel.aggregate([
      { $match: secondaryTxnCurrentMatch },
      {
        $group: {
          _id: "$requestStatus",
          count: { $sum: 1 },
          total: { $sum: "$grandTotal" },
          quantity: { $sum: sumTransactionItemsExpression() },
        },
      },
      { $sort: { count: -1 } },
    ]),
    models.WarehouseTransactionModel.find(secondaryTxnCurrentMatch).sort({ transactionAt: -1, createdAt: -1 }).limit(8).select("transactionCode transactionType requestSourceRole fromEntityType toEntityName warehouseName requestStatus grandTotal transactionAt items").lean(),
    models.WarehouseTransactionModel.find(secondaryTxnCurrentMatch).select("transactionCode").limit(5000).lean(),
    models.WarehouseTransactionModel.countDocuments(returnTxnCurrentMatch),
    models.WarehouseTransactionModel.find(returnTxnCurrentMatch).sort({ transactionAt: -1, createdAt: -1 }).limit(8).select("transactionCode fromEntityName fromEntityType warehouseName requestStatus grandTotal transactionAt items").lean(),
    models.WarehouseTransactionModel.find(returnTxnCurrentMatch).select("transactionCode").limit(5000).lean(),
  ]);

  const primaryReferenceIds = primaryTxnCodes.map((row) => row.transactionCode).filter(Boolean);
  const secondaryReferenceIds = secondaryTxnCodes.map((row) => row.transactionCode).filter(Boolean);
  const returnReferenceIds = returnTxnCodes.map((row) => row.transactionCode).filter(Boolean);

  const [
    primaryMovementAgg,
    primaryRecentMoves,
    secondaryMovementAgg,
    secondaryRecentMoves,
    returnMovementAgg,
    returnRecentMoves,
  ] = await Promise.all([
    primaryReferenceIds.length
      ? models.InventoryMovementModel.aggregate([
          { $match: { referenceId: { $in: primaryReferenceIds } } },
          { $group: { _id: "$movementType", count: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
          { $sort: { quantity: -1 } },
        ])
      : [],
    primaryReferenceIds.length
      ? models.InventoryMovementModel.find({ referenceId: { $in: primaryReferenceIds } }).sort({ createdAt: -1 }).limit(8).select("referenceId productName warehouseName movementType quantity createdAt").lean()
      : [],
    secondaryReferenceIds.length
      ? models.InventoryMovementModel.aggregate([
          { $match: { referenceId: { $in: secondaryReferenceIds } } },
          { $group: { _id: "$movementType", count: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
          { $sort: { quantity: -1 } },
        ])
      : [],
    secondaryReferenceIds.length
      ? models.InventoryMovementModel.find({ referenceId: { $in: secondaryReferenceIds } }).sort({ createdAt: -1 }).limit(8).select("referenceId productName warehouseName movementType quantity createdAt").lean()
      : [],
    returnReferenceIds.length
      ? models.InventoryMovementModel.aggregate([
          { $match: { referenceId: { $in: returnReferenceIds } } },
          { $group: { _id: "$movementType", count: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
          { $sort: { quantity: -1 } },
        ])
      : [],
    returnReferenceIds.length
      ? models.InventoryMovementModel.find({ referenceId: { $in: returnReferenceIds } }).sort({ createdAt: -1 }).limit(8).select("referenceId productName warehouseName movementType quantity createdAt").lean()
      : [],
  ]);

  const currentRevenue = safeNumber(currentSalesAgg?.[0]?.total);
  const previousRevenue = safeNumber(previousSalesAgg?.[0]?.total);
  const currentUnits = safeNumber(currentSalesAgg?.[0]?.units);
  const pendingOrders = statusAgg.find((row) => String(row._id || "").toLowerCase() === "pending")?.count || 0;
  const topTerritory = territoryAgg[0]?._id || "—";
  const primaryMovementCount = primaryMovementAgg.reduce((sum, row) => sum + safeNumber(row.count), 0);
  const primaryMovementQty = primaryMovementAgg.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const secondaryMovementCount = secondaryMovementAgg.reduce((sum, row) => sum + safeNumber(row.count), 0);
  const secondaryMovementQty = secondaryMovementAgg.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const returnMovementCount = returnMovementAgg.reduce((sum, row) => sum + safeNumber(row.count), 0);
  const returnMovementQty = returnMovementAgg.reduce((sum, row) => sum + safeNumber(row.quantity), 0);

  const segments = [
    {
      key: "primary-orders",
      title: "Primary Orders",
      description: "Primary order requests, order value, and linked warehouse-side inventory movements.",
      badge: "Primary flow",
      kpis: [
        { label: "Orders", value: formatNumber(primaryCurrentCount), note: currentLabel },
        { label: "Pending", value: formatNumber(primaryStatusAgg.find((row) => String(row._id || "").toLowerCase() === "pending")?.count), note: "Need approval" },
        { label: "Approved value", value: formatCurrency(primaryStatusAgg.find((row) => String(row._id || "").toLowerCase() === "approved")?.total), note: "Approved total" },
        { label: "Order moves", value: formatNumber(primaryTxnCount), note: "Warehouse transaction rows" },
        { label: "Inventory moves", value: formatNumber(primaryMovementCount), note: `${formatNumber(primaryMovementQty)} units moved` },
      ],
      alerts: [
        primaryStatusAgg.find((row) => String(row._id || "").toLowerCase() === "pending")?.count ? "Primary orders are waiting for approval action." : "",
        primaryTxnCount && !primaryMovementCount ? "Primary order transactions exist, but linked inventory movement rows are still missing." : "",
      ],
      insights: [
        primaryCurrentCount ? "Primary order flow can now be matched against warehouse inventory execution." : "No primary order activity found in this period.",
      ],
      tables: [
        table(
          "Primary order status performance",
          [{ key: "status", label: "Status" }, { key: "count", label: "Orders" }, { key: "total", label: "Order value" }],
          primaryStatusAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
          primaryStatusAgg.length,
          "Primary order pipeline health by status."
        ),
        table(
          "Recent primary orders",
          [
            { key: "orderNo", label: "Order #" },
            { key: "customerName", label: "Customer" },
            { key: "territoryName", label: "Territory" },
            { key: "sourceType", label: "Source" },
            { key: "status", label: "Status" },
            { key: "totalAmount", label: "Amount" },
            { key: "createdAt", label: "Created" },
          ],
          primaryRecentOrders.map((row) => ({
            orderNo: row.orderNo || "—",
            customerName: row.customerName || "—",
            territoryName: row.territoryName || "—",
            sourceType: titleCase(row.sourceType || "brand"),
            status: titleCase(row.status),
            totalAmount: formatCurrency(row.totalAmount),
            createdAt: formatDate(row.orderDate || row.createdAt),
          })),
          primaryCurrentCount,
          "Latest primary orders captured in the current scope."
        ),
        table(
          "Primary warehouse order movements",
          [
            { key: "transactionCode", label: "Txn #" },
            { key: "source", label: "Source" },
            { key: "customerName", label: "To entity" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "status", label: "Status" },
            { key: "quantity", label: "Qty" },
            { key: "amount", label: "Amount" },
            { key: "createdAt", label: "Created" },
          ],
          primaryRecentTxns.map((row) => ({
            transactionCode: row.transactionCode || "—",
            source: titleCase(row.requestSourceRole || row.fromEntityType || "—"),
            customerName: row.toEntityName || "—",
            warehouseName: row.warehouseName || "—",
            status: titleCase(row.requestStatus),
            quantity: formatNumber((row.items || []).reduce((sum, item) => sum + safeNumber(item.totalPacks || item.quantity), 0)),
            amount: formatCurrency(row.grandTotal),
            createdAt: formatDate(row.transactionAt),
          })),
          primaryTxnCount,
          "Warehouse transaction records linked to primary order movement."
        ),
        table(
          "Primary inventory movement lines",
          [
            { key: "referenceId", label: "Txn #" },
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "movementType", label: "Movement" },
            { key: "quantity", label: "Qty" },
            { key: "createdAt", label: "Created" },
          ],
          primaryRecentMoves.map((row) => ({
            referenceId: row.referenceId || "—",
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            movementType: titleCase(row.movementType),
            quantity: formatNumber(row.quantity),
            createdAt: formatDate(row.createdAt),
          })),
          primaryMovementCount,
          "Inventory movement rows generated from primary order transactions."
        ),
      ],
    },
    {
      key: "secondary-orders",
      title: "Secondary Orders",
      description: "Secondary order performance with customer-side orders and linked warehouse inventory movements.",
      badge: "Secondary flow",
      kpis: [
        { label: "Orders", value: formatNumber(secondaryCurrentCount), note: currentLabel },
        { label: "Pending", value: formatNumber(secondaryStatusAgg.find((row) => String(row._id || "").toLowerCase() === "pending")?.count), note: "Pipeline backlog" },
        { label: "Delivered value", value: formatCurrency(secondaryStatusAgg.find((row) => String(row._id || "").toLowerCase() === "delivered")?.total), note: "Delivered total" },
        { label: "Order moves", value: formatNumber(secondaryTxnCount), note: "Warehouse transaction rows" },
        { label: "Inventory moves", value: formatNumber(secondaryMovementCount), note: `${formatNumber(secondaryMovementQty)} units moved` },
      ],
      alerts: [
        secondaryStatusAgg.find((row) => String(row._id || "").toLowerCase() === "pending")?.count > 10 ? "Secondary order backlog is high and needs action." : "",
        secondaryTxnCount && !secondaryMovementCount ? "Secondary order transactions exist, but linked inventory movement rows are still missing." : "",
      ],
      insights: [topTerritory !== "—" ? `${topTerritory} is leading the current secondary order movement.` : "Territory performance will appear when order volume is available."],
      tables: [
        table(
          "Secondary order status performance",
          [{ key: "status", label: "Status" }, { key: "count", label: "Orders" }, { key: "total", label: "Order value" }],
          secondaryStatusAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
          secondaryStatusAgg.length,
          "Secondary order pipeline health by status."
        ),
        table(
          "Recent secondary orders",
          [
            { key: "orderNo", label: "Order #" },
            { key: "customerName", label: "Customer" },
            { key: "territoryName", label: "Territory" },
            { key: "sourceType", label: "Source" },
            { key: "status", label: "Status" },
            { key: "totalAmount", label: "Amount" },
            { key: "createdAt", label: "Created" },
          ],
          secondaryRecentOrders.map((row) => ({
            orderNo: row.orderNo || "—",
            customerName: row.customerName || "—",
            territoryName: row.territoryName || "—",
            sourceType: titleCase(row.sourceType || "customer"),
            status: titleCase(row.status),
            totalAmount: formatCurrency(row.totalAmount),
            createdAt: formatDate(row.orderDate || row.createdAt),
          })),
          secondaryCurrentCount,
          "Latest secondary orders captured in the current scope."
        ),
        table(
          "Secondary warehouse order movements",
          [
            { key: "transactionCode", label: "Txn #" },
            { key: "source", label: "Source" },
            { key: "customerName", label: "To entity" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "status", label: "Status" },
            { key: "quantity", label: "Qty" },
            { key: "amount", label: "Amount" },
            { key: "createdAt", label: "Created" },
          ],
          secondaryRecentTxns.map((row) => ({
            transactionCode: row.transactionCode || "—",
            source: titleCase(row.requestSourceRole || row.fromEntityType || "—"),
            customerName: row.toEntityName || "—",
            warehouseName: row.warehouseName || "—",
            status: titleCase(row.requestStatus),
            quantity: formatNumber((row.items || []).reduce((sum, item) => sum + safeNumber(item.totalPacks || item.quantity), 0)),
            amount: formatCurrency(row.grandTotal),
            createdAt: formatDate(row.transactionAt),
          })),
          secondaryTxnCount,
          "Warehouse transaction rows linked to customer, order booker, or order-management order flow."
        ),
        table(
          "Secondary inventory movement lines",
          [
            { key: "referenceId", label: "Txn #" },
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "movementType", label: "Movement" },
            { key: "quantity", label: "Qty" },
            { key: "createdAt", label: "Created" },
          ],
          secondaryRecentMoves.map((row) => ({
            referenceId: row.referenceId || "—",
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            movementType: titleCase(row.movementType),
            quantity: formatNumber(row.quantity),
            createdAt: formatDate(row.createdAt),
          })),
          secondaryMovementCount,
          "Inventory movement rows generated from secondary warehouse transactions."
        ),
      ],
    },
    {
      key: "return-stock-orders",
      title: "Return Stock Orders",
      description: "Return stock pressure, claim resolution pace, and linked warehouse return movements.",
      badge: "Return flow",
      kpis: [
        { label: "Claims", value: formatNumber(returnCurrentCount), note: currentLabel },
        { label: "Requested", value: formatNumber(returnStatusAgg.find((row) => row._id === "requested")?.count), note: "Need review" },
        { label: "Resolved", value: formatNumber(returnStatusAgg.find((row) => row._id === "resolved")?.count), note: "Closed loop" },
        { label: "Return txns", value: formatNumber(returnTxnCount), note: "Warehouse-side requests" },
        { label: "Inventory moves", value: formatNumber(returnMovementCount), note: `${formatNumber(returnMovementQty)} units moved` },
      ],
      alerts: [
        returnStatusAgg.find((row) => row._id === "requested")?.count ? "Return stock claims are waiting for review or approval." : "",
        returnTxnCount && !returnMovementCount ? "Return stock transactions exist, but linked inventory movement rows are still missing." : "",
      ],
      insights: [returnCurrentCount ? "Return stock analysis can help reduce repeat damage and delivery issues." : "No return stock claims found in this period."],
      tables: [
        table(
          "Return stock status mix",
          [{ key: "status", label: "Status" }, { key: "count", label: "Claims" }],
          returnStatusAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count) })),
          returnStatusAgg.length,
          "Return stock claim lifecycle visibility."
        ),
        table(
          "Recent return stock claims",
          [
            { key: "orderNo", label: "Order #" },
            { key: "customerName", label: "Customer" },
            { key: "reason", label: "Reason" },
            { key: "status", label: "Status" },
            { key: "quantity", label: "Qty" },
            { key: "createdAt", label: "Created" },
          ],
          returnRecentClaims.map((row) => ({
            orderNo: row.orderNo || "—",
            customerName: row.customerName || "—",
            reason: row.reason || "—",
            status: titleCase(row.status),
            quantity: formatNumber(row.quantity),
            createdAt: formatDate(row.createdAt),
          })),
          returnCurrentCount,
          "Latest return stock claims that need monitoring."
        ),
        table(
          "Return stock warehouse transactions",
          [
            { key: "transactionCode", label: "Txn #" },
            { key: "source", label: "Source" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "status", label: "Status" },
            { key: "quantity", label: "Qty" },
            { key: "amount", label: "Amount" },
            { key: "createdAt", label: "Created" },
          ],
          returnRecentTxns.map((row) => ({
            transactionCode: row.transactionCode || "—",
            source: titleCase(row.fromEntityType || row.fromEntityName || "—"),
            warehouseName: row.warehouseName || "—",
            status: titleCase(row.requestStatus),
            quantity: formatNumber((row.items || []).reduce((sum, item) => sum + safeNumber(item.totalPacks || item.quantity), 0)),
            amount: formatCurrency(row.grandTotal),
            createdAt: formatDate(row.transactionAt),
          })),
          returnTxnCount,
          "Warehouse return transactions related to return stock flow."
        ),
        table(
          "Return stock inventory movement lines",
          [
            { key: "referenceId", label: "Txn #" },
            { key: "productName", label: "Product" },
            { key: "warehouseName", label: "Warehouse" },
            { key: "movementType", label: "Movement" },
            { key: "quantity", label: "Qty" },
            { key: "createdAt", label: "Created" },
          ],
          returnRecentMoves.map((row) => ({
            referenceId: row.referenceId || "—",
            productName: row.productName || "—",
            warehouseName: row.warehouseName || "—",
            movementType: titleCase(row.movementType),
            quantity: formatNumber(row.quantity),
            createdAt: formatDate(row.createdAt),
          })),
          returnMovementCount,
          "Inventory movement rows generated from return stock transactions."
        ),
      ],
    },
  ];

  return moduleCard(scope.isDistributor ? "orders" : "sales", "Order Management", "Primary orders, secondary orders, return stock, and linked inventory movement visibility for stronger business control.", {
    badge: scope.isDistributor ? "Territory orders" : "Sales performance",
    heroTone: "emerald",
    kpis: [
      { label: "Orders", value: formatNumber(currentOrders), note: currentLabel },
      { label: "Sales value", value: formatCurrency(currentRevenue), note: currentLabel },
      { label: "Units ordered", value: formatNumber(currentUnits), note: "Line item volume" },
      { label: "Top territory", value: topTerritory, note: territoryAgg[0] ? formatCurrency(territoryAgg[0].total) : "No sales" },
      { label: "Order moves", value: formatNumber(currentOrderTxnCount), note: "Warehouse-side transactions" },
    ],
    comparison: compareBlock(currentRevenue, previousRevenue, currentLabel, previousLabel),
    alerts: [
      pendingOrders > 10 ? "There is a high backlog of pending orders that needs action." : "",
      currentRevenue < previousRevenue ? "Sales value is below the previous comparison period." : "",
      currentOrderTxnCount && !(primaryMovementCount + secondaryMovementCount + returnMovementCount) ? "Order transactions exist, but linked inventory movement rows are not appearing yet." : "",
    ],
    insights: [topTerritory !== "—" ? `${topTerritory} is the top-performing territory by order value.` : ""],
    tables: [
      table(
        "Order status performance",
        [{ key: "status", label: "Status" }, { key: "count", label: "Orders" }, { key: "total", label: "Order value" }],
        statusAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        statusAgg.length,
        "Pipeline health by order status."
      ),
      table(
        "Top territories",
        [{ key: "territory", label: "Territory" }, { key: "count", label: "Orders" }, { key: "total", label: "Order value" }],
        territoryAgg.map((row) => ({ territory: row._id, count: formatNumber(row.count), total: formatCurrency(row.total) })),
        territoryAgg.length,
        "Highest-value territories in the selected period."
      ),
      table(
        "Recent orders",
        [
          { key: "orderNo", label: "Order #" },
          { key: "customerName", label: "Customer" },
          { key: "saleType", label: "Order type" },
          { key: "sourceType", label: "Source" },
          { key: "territoryName", label: "Territory" },
          { key: "status", label: "Status" },
          { key: "totalAmount", label: "Amount" },
          { key: "createdAt", label: "Created" },
        ],
        recentOrders.map((row) => ({
          orderNo: row.orderNo || "—",
          customerName: row.customerName || "—",
          saleType: titleCase(row.saleType || "secondary"),
          sourceType: titleCase(row.sourceType || "customer"),
          territoryName: row.territoryName || "—",
          status: titleCase(row.status),
          totalAmount: formatCurrency(row.totalAmount),
          createdAt: formatDate(row.orderDate || row.createdAt),
        })),
        currentOrders,
        "Latest order lines that can be reviewed immediately."
      ),
    ],
    segments,
  });
}


async function buildPaymentsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentPrimaryMatch = distributorPaymentScope(scope, applyDateFilter({}, "createdAt", currentRange));
  const previousPrimaryMatch = distributorPaymentScope(scope, applyDateFilter({}, "createdAt", previousRange));
  const [currentPrimaryAgg, previousPrimaryAgg, outstandingAgg, recentSecondary, overdueCount] = await Promise.all([
    models.PrimaryPaymentModel.aggregate([{ $match: currentPrimaryMatch }, { $group: { _id: null, total: { $sum: "$amountTotal" }, remaining: { $sum: "$amountRemaining" }, paidBack: { $sum: "$amountPaidBack" } } }]),
    models.PrimaryPaymentModel.aggregate([{ $match: previousPrimaryMatch }, { $group: { _id: null, total: { $sum: "$amountTotal" } } }]),
    models.PrimaryPaymentModel.aggregate([{ $match: distributorPaymentScope(scope, {}) }, { $group: { _id: "$distributorName", total: { $sum: "$amountTotal" }, remaining: { $sum: "$amountRemaining" } } }, { $sort: { remaining: -1 } }, { $limit: 8 }]),
    models.SecondaryPaymentModel.find(distributorPaymentScope(scope, applyDateFilter({}, "createdAt", currentRange))).sort({ createdAt: -1 }).limit(8).select("primaryInvoiceNo distributorName warehouseName amountPaid paidDate").lean(),
    models.PrimaryPaymentModel.countDocuments(distributorPaymentScope(scope, { returnDate: { $lt: new Date() }, amountRemaining: { $gt: 0 } })),
  ]);

  const currentTotal = safeNumber(currentPrimaryAgg?.[0]?.total);
  const previousTotal = safeNumber(previousPrimaryAgg?.[0]?.total);
  const currentRemaining = safeNumber(currentPrimaryAgg?.[0]?.remaining);
  const paidBack = safeNumber(currentPrimaryAgg?.[0]?.paidBack);

  return moduleCard("payments", "Payment Management", "Primary and secondary payment control with outstanding visibility and due-date pressure.", {
    badge: scope.isDistributor ? "Territory collections" : "Payment control",
    heroTone: "amber",
    kpis: [
      { label: "Primary issued", value: formatCurrency(currentTotal), note: currentLabel },
      { label: "Recovered", value: formatCurrency(paidBack), note: currentLabel },
      { label: "Remaining", value: formatCurrency(currentRemaining), note: "Open balance" },
      { label: "Overdue", value: formatNumber(overdueCount), note: "Need follow-up" },
    ],
    comparison: compareBlock(currentTotal, previousTotal, currentLabel, previousLabel),
    alerts: [overdueCount ? `${formatNumber(overdueCount)} payment records are overdue and still open.` : ""],
    insights: [outstandingAgg[0]?._id ? `${outstandingAgg[0]._id} has the highest remaining payment exposure.` : ""],
    tables: [
      table(
        "Outstanding by distributor",
        [{ key: "distributor", label: "Distributor" }, { key: "total", label: "Total issued" }, { key: "remaining", label: "Remaining" }],
        outstandingAgg.map((row) => ({ distributor: row._id || "—", total: formatCurrency(row.total), remaining: formatCurrency(row.remaining) })),
        outstandingAgg.length,
        "Shows which distributors carry the most outstanding balance."
      ),
      table(
        "Recent secondary payments",
        [
          { key: "primaryInvoiceNo", label: "Invoice #" },
          { key: "distributorName", label: "Distributor" },
          { key: "warehouseName", label: "Warehouse" },
          { key: "amountPaid", label: "Paid" },
          { key: "paidDate", label: "Paid date" },
        ],
        recentSecondary.map((row) => ({
          primaryInvoiceNo: row.primaryInvoiceNo || "—",
          distributorName: row.distributorName || "—",
          warehouseName: row.warehouseName || "—",
          amountPaid: formatCurrency(row.amountPaid),
          paidDate: formatDate(row.paidDate),
        })),
        recentSecondary.length,
        "Latest recovered payments posted back to primary balances."
      ),
    ],
  });
}

async function buildAccountsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentTxnMatch = applyDateFilter({}, "transactionDate", currentRange);
  const previousTxnMatch = applyDateFilter({}, "transactionDate", previousRange);

  const [
    activeAccounts,
    balanceAgg,
    openLoans,
    overdueLoans,
    currentTxnAgg,
    previousTxnAgg,
    accountTypeAgg,
    topBalances,
    loanTypeAgg,
    recentLoans,
    recentLoanPayments,
  ] = await Promise.all([
    models.AccountModel.countDocuments({ status: "active" }),
    models.AccountModel.aggregate([{ $group: { _id: null, balance: { $sum: "$currentBalance" }, opening: { $sum: "$openingBalance" } } }]),
    models.LoanModel.countDocuments({ status: "open" }),
    models.LoanModel.countDocuments({ status: "open", dueDate: { $lt: new Date() }, remainingAmount: { $gt: 0 } }),
    models.AccountTransactionModel.aggregate([{ $match: currentTxnMatch }, { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    models.AccountTransactionModel.aggregate([{ $match: previousTxnMatch }, { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    models.AccountModel.aggregate([{ $group: { _id: { $ifNull: ["$accountType", "other"] }, count: { $sum: 1 }, balance: { $sum: "$currentBalance" } } }, { $sort: { balance: -1 } }]),
    models.AccountModel.find({}).sort({ currentBalance: -1 }).limit(8).select("accountName bankName accountType currentBalance status accountNumber").lean(),
    models.LoanModel.aggregate([{ $group: { _id: "$loanType", count: { $sum: 1 }, principal: { $sum: "$principalAmount" }, remaining: { $sum: "$remainingAmount" } } }, { $sort: { remaining: -1 } }]),
    models.LoanModel.find({}).sort({ createdAt: -1 }).limit(8).select("loanType partyName principalAmount remainingAmount status loanDate dueDate").lean(),
    models.LoanPaymentModel.find(applyDateFilter({}, "paymentDate", currentRange)).sort({ paymentDate: -1 }).limit(8).select("paymentDirection amount paymentDate method referenceNo").lean(),
  ]);

  const currentBalance = safeNumber(balanceAgg?.[0]?.balance);
  const currentCashIn = safeNumber(currentTxnAgg.find((row) => row._id === "cash_in")?.total);
  const currentCashOut = safeNumber(currentTxnAgg.find((row) => row._id === "cash_out")?.total);
  const previousCashIn = safeNumber(previousTxnAgg.find((row) => row._id === "cash_in")?.total);
  const previousCashOut = safeNumber(previousTxnAgg.find((row) => row._id === "cash_out")?.total);
  const currentNetFlow = currentCashIn - currentCashOut;
  const previousNetFlow = previousCashIn - previousCashOut;

  return moduleCard("accounts", "Account Management", "Accounts, balances, cash movement, and loan exposure with recovery visibility.", {
    badge: "Cash discipline",
    heroTone: "cyan",
    kpis: [
      { label: "Active accounts", value: formatNumber(activeAccounts), note: "Usable accounts" },
      { label: "Combined balance", value: formatCurrency(currentBalance), note: "Current balance" },
      { label: "Net cash flow", value: formatCurrency(currentNetFlow), note: `${currentLabel} (in ${formatCurrency(currentCashIn)} / out ${formatCurrency(currentCashOut)})` },
      { label: "Open loans", value: formatNumber(openLoans), note: overdueLoans ? `${formatNumber(overdueLoans)} overdue` : "No overdue loans" },
    ],
    comparison: compareBlock(currentNetFlow, previousNetFlow, currentLabel, previousLabel),
    alerts: [
      !activeAccounts ? "No active accounts found for financial operations." : "",
      overdueLoans ? `${formatNumber(overdueLoans)} open loans have crossed the due date and need follow-up.` : "",
      currentCashOut > currentCashIn && currentCashIn > 0 ? "Cash outflow is higher than inflow in the selected period." : "",
    ],
    insights: [
      accountTypeAgg[0]?._id ? `${titleCase(accountTypeAgg[0]._id)} accounts hold the largest share of current balances.` : "",
      loanTypeAgg[0]?._id ? `${titleCase(loanTypeAgg[0]._id)} loans are carrying the highest remaining exposure.` : "",
    ],
    tables: [
      table(
        "Account type balances",
        [{ key: "accountType", label: "Type" }, { key: "count", label: "Accounts" }, { key: "balance", label: "Balance" }],
        accountTypeAgg.map((row) => ({ accountType: titleCase(row._id), count: formatNumber(row.count), balance: formatCurrency(row.balance) })),
        accountTypeAgg.length,
        "Balance concentration by account type."
      ),
      table(
        "Top account balances",
        [
          { key: "accountName", label: "Account" },
          { key: "bankName", label: "Bank / Wallet" },
          { key: "accountType", label: "Type" },
          { key: "accountNumber", label: "Account #" },
          { key: "status", label: "Status" },
          { key: "currentBalance", label: "Balance" },
        ],
        topBalances.map((row) => ({
          accountName: row.accountName || "—",
          bankName: row.bankName || "—",
          accountType: titleCase(row.accountType),
          accountNumber: row.accountNumber || "—",
          status: titleCase(row.status),
          currentBalance: formatCurrency(row.currentBalance),
        })),
        topBalances.length,
        "Accounts with the highest current balance."
      ),
      table(
        "Loan exposure by type",
        [{ key: "loanType", label: "Type" }, { key: "count", label: "Loans" }, { key: "principal", label: "Principal" }, { key: "remaining", label: "Remaining" }],
        loanTypeAgg.map((row) => ({ loanType: titleCase(row._id), count: formatNumber(row.count), principal: formatCurrency(row.principal), remaining: formatCurrency(row.remaining) })),
        loanTypeAgg.length,
        "Outstanding loan book by received and given categories."
      ),
      table(
        "Recent loans",
        [
          { key: "loanType", label: "Type" },
          { key: "partyName", label: "Party" },
          { key: "principalAmount", label: "Principal" },
          { key: "remainingAmount", label: "Remaining" },
          { key: "status", label: "Status" },
          { key: "loanDate", label: "Loan date" },
          { key: "dueDate", label: "Due date" },
        ],
        recentLoans.map((row) => ({
          loanType: titleCase(row.loanType),
          partyName: row.partyName || "—",
          principalAmount: formatCurrency(row.principalAmount),
          remainingAmount: formatCurrency(row.remainingAmount),
          status: titleCase(row.status),
          loanDate: formatDate(row.loanDate),
          dueDate: formatDate(row.dueDate),
        })),
        recentLoans.length,
        "Latest loan records and their remaining exposure."
      ),
      table(
        "Recent loan returns",
        [
          { key: "paymentDirection", label: "Direction" },
          { key: "amount", label: "Amount" },
          { key: "method", label: "Method" },
          { key: "referenceNo", label: "Reference" },
          { key: "paymentDate", label: "Payment date" },
        ],
        recentLoanPayments.map((row) => ({
          paymentDirection: row.paymentDirection === "in" ? "Received back" : "Paid out",
          amount: formatCurrency(row.amount),
          method: titleCase(row.method),
          referenceNo: row.referenceNo || "—",
          paymentDate: formatDate(row.paymentDate),
        })),
        recentLoanPayments.length,
        "Latest loan settlement activity posted in the selected period."
      ),
    ],
  });
}

async function buildProcurementModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentPurchasesMatch = applyDateFilter({ movementType: "PURCHASE_IN" }, "createdAt", currentRange);
  const previousPurchasesMatch = applyDateFilter({ movementType: "PURCHASE_IN" }, "createdAt", previousRange);
  const [currentPurchases, previousPurchases, transfersAgg, recentTransfers] = await Promise.all([
    models.InventoryMovementModel.aggregate([{ $match: currentPurchasesMatch }, { $group: { _id: null, quantity: { $sum: "$quantity" }, rows: { $sum: 1 } } }]),
    models.InventoryMovementModel.aggregate([{ $match: previousPurchasesMatch }, { $group: { _id: null, quantity: { $sum: "$quantity" } } }]),
    models.StockTransferModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, quantity: { $sum: "$quantity" } } }, { $sort: { count: -1 } }]),
    models.StockTransferModel.find({}).sort({ createdAt: -1 }).limit(8).select("productName fromWarehouseName toWarehouseName quantity status createdAt").lean(),
  ]);

  const currentQty = safeNumber(currentPurchases?.[0]?.quantity);
  const previousQty = safeNumber(previousPurchases?.[0]?.quantity);

  return moduleCard("procurement", "Procurement", "Purchase inflow, transfer execution, and supply-side movement discipline.", {
    badge: "Supply flow",
    heroTone: "rose",
    kpis: [
      { label: "Purchased units", value: formatNumber(currentQty), note: currentLabel },
      { label: "Purchase rows", value: formatNumber(currentPurchases?.[0]?.rows), note: currentLabel },
      { label: "Top transfer state", value: titleCase(transfersAgg[0]?._id || "—"), note: transfersAgg[0] ? `${formatNumber(transfersAgg[0].count)} transfers` : "No transfers" },
      { label: "Recent transfer", value: recentTransfers[0]?.productName || "—", note: recentTransfers[0] ? titleCase(recentTransfers[0].status) : "No transfers" },
    ],
    comparison: compareBlock(currentQty, previousQty, currentLabel, previousLabel),
    alerts: [transfersAgg.find((row) => row._id === "pending")?.count > 5 ? "Pending stock transfers are building up." : ""],
    insights: [currentQty ? "Procurement inflow is measurable through purchase-in inventory records." : "No purchase inflow recorded in the selected period."],
    tables: [
      table(
        "Transfer status mix",
        [{ key: "status", label: "Status" }, { key: "count", label: "Transfers" }, { key: "quantity", label: "Quantity" }],
        transfersAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), quantity: formatNumber(row.quantity) })),
        transfersAgg.length,
        "Tracks the health of warehouse-to-warehouse transfer flow."
      ),
      table(
        "Recent transfers",
        [
          { key: "productName", label: "Product" },
          { key: "fromWarehouseName", label: "From" },
          { key: "toWarehouseName", label: "To" },
          { key: "quantity", label: "Qty" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Created" },
        ],
        recentTransfers.map((row) => ({
          productName: row.productName || "—",
          fromWarehouseName: row.fromWarehouseName || "—",
          toWarehouseName: row.toWarehouseName || "—",
          quantity: formatNumber(row.quantity),
          status: titleCase(row.status),
          createdAt: formatDate(row.createdAt),
        })),
        recentTransfers.length,
        "Latest transfer requests and their operational state."
      ),
    ],
  });
}

async function buildLogisticsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentDispatchMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), requestStatus: { $in: ["DISPATCHED", "DELIVERED"] } }, "transactionAt", currentRange));
  const previousDispatchMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), requestStatus: { $in: ["DISPATCHED", "DELIVERED"] } }, "transactionAt", previousRange));
  const [currentDispatches, previousDispatches, vehicles, tripAgg, recentTrips, maintenanceCount] = await Promise.all([
    models.WarehouseTransactionModel.countDocuments(currentDispatchMatch),
    models.WarehouseTransactionModel.countDocuments(previousDispatchMatch),
    models.VehicleModel.countDocuments(),
    models.VehicleTripModel.aggregate([{ $match: applyDateFilter({}, "createdAt", currentRange) }, { $group: { _id: "$tripType", distance: { $sum: "$distance" }, count: { $sum: 1 } } }, { $sort: { distance: -1 } }]),
    models.VehicleTripModel.find(applyDateFilter({}, "createdAt", currentRange)).sort({ createdAt: -1 }).limit(8).select("tripType fromPlace toPlace distance tripDate").lean(),
    models.VehicleMaintenanceModel.countDocuments(applyDateFilter({}, "createdAt", currentRange)),
  ]);

  return moduleCard("logistics", "Distribution & Logistics", "Fleet, dispatch, and trip-level execution quality with delivery focus.", {
    badge: "Route execution",
    heroTone: "orange",
    kpis: [
      { label: "Dispatches", value: formatNumber(currentDispatches), note: currentLabel },
      { label: "Fleet size", value: formatNumber(vehicles), note: "Registered vehicles" },
      { label: "Trip distance", value: formatNumber(tripAgg.reduce((sum, row) => sum + safeNumber(row.distance), 0)), note: "KM in period" },
      { label: "Maintenance rows", value: formatNumber(maintenanceCount), note: currentLabel },
    ],
    comparison: compareBlock(currentDispatches, previousDispatches, currentLabel, previousLabel),
    alerts: [!currentDispatches ? "No dispatched or delivered orders are recorded in the selected period." : ""],
    insights: [tripAgg[0]?._id ? `${titleCase(tripAgg[0]._id)} trips consumed the most distance.` : ""],
    tables: [
      table(
        "Trip type mix",
        [{ key: "tripType", label: "Trip type" }, { key: "count", label: "Trips" }, { key: "distance", label: "Distance" }],
        tripAgg.map((row) => ({ tripType: titleCase(row._id), count: formatNumber(row.count), distance: `${formatNumber(row.distance)} KM` })),
        tripAgg.length,
        "Distance and trip count by trip purpose."
      ),
      table(
        "Recent trips",
        [
          { key: "tripType", label: "Trip type" },
          { key: "fromPlace", label: "From" },
          { key: "toPlace", label: "To" },
          { key: "distance", label: "Distance" },
          { key: "tripDate", label: "Trip date" },
        ],
        recentTrips.map((row) => ({
          tripType: titleCase(row.tripType),
          fromPlace: row.fromPlace || "—",
          toPlace: row.toPlace || "—",
          distance: `${formatNumber(row.distance)} KM`,
          tripDate: formatDate(row.tripDate),
        })),
        recentTrips.length,
        "Latest vehicle movement entries in the selected period."
      ),
    ],
  });
}

async function buildFinanceModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const scopedOrders = scope.isDistributor
    ? await models.SalesOrderModel.find(scopedSalesOrderQuery(models, scope, {})).select("_id orderNo invoiceNo").limit(5000).lean()
    : [];
  const scopedOrderIds = scopedOrders.map((row) => row._id).filter(Boolean);
  const currentReceiptMatch = distributorReceiptScope(scope, scopedOrderIds, applyDateFilter({}, "createdAt", currentRange));
  const previousReceiptMatch = distributorReceiptScope(scope, scopedOrderIds, applyDateFilter({}, "createdAt", previousRange));

  const [
    currentReceiptsAgg,
    previousReceiptsAgg,
    receiptStatusAgg,
    receiptMethodAgg,
    payerRoleAgg,
    recentReceipts,
    linkedInvoices,
  ] = await Promise.all([
    models.ReceiptModel.aggregate([{ $match: currentReceiptMatch }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    models.ReceiptModel.aggregate([{ $match: previousReceiptMatch }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    models.ReceiptModel.aggregate([{ $match: currentReceiptMatch }, { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }, { $sort: { count: -1 } }]),
    models.ReceiptModel.aggregate([{ $match: currentReceiptMatch }, { $group: { _id: "$paymentMethod", count: { $sum: 1 }, total: { $sum: "$amount" } } }, { $sort: { total: -1 } }]),
    models.ReceiptModel.aggregate([{ $match: currentReceiptMatch }, { $group: { _id: "$payerRole", count: { $sum: 1 }, total: { $sum: "$amount" } } }, { $sort: { total: -1 } }]),
    models.ReceiptModel.find(currentReceiptMatch).sort({ createdAt: -1 }).limit(8).select("receiptNo payerName payerRole paymentMethod amount status paymentDate linkedInvoiceNo referenceNo").lean(),
    models.SalesOrderModel.find(scopedSalesOrderQuery(models, scope, { invoiceNo: { $exists: true, $ne: "" } })).sort({ invoiceGeneratedAt: -1 }).limit(8).select("invoiceNo orderNo customerName saleType status totalAmount invoiceGeneratedAt").lean(),
  ]);

  const currentTotal = safeNumber(currentReceiptsAgg?.[0]?.total);
  const previousTotal = safeNumber(previousReceiptsAgg?.[0]?.total);
  const currentCount = safeNumber(currentReceiptsAgg?.[0]?.count);
  const pendingCount = safeNumber(receiptStatusAgg.find((row) => row._id === "pending")?.count);

  return moduleCard(scope.isDistributor ? "receipts" : "finance", scope.isDistributor ? "Receipts" : "Finance & Accounts", scope.isDistributor ? "Receipt approval and payment inflow scoped to the distributor territory." : "Receipts, invoice-linked collections, and financial transaction visibility.", {
    badge: scope.isDistributor ? "Receipt desk" : "Finance control",
    heroTone: "teal",
    kpis: [
      { label: "Receipt value", value: formatCurrency(currentTotal), note: currentLabel },
      { label: "Receipts count", value: formatNumber(currentCount), note: currentLabel },
      { label: "Pending approvals", value: formatNumber(pendingCount), note: pendingCount ? "Needs review" : "All cleared" },
      { label: "Invoices ready", value: formatNumber(linkedInvoices.length), note: "Latest invoiced orders" },
    ],
    comparison: compareBlock(currentTotal, previousTotal, currentLabel, previousLabel),
    alerts: [
      pendingCount ? `${formatNumber(pendingCount)} receipts are still pending review.` : "",
      receiptMethodAgg[0]?._id === "cash" && receiptMethodAgg[0]?.total > currentTotal * 0.6 ? "Cash receipts dominate this period and should be monitored closely." : "",
    ],
    insights: [
      payerRoleAgg[0]?._id ? `${titleCase(payerRoleAgg[0]._id)} contributed the largest receipt inflow in ${currentLabel.toLowerCase()}.` : "",
      receiptMethodAgg[0]?._id ? `${titleCase(receiptMethodAgg[0]._id)} is the leading payment method this period.` : "",
    ],
    tables: [
      table(
        "Receipt status mix",
        [{ key: "status", label: "Status" }, { key: "count", label: "Receipts" }, { key: "total", label: "Amount" }],
        receiptStatusAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        receiptStatusAgg.length,
        "Distribution of receipts by approval state."
      ),
      table(
        "Receipt method mix",
        [{ key: "paymentMethod", label: "Method" }, { key: "count", label: "Receipts" }, { key: "total", label: "Amount" }],
        receiptMethodAgg.map((row) => ({ paymentMethod: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        receiptMethodAgg.length,
        "Collection performance by payment method."
      ),
      table(
        "Payer role contribution",
        [{ key: "payerRole", label: "Payer role" }, { key: "count", label: "Receipts" }, { key: "total", label: "Amount" }],
        payerRoleAgg.map((row) => ({ payerRole: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        payerRoleAgg.length,
        "Which roles are generating the most collections."
      ),
      table(
        "Recent receipts",
        [
          { key: "receiptNo", label: "Receipt #" },
          { key: "payerName", label: "Payer" },
          { key: "payerRole", label: "Role" },
          { key: "paymentMethod", label: "Method" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
          { key: "paymentDate", label: "Payment date" },
        ],
        recentReceipts.map((row) => ({
          receiptNo: row.receiptNo || "—",
          payerName: row.payerName || "—",
          payerRole: titleCase(row.payerRole),
          paymentMethod: titleCase(row.paymentMethod),
          amount: formatCurrency(row.amount),
          status: titleCase(row.status),
          paymentDate: formatDate(row.paymentDate),
        })),
        currentCount,
        "Latest receipts available for account approval tracking."
      ),
      table(
        "Recent invoiced orders",
        [
          { key: "invoiceNo", label: "Invoice #" },
          { key: "orderNo", label: "Order #" },
          { key: "customerName", label: "Customer" },
          { key: "saleType", label: "Order type" },
          { key: "status", label: "Status" },
          { key: "totalAmount", label: "Amount" },
          { key: "invoiceGeneratedAt", label: "Generated" },
        ],
        linkedInvoices.map((row) => ({
          invoiceNo: row.invoiceNo || "—",
          orderNo: row.orderNo || "—",
          customerName: row.customerName || "—",
          saleType: titleCase(row.saleType),
          status: titleCase(row.status),
          totalAmount: formatCurrency(row.totalAmount),
          invoiceGeneratedAt: formatDate(row.invoiceGeneratedAt),
        })),
        linkedInvoices.length,
        "Latest orders that already have invoice numbers assigned."
      ),
    ],
  });
}

async function buildExpenseModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentMatch = distributorExpenseScope(scope, applyDateFilter({}, "createdAt", currentRange));
  const previousMatch = distributorExpenseScope(scope, applyDateFilter({}, "createdAt", previousRange));
  const [
    currentAgg,
    previousAgg,
    statusAgg,
    categoryAgg,
    sectionAgg,
    paymentMethodAgg,
    costCenterAgg,
    recentExpenses,
  ] = await Promise.all([
    models.ExpenseModel.aggregate([{ $match: currentMatch }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    models.ExpenseModel.aggregate([{ $match: previousMatch }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    models.ExpenseModel.aggregate([{ $match: currentMatch }, { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }, { $sort: { count: -1 } }]),
    models.ExpenseModel.aggregate([{ $match: currentMatch }, { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 8 }]),
    models.ExpenseModel.aggregate([{ $match: currentMatch }, { $group: { _id: { $ifNull: ["$section", "personal"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    models.ExpenseModel.aggregate([{ $match: currentMatch }, { $group: { _id: { $ifNull: ["$paymentMethod", "cash"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    models.ExpenseModel.aggregate([{ $match: currentMatch }, { $group: { _id: { $ifNull: ["$costCenter", "General"] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 8 }]),
    models.ExpenseModel.find(currentMatch).sort({ createdAt: -1 }).limit(8).select("title category section costCenter spenderName paymentMethod amount status expenseDate paidTo").lean(),
  ]);

  const currentTotal = safeNumber(currentAgg?.[0]?.total);
  const previousTotal = safeNumber(previousAgg?.[0]?.total);
  const currentCount = safeNumber(currentAgg?.[0]?.count);
  const pendingCount = safeNumber(statusAgg.find((row) => row._id === "pending")?.count);

  return moduleCard("expenses", "Expense Management", "Detailed cost control, category pressure, spending sections, and approval quality.", {
    badge: scope.isDistributor ? "Territory spend" : "Cost governance",
    heroTone: "pink",
    kpis: [
      { label: "Expense value", value: formatCurrency(currentTotal), note: currentLabel },
      { label: "Expense rows", value: formatNumber(currentCount), note: currentLabel },
      { label: "Top category", value: categoryAgg[0]?._id || "—", note: categoryAgg[0] ? formatCurrency(categoryAgg[0].total) : "No expenses" },
      { label: "Pending approvals", value: formatNumber(pendingCount), note: pendingCount ? "Requires review" : "All cleared" },
    ],
    comparison: compareBlock(currentTotal, previousTotal, currentLabel, previousLabel),
    alerts: [
      pendingCount ? "Some expenses are still pending approval." : "",
      sectionAgg[0]?._id === "daily" && sectionAgg[0]?.total > currentTotal * 0.5 ? "Daily expenses are taking more than half of current period spend." : "",
    ],
    insights: [
      categoryAgg[0]?._id ? `${categoryAgg[0]._id} is the largest expense category in the selected period.` : "No expense categories found.",
      costCenterAgg[0]?._id ? `${costCenterAgg[0]._id} is the heaviest cost center this period.` : "",
    ],
    tables: [
      table(
        "Expense status mix",
        [{ key: "status", label: "Status" }, { key: "count", label: "Rows" }, { key: "total", label: "Amount" }],
        statusAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        statusAgg.length,
        "Approval state and financial value by expense status."
      ),
      table(
        "Expense sections",
        [{ key: "section", label: "Section" }, { key: "count", label: "Rows" }, { key: "total", label: "Amount" }],
        sectionAgg.map((row) => ({ section: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        sectionAgg.length,
        "AIM personal, daily, and distributor expense split."
      ),
      table(
        "Payment method mix",
        [{ key: "paymentMethod", label: "Method" }, { key: "count", label: "Rows" }, { key: "total", label: "Amount" }],
        paymentMethodAgg.map((row) => ({ paymentMethod: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        paymentMethodAgg.length,
        "How expenses are being paid in the selected period."
      ),
      table(
        "Top categories",
        [{ key: "category", label: "Category" }, { key: "count", label: "Rows" }, { key: "total", label: "Amount" }],
        categoryAgg.map((row) => ({ category: row._id, count: formatNumber(row.count), total: formatCurrency(row.total) })),
        categoryAgg.length,
        "Most expensive categories in the current period."
      ),
      table(
        "Cost center pressure",
        [{ key: "costCenter", label: "Cost center" }, { key: "count", label: "Rows" }, { key: "total", label: "Amount" }],
        costCenterAgg.map((row) => ({ costCenter: row._id, count: formatNumber(row.count), total: formatCurrency(row.total) })),
        costCenterAgg.length,
        "Cost centers carrying the highest expense load."
      ),
      table(
        "Recent expenses",
        [
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "section", label: "Section" },
          { key: "costCenter", label: "Cost center" },
          { key: "spenderName", label: "Spender" },
          { key: "paymentMethod", label: "Method" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
        ],
        recentExpenses.map((row) => ({
          title: row.title || "—",
          category: row.category || "—",
          section: titleCase(row.section),
          costCenter: row.costCenter || "—",
          spenderName: row.spenderName || row.paidTo || "—",
          paymentMethod: titleCase(row.paymentMethod),
          amount: formatCurrency(row.amount),
          status: titleCase(row.status),
        })),
        currentCount,
        "Latest expense rows entered in the selected period."
      ),
    ],
  });
}

async function buildHrModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const scopedUserMatch = scope.isDistributor
    ? addOrScope({}, [scope.territoryName ? { territoryName: scope.territoryName } : null, scope.distributorId ? { distributorId: scope.distributorId } : null])
    : {};
  const [activeUsers, totalUsers, currentNewUsers, previousNewUsers, roleAgg, territoryAgg] = await Promise.all([
    models.UserModel.countDocuments({ ...scopedUserMatch, status: "active" }),
    models.UserModel.countDocuments(scopedUserMatch),
    models.UserModel.countDocuments(applyDateFilter(scopedUserMatch, "createdAt", currentRange)),
    models.UserModel.countDocuments(applyDateFilter(scopedUserMatch, "createdAt", previousRange)),
    models.UserModel.aggregate([{ $match: scopedUserMatch }, { $group: { _id: "$role", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    models.UserModel.aggregate([{ $match: scopedUserMatch }, { $group: { _id: { $ifNull: ["$territoryName", "Unassigned"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
  ]);

  return moduleCard("hr", "HR & Role Management", "Headcount, activation health, and role coverage across the business structure.", {
    badge: scope.isDistributor ? "Territory team" : "People analytics",
    heroTone: "slate",
    kpis: [
      { label: "Total users", value: formatNumber(totalUsers), note: scope.scopeLabel },
      { label: "Active users", value: formatNumber(activeUsers), note: totalUsers ? formatPercent((activeUsers / totalUsers) * 100) : "0.0%" },
      { label: "New users", value: formatNumber(currentNewUsers), note: currentLabel },
      { label: "Largest role", value: titleCase(roleAgg[0]?._id || "—"), note: roleAgg[0] ? `${formatNumber(roleAgg[0].count)} users` : "No roles" },
    ],
    comparison: compareBlock(currentNewUsers, previousNewUsers, currentLabel, previousLabel),
    alerts: [activeUsers < totalUsers ? `${formatNumber(totalUsers - activeUsers)} users are inactive.` : ""],
    insights: [territoryAgg[0]?._id ? `${territoryAgg[0]._id} has the highest team coverage.` : ""],
    tables: [
      table(
        "Role distribution",
        [{ key: "role", label: "Role" }, { key: "count", label: "Users" }],
        roleAgg.map((row) => ({ role: titleCase(row._id), count: formatNumber(row.count) })),
        roleAgg.length,
        "How the workforce is distributed by role."
      ),
      table(
        "Territory distribution",
        [{ key: "territory", label: "Territory" }, { key: "count", label: "Users" }],
        territoryAgg.map((row) => ({ territory: row._id, count: formatNumber(row.count) })),
        territoryAgg.length,
        "Territories with the largest assigned team footprint."
      ),
    ],
  });
}

async function buildComplianceModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const scopedOrders = await getScopedOrderRefs(models, scope, currentRange);
  const claimBase = scope.isDistributor
    ? (scopedOrders.orderIds?.length || scopedOrders.orderNos?.length
        ? addOrScope({}, [
            scopedOrders.orderIds?.length ? { orderId: { $in: scopedOrders.orderIds } } : null,
            scopedOrders.orderNos?.length ? { orderNo: { $in: scopedOrders.orderNos } } : null,
          ])
        : { _id: null })
    : {};
  const currentMatch = applyDateFilter(claimBase, "createdAt", currentRange);
  const previousMatch = applyDateFilter(claimBase, "createdAt", previousRange);
  const [currentClaims, previousClaims, claimAgg, recentClaims, deliveredWithPod] = await Promise.all([
    models.ReturnClaimModel.countDocuments(currentMatch),
    models.ReturnClaimModel.countDocuments(previousMatch),
    models.ReturnClaimModel.aggregate([{ $match: currentMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    models.ReturnClaimModel.find(currentMatch).sort({ createdAt: -1 }).limit(8).select("orderNo customerName reason status quantity createdAt").lean(),
    models.SalesOrderModel.countDocuments(scopedOrderQuery(models, scope, { status: "delivered", podUrl: { $exists: true, $ne: "" } })),
  ]);

  return moduleCard(scope.isDistributor ? "return-stock" : "compliance", scope.isDistributor ? "Return Stock" : "Quality & Compliance", scope.isDistributor ? "Return requests, resolution pace, and returned order visibility in the territory." : "Returns, customer issues, and proof-of-delivery backed compliance visibility.", {
    badge: scope.isDistributor ? "Returns desk" : "Quality control",
    heroTone: "red",
    kpis: [
      { label: "Claims in period", value: formatNumber(currentClaims), note: currentLabel },
      { label: "Delivered with POD", value: formatNumber(deliveredWithPod), note: "Proof-backed deliveries" },
      { label: "Top claim state", value: titleCase(claimAgg[0]?._id || "—"), note: claimAgg[0] ? `${formatNumber(claimAgg[0].count)} claims` : "No claims" },
      { label: "Recent reason", value: recentClaims[0]?.reason || "—", note: recentClaims[0] ? recentClaims[0].customerName : "No claims" },
    ],
    comparison: compareBlock(currentClaims, previousClaims, currentLabel, previousLabel),
    alerts: [claimAgg.find((row) => row._id === "requested")?.count ? `${formatNumber(claimAgg.find((row) => row._id === "requested")?.count)} return claims are still waiting for action.` : ""],
    insights: [deliveredWithPod ? "Proof of delivery coverage helps support quality and claim validation." : "No POD-backed deliveries were found in current scope."],
    tables: [
      table(
        "Claim status mix",
        [{ key: "status", label: "Status" }, { key: "count", label: "Claims" }],
        claimAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count) })),
        claimAgg.length,
        "Return claim lifecycle visibility."
      ),
      table(
        "Recent claims",
        [
          { key: "orderNo", label: "Order #" },
          { key: "customerName", label: "Customer" },
          { key: "reason", label: "Reason" },
          { key: "status", label: "Status" },
          { key: "quantity", label: "Qty" },
          { key: "createdAt", label: "Created" },
        ],
        recentClaims.map((row) => ({
          orderNo: row.orderNo || "—",
          customerName: row.customerName || "—",
          reason: row.reason || "—",
          status: titleCase(row.status),
          quantity: formatNumber(row.quantity),
          createdAt: formatDate(row.createdAt),
        })),
        currentClaims,
        "Latest customer claims requiring quality review."
      ),
    ],
  });
}

async function buildMessagesModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentMatch = distributorMessageScope(scope, applyDateFilter({}, "createdAt", currentRange));
  const previousMatch = distributorMessageScope(scope, applyDateFilter({}, "createdAt", previousRange));
  const [currentMessages, previousMessages, priorityAgg, recentMessages] = await Promise.all([
    models.MessageModel.countDocuments(currentMatch),
    models.MessageModel.countDocuments(previousMatch),
    models.MessageModel.aggregate([{ $match: distributorMessageScope(scope, {}) }, { $group: { _id: "$priority", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    models.MessageModel.find(currentMatch).sort({ createdAt: -1 }).limit(8).select("title senderName senderRole recipientRole priority createdAt").lean(),
  ]);

  return moduleCard("messages", "Messages", "Communication volume, urgency mix, and operational message freshness.", {
    badge: "Communication",
    heroTone: "purple",
    kpis: [
      { label: "Messages", value: formatNumber(currentMessages), note: currentLabel },
      { label: "Critical", value: formatNumber(priorityAgg.find((row) => row._id === "critical")?.count), note: "Urgent items" },
      { label: "Top priority", value: titleCase(priorityAgg[0]?._id || "—"), note: priorityAgg[0] ? `${formatNumber(priorityAgg[0].count)} messages` : "No messages" },
      { label: "Latest sender", value: recentMessages[0]?.senderName || "—", note: recentMessages[0] ? titleCase(recentMessages[0].senderRole) : "No messages" },
    ],
    comparison: compareBlock(currentMessages, previousMessages, currentLabel, previousLabel),
    alerts: [priorityAgg.find((row) => row._id === "critical")?.count ? "Critical messages are present and should be reviewed first." : ""],
    insights: [recentMessages[0]?.recipientRole ? `Messages are actively targeted to ${titleCase(recentMessages[0].recipientRole)} roles.` : "No communication activity found."],
    tables: [
      table(
        "Priority mix",
        [{ key: "priority", label: "Priority" }, { key: "count", label: "Messages" }],
        priorityAgg.map((row) => ({ priority: titleCase(row._id), count: formatNumber(row.count) })),
        priorityAgg.length,
        "Volume of messages by urgency level."
      ),
      table(
        "Recent messages",
        [
          { key: "title", label: "Title" },
          { key: "senderName", label: "Sender" },
          { key: "senderRole", label: "Sender role" },
          { key: "recipientRole", label: "Recipient role" },
          { key: "priority", label: "Priority" },
          { key: "createdAt", label: "Created" },
        ],
        recentMessages.map((row) => ({
          title: row.title || "—",
          senderName: row.senderName || "—",
          senderRole: titleCase(row.senderRole),
          recipientRole: titleCase(row.recipientRole),
          priority: titleCase(row.priority),
          createdAt: formatDate(row.createdAt),
        })),
        currentMessages,
        "Latest messages that are available to the current scope."
      ),
    ],
  });
}

async function buildLiveTrackingModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const userScope = scope.isDistributor
    ? addOrScope({}, [scope.territoryName ? { territoryName: scope.territoryName } : null, scope.distributorId ? { distributorId: scope.distributorId } : null])
    : {};
  const [trackedUsers, previousTrackedUsers, liveUsers, vehicleTrips] = await Promise.all([
    models.UserModel.countDocuments({ ...userScope, gpsLatitude: { $exists: true, $ne: "" }, gpsLongitude: { $exists: true, $ne: "" } }),
    models.UserModel.countDocuments({ ...userScope, createdAt: { $lt: currentRange?.start || new Date(0) }, gpsLatitude: { $exists: true, $ne: "" }, gpsLongitude: { $exists: true, $ne: "" } }),
    models.UserModel.find({ ...userScope, gpsLatitude: { $exists: true, $ne: "" }, gpsLongitude: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 }).limit(8).select("fullName role territoryName gpsLatitude gpsLongitude updatedAt").lean(),
    models.VehicleTripModel.find(applyDateFilter({}, "createdAt", currentRange)).sort({ createdAt: -1 }).limit(8).select("tripType fromPlace toPlace distance updatedAt").lean(),
  ]);

  return moduleCard("live-tracking", "Live Tracking", "Field visibility, geo-available users, and latest tracked movement snapshots.", {
    badge: scope.isDistributor ? "Territory movement" : "Field visibility",
    heroTone: "lime",
    kpis: [
      { label: "Trackable users", value: formatNumber(trackedUsers), note: "GPS available" },
      { label: "Latest updates", value: formatNumber(liveUsers.length), note: "Recent user locations" },
      { label: "Trip rows", value: formatNumber(vehicleTrips.length), note: currentLabel },
      { label: "Scope", value: scope.isDistributor ? (scope.territoryName || "Territory") : "Company", note: "Tracking boundary" },
    ],
    comparison: compareBlock(trackedUsers, previousTrackedUsers, currentLabel, previousLabel),
    alerts: [!trackedUsers ? "No GPS-enabled users are currently available in this scope." : ""],
    insights: [liveUsers[0]?.territoryName ? `Latest live update belongs to ${liveUsers[0].territoryName}.` : ""],
    tables: [
      table(
        "Latest user positions",
        [
          { key: "fullName", label: "User" },
          { key: "role", label: "Role" },
          { key: "territoryName", label: "Territory" },
          { key: "coordinates", label: "Coordinates" },
          { key: "updatedAt", label: "Updated" },
        ],
        liveUsers.map((row) => ({
          fullName: row.fullName || "—",
          role: titleCase(row.role),
          territoryName: row.territoryName || "—",
          coordinates: `${row.gpsLatitude || "—"}, ${row.gpsLongitude || "—"}`,
          updatedAt: formatDate(row.updatedAt),
        })),
        trackedUsers,
        "Users that have usable live location coordinates."
      ),
      table(
        "Recent tracked trips",
        [
          { key: "tripType", label: "Trip type" },
          { key: "fromPlace", label: "From" },
          { key: "toPlace", label: "To" },
          { key: "distance", label: "Distance" },
          { key: "updatedAt", label: "Updated" },
        ],
        vehicleTrips.map((row) => ({
          tripType: titleCase(row.tripType),
          fromPlace: row.fromPlace || "—",
          toPlace: row.toPlace || "—",
          distance: `${formatNumber(row.distance)} KM`,
          updatedAt: formatDate(row.updatedAt),
        })),
        vehicleTrips.length,
        "Latest trip records associated with movement tracking."
      ),
    ],
  });
}

async function buildVehicleModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const tripCurrentMatch = applyDateFilter({}, "tripDate", currentRange);
  const tripPreviousMatch = applyDateFilter({}, "tripDate", previousRange);
  const refuelCurrentMatch = applyDateFilter({}, "date", currentRange);
  const maintenanceCurrentMatch = applyDateFilter({}, "date", currentRange);

  const [vehicles, trips, previousTrips, refuels, maintenance] = await Promise.all([
    models.VehicleModel.find({}).lean(),
    models.VehicleTripModel.find(tripCurrentMatch).lean(),
    models.VehicleTripModel.find(tripPreviousMatch).lean(),
    models.VehicleRefuelModel.find(refuelCurrentMatch).lean(),
    models.VehicleMaintenanceModel.find(maintenanceCurrentMatch).lean(),
  ]);

  const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.assignedUserId).length;
  const idleVehicles = totalVehicles - activeVehicles;
  const dueMaintenanceCount = vehicles.filter((v) => String(v.status || "").toLowerCase() === "under maintenance").length;

  const currentDistance = trips.reduce((sum, row) => sum + safeNumber(row.distance), 0);
  const previousDistance = previousTrips.reduce((sum, row) => sum + safeNumber(row.distance), 0);
  const totalFuel = refuels.reduce((sum, row) => sum + safeNumber(row.liters), 0);
  const fuelCost = refuels.reduce((sum, row) => sum + safeNumber(row.cost), 0);
  const maintenanceCost = maintenance.reduce((sum, row) => sum + safeNumber(row.cost || row.totalCost), 0);
  const companyTrips = trips.filter((row) => row.tripType === "company");
  const personalTrips = trips.filter((row) => row.tripType === "personal");

  const byType = Object.entries(vehicles.reduce((acc, v) => {
    const key = v.type || "Other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([type, count]) => ({ type, count }));

  const byStatus = Object.entries(vehicles.reduce((acc, v) => {
    const key = v.status || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([status, count]) => ({ status, count }));

  const byRegion = Object.entries(vehicles.reduce((acc, v) => {
    const key = v.regionName || v.regionId || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([region, count]) => ({ region, count }));

  const maintenanceByType = Object.values(maintenance.reduce((acc, item) => {
    const key = item.maintenanceType || "other";
    if (!acc[key]) acc[key] = { maintenanceType: key, count: 0, cost: 0 };
    acc[key].count += 1;
    acc[key].cost += safeNumber(item.cost || item.totalCost);
    return acc;
  }, {})).sort((a, b) => b.cost - a.cost);

  const tripAggByVehicle = trips.reduce((acc, t) => {
    const key = String(t.vehicleId);
    if (!acc[key]) {
      const vehicle = vehicleMap.get(key) || {};
      acc[key] = {
        vehicleId: key,
        registrationNo: vehicle.registrationNo || "-",
        assignedUserName: vehicle.assignedUserName || "-",
        distance: 0,
        tripCount: 0,
        companyKm: 0,
        personalKm: 0,
      };
    }
    acc[key].distance += safeNumber(t.distance);
    acc[key].tripCount += 1;
    if (t.tripType === "company") acc[key].companyKm += safeNumber(t.distance);
    if (t.tripType === "personal") acc[key].personalKm += safeNumber(t.distance);
    return acc;
  }, {});

  const refuelAggByVehicle = refuels.reduce((acc, r) => {
    const key = String(r.vehicleId);
    if (!acc[key]) acc[key] = { liters: 0, cost: 0, count: 0 };
    acc[key].liters += safeNumber(r.liters);
    acc[key].cost += safeNumber(r.cost || r.amount);
    acc[key].count += 1;
    return acc;
  }, {});

  const vehicleInsights = Object.values(tripAggByVehicle).map((row) => {
    const ref = refuelAggByVehicle[row.vehicleId] || { liters: 0, cost: 0, count: 0 };
    const efficiency = ref.liters > 0 ? row.distance / ref.liters : 0;
    const personalRatio = row.distance > 0 ? (row.personalKm / row.distance) * 100 : 0;
    return { ...row, refuelLiters: ref.liters, refuelCost: ref.cost, refuelCount: ref.count, efficiency, personalRatio };
  });

  const topFuelVehicles = [...vehicleInsights].sort((a, b) => b.refuelLiters - a.refuelLiters).slice(0, 8);
  const lowEfficiencyVehicles = [...vehicleInsights].filter((v) => v.refuelLiters > 0).sort((a, b) => a.efficiency - b.efficiency).slice(0, 8);
  const topPersonalUsageVehicles = [...vehicleInsights].filter((v) => v.personalKm > 0).sort((a, b) => b.personalKm - a.personalKm).slice(0, 8);
  const personalRatio = currentDistance > 0 ? (personalTrips.reduce((sum, row) => sum + safeNumber(row.distance), 0) / currentDistance) * 100 : 0;

  return moduleCard("vehicles", "Vehicle Management", "Fleet overview, fuel analytics, efficiency, personal usage, and maintenance health for operations.", {
    badge: "Fleet analytics",
    heroTone: "yellow",
    kpis: [
      { label: "Total vehicles", value: formatNumber(totalVehicles), note: `${formatNumber(activeVehicles)} active · ${formatNumber(idleVehicles)} idle` },
      { label: "Distance", value: `${formatNumber(currentDistance)} KM`, note: `${formatNumber(companyTrips.length)} company trips · ${formatNumber(personalTrips.length)} personal trips` },
      { label: "Fuel analysis", value: `${safeNumber(totalFuel).toFixed(1)} L`, note: `Cost ${formatCurrency(fuelCost)} · ${(totalFuel > 0 ? currentDistance / totalFuel : 0).toFixed(2)} KM/L` },
      { label: "Maintenance health", value: formatCurrency(maintenanceCost), note: dueMaintenanceCount ? `${formatNumber(dueMaintenanceCount)} vehicles under maintenance` : "No vehicles under maintenance" },
    ],
    comparison: compareBlock(currentDistance, previousDistance, currentLabel, previousLabel),
    alerts: [
      !totalVehicles ? "No vehicles have been configured yet." : "",
      dueMaintenanceCount ? `${formatNumber(dueMaintenanceCount)} vehicles are currently under maintenance.` : "",
      lowEfficiencyVehicles[0]?.efficiency > 0 && lowEfficiencyVehicles[0].efficiency < 5 ? `${lowEfficiencyVehicles[0].registrationNo} is running below healthy fuel efficiency.` : "",
      topPersonalUsageVehicles[0]?.personalRatio > 30 ? `${topPersonalUsageVehicles[0].registrationNo} shows high personal KM usage.` : "",
    ],
    insights: [
      topFuelVehicles[0]?.registrationNo ? `${topFuelVehicles[0].registrationNo} consumed the highest fuel in the selected period.` : "",
      lowEfficiencyVehicles[0]?.registrationNo ? `${lowEfficiencyVehicles[0].registrationNo} has the lowest efficiency and should be reviewed.` : "",
      `Personal KM ratio is ${personalRatio.toFixed(1)}% for the selected period.`,
    ],
    tables: [
      table(
        "Vehicles by type",
        [{ key: "type", label: "Type" }, { key: "count", label: "Vehicles" }],
        byType.map((row) => ({ type: row.type, count: formatNumber(row.count) })),
        byType.length,
        "Vehicle mix across available fleet types."
      ),
      table(
        "Vehicles by status",
        [{ key: "status", label: "Status" }, { key: "count", label: "Vehicles" }],
        byStatus.map((row) => ({ status: row.status, count: formatNumber(row.count) })),
        byStatus.length,
        "Fleet availability and maintenance distribution."
      ),
      table(
        "Vehicles by region",
        [{ key: "region", label: "Region" }, { key: "count", label: "Vehicles" }],
        byRegion.map((row) => ({ region: row.region, count: formatNumber(row.count) })),
        byRegion.length,
        "Regional deployment of the vehicle fleet."
      ),
      table(
        "Top fuel vehicles",
        [
          { key: "registrationNo", label: "Vehicle" },
          { key: "assignedUserName", label: "Assigned user" },
          { key: "refuelLiters", label: "Fuel (L)" },
          { key: "refuelCost", label: "Fuel cost" },
          { key: "distance", label: "KM" },
        ],
        topFuelVehicles.map((row) => ({
          registrationNo: row.registrationNo || "—",
          assignedUserName: row.assignedUserName || "—",
          refuelLiters: safeNumber(row.refuelLiters).toFixed(1),
          refuelCost: formatCurrency(row.refuelCost),
          distance: formatNumber(row.distance),
        })),
        topFuelVehicles.length,
        "Same high-value fuel report used in the vehicle module overview."
      ),
      table(
        "Lowest efficiency vehicles",
        [
          { key: "registrationNo", label: "Vehicle" },
          { key: "distance", label: "KM" },
          { key: "refuelLiters", label: "Fuel (L)" },
          { key: "efficiency", label: "KM/L" },
        ],
        lowEfficiencyVehicles.map((row) => ({
          registrationNo: row.registrationNo || "—",
          distance: formatNumber(row.distance),
          refuelLiters: safeNumber(row.refuelLiters).toFixed(1),
          efficiency: safeNumber(row.efficiency).toFixed(2),
        })),
        lowEfficiencyVehicles.length,
        "Vehicles with the weakest fuel efficiency in the selected period."
      ),
      table(
        "Top personal usage vehicles",
        [
          { key: "registrationNo", label: "Vehicle" },
          { key: "personalKm", label: "Personal KM" },
          { key: "distance", label: "Total KM" },
          { key: "personalRatio", label: "Personal ratio" },
        ],
        topPersonalUsageVehicles.map((row) => ({
          registrationNo: row.registrationNo || "—",
          personalKm: formatNumber(row.personalKm),
          distance: formatNumber(row.distance),
          personalRatio: `${safeNumber(row.personalRatio).toFixed(1)}%`,
        })),
        topPersonalUsageVehicles.length,
        "Vehicles with the highest personal-use share in the selected period."
      ),
      table(
        "Maintenance by type",
        [{ key: "maintenanceType", label: "Type" }, { key: "count", label: "Jobs" }, { key: "cost", label: "Cost" }],
        maintenanceByType.map((row) => ({ maintenanceType: titleCase(row.maintenanceType), count: formatNumber(row.count), cost: formatCurrency(row.cost) })),
        maintenanceByType.length,
        "Maintenance cost concentration by work type."
      ),
      table(
        "Recent maintenance",
        [
          { key: "status", label: "Status" },
          { key: "workshopName", label: "Workshop" },
          { key: "maintenanceType", label: "Type" },
          { key: "cost", label: "Cost" },
          { key: "maintenanceDate", label: "Date" },
        ],
        maintenance.slice().sort((a, b) => new Date(b.date || b.maintenanceDate || 0) - new Date(a.date || a.maintenanceDate || 0)).slice(0, 8).map((row) => ({
          status: titleCase(row.status),
          workshopName: row.workshopName || "—",
          maintenanceType: titleCase(row.maintenanceType),
          cost: formatCurrency(row.cost || row.totalCost),
          maintenanceDate: formatDate(row.date || row.maintenanceDate),
        })),
        maintenance.length,
        "Latest vehicle maintenance entries."
      ),
      table(
        "Recent refuels",
        [
          { key: "stationName", label: "Station" },
          { key: "liters", label: "Liters" },
          { key: "amount", label: "Amount" },
          { key: "refuelDate", label: "Date" },
        ],
        refuels.slice().sort((a, b) => new Date(b.date || b.refuelDate || 0) - new Date(a.date || a.refuelDate || 0)).slice(0, 8).map((row) => ({
          stationName: row.stationName || "—",
          liters: safeNumber(row.liters).toFixed(1),
          amount: formatCurrency(row.cost || row.amount),
          refuelDate: formatDate(row.date || row.refuelDate),
        })),
        refuels.length,
        "Latest refuel entries captured for the fleet."
      ),
    ],
  });
}

async function buildPrimaryOrderRequestModule(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  const currentMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), ...sourceRoleFilter(PRIMARY_SOURCE_ROLES) }, "transactionAt", currentRange));
  const previousMatch = scopedOrderQuery(models, scope, applyDateFilter({ ...orderTransactionFilter(), ...sourceRoleFilter(PRIMARY_SOURCE_ROLES) }, "transactionAt", previousRange));
  const [currentOrders, previousOrders, statusAgg, recentRows] = await Promise.all([
    models.WarehouseTransactionModel.countDocuments(currentMatch),
    models.WarehouseTransactionModel.countDocuments(previousMatch),
    models.WarehouseTransactionModel.aggregate([{ $match: scopedOrderQuery(models, scope, { ...orderTransactionFilter(), ...sourceRoleFilter(PRIMARY_SOURCE_ROLES) }) }, { $group: { _id: "$requestStatus", count: { $sum: 1 }, total: { $sum: "$grandTotal" } } }, { $sort: { count: -1 } }]),
    models.WarehouseTransactionModel.find(currentMatch).sort({ transactionAt: -1 }).limit(8).select("transactionCode toEntityName requestStatus grandTotal transactionAt").lean(),
  ]);

  return moduleCard("primary-order-request", "Primary Order Request", "Primary order requests and their approval velocity for distributor operations.", {
    badge: "Primary flow",
    heroTone: "indigo",
    kpis: [
      { label: "Requests", value: formatNumber(currentOrders), note: currentLabel },
      { label: "Top state", value: titleCase(statusAgg[0]?._id || "—"), note: statusAgg[0] ? formatNumber(statusAgg[0].count) : "No requests" },
      { label: "Approved value", value: formatCurrency(statusAgg.find((row) => String(row._id || "").toUpperCase() === "APPROVED")?.total), note: "Approved total" },
      { label: "Pending", value: formatNumber(statusAgg.find((row) => String(row._id || "").toUpperCase() === "PENDING")?.count), note: "Awaiting approval" },
    ],
    comparison: compareBlock(currentOrders, previousOrders, currentLabel, previousLabel),
    alerts: [statusAgg.find((row) => String(row._id || "").toUpperCase() === "PENDING")?.count ? "Primary order requests are waiting for approval." : ""],
    insights: [currentOrders ? "Primary order requests can be compared against payment and receipt flow." : "No primary order requests found in this period."],
    tables: [
      table(
        "Primary order statuses",
        [{ key: "status", label: "Status" }, { key: "count", label: "Requests" }, { key: "total", label: "Value" }],
        statusAgg.map((row) => ({ status: titleCase(row._id), count: formatNumber(row.count), total: formatCurrency(row.total) })),
        statusAgg.length,
        "Primary request pipeline status."
      ),
      table(
        "Recent primary requests",
        [
          { key: "orderNo", label: "Order #" },
          { key: "customerName", label: "Customer" },
          { key: "status", label: "Status" },
          { key: "totalAmount", label: "Amount" },
          { key: "createdAt", label: "Created" },
        ],
        recentRows.map((row) => ({
          orderNo: row.transactionCode || "—",
          customerName: row.toEntityName || "—",
          status: titleCase(row.requestStatus),
          totalAmount: formatCurrency(row.grandTotal),
          createdAt: formatDate(row.transactionAt),
        })),
        currentOrders,
        "Latest primary order requests in distributor scope."
      ),
    ],
  });
}

async function buildReportsMeta(models, scope, modules, currentRange, previousRange, currentLabel, previousLabel) {
  const [currentOrders, previousOrders, currentExpensesAgg, previousExpensesAgg, currentGivenLoansAgg, previousGivenLoansAgg, currentReceivedLoansAgg, previousReceivedLoansAgg] = await Promise.all([
    models.SalesOrderModel.countDocuments(scopedSalesOrderQuery(models, scope, applyDateFilter({}, "orderDate", currentRange))),
    models.SalesOrderModel.countDocuments(scopedSalesOrderQuery(models, scope, applyDateFilter({}, "orderDate", previousRange))),
    models.ExpenseModel.aggregate([{ $match: distributorExpenseScope(scope, applyDateFilter({}, "createdAt", currentRange)) }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    models.ExpenseModel.aggregate([{ $match: distributorExpenseScope(scope, applyDateFilter({}, "createdAt", previousRange)) }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    models.LoanModel.aggregate([{ $match: { ...applyDateFilter({}, "loanDate", currentRange), loanType: "given" } }, { $group: { _id: null, total: { $sum: "$principalAmount" } } }]),
    models.LoanModel.aggregate([{ $match: { ...applyDateFilter({}, "loanDate", previousRange), loanType: "given" } }, { $group: { _id: null, total: { $sum: "$principalAmount" } } }]),
    models.LoanModel.aggregate([{ $match: { ...applyDateFilter({}, "loanDate", currentRange), loanType: "received" } }, { $group: { _id: null, total: { $sum: "$principalAmount" } } }]),
    models.LoanModel.aggregate([{ $match: { ...applyDateFilter({}, "loanDate", previousRange), loanType: "received" } }, { $group: { _id: null, total: { $sum: "$principalAmount" } } }]),
  ]);

  const currentExpense = safeNumber(currentExpensesAgg?.[0]?.total);
  const previousExpense = safeNumber(previousExpensesAgg?.[0]?.total);
  const currentGivenLoans = safeNumber(currentGivenLoansAgg?.[0]?.total);
  const previousGivenLoans = safeNumber(previousGivenLoansAgg?.[0]?.total);
  const currentReceivedLoans = safeNumber(currentReceivedLoansAgg?.[0]?.total);
  const previousReceivedLoans = safeNumber(previousReceivedLoansAgg?.[0]?.total);
  const alerts = uniq(modules.flatMap((module) => module.alerts || []).filter(Boolean));
  const insights = uniq(modules.flatMap((module) => module.insights || []).filter(Boolean));

  return {
    headlineKpis: [
      { label: "Report modules", value: formatNumber(modules.length), note: "Available in current role" },
      { label: "Orders", value: formatNumber(currentOrders), note: currentLabel },
      { label: "Expenses", value: formatCurrency(currentExpense), note: currentLabel },
      { label: "Scope", value: scope.isDistributor ? (scope.territoryName || "Territory") : (scope.companyName || "All companies"), note: scope.scopeLabel },
    ],
    orderComparison: compareBlock(currentOrders, previousOrders, currentLabel, previousLabel),
    expenseComparison: compareBlock(currentExpense, previousExpense, currentLabel, previousLabel),
    givenLoanComparison: compareBlock(currentGivenLoans, previousGivenLoans, currentLabel, previousLabel),
    receivedLoanComparison: compareBlock(currentReceivedLoans, previousReceivedLoans, currentLabel, previousLabel),
    alerts: ensureNarrativeRows(alerts.slice(0, 8), `No critical alerts found in ${scope.scopeLabel || "current scope"} for the selected period.`),
    insights: ensureNarrativeRows(insights.slice(0, 8), `Performance is stable across ${scope.scopeLabel || "current scope"}. Use module tables to find improvement opportunities.`),
    cards: modules.map(summarizeCard),
  };
}

async function buildAdminModules(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  return [
    await buildCompaniesModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildProductsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildInventoryModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildTerritoryModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildSalesModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildPaymentsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildAccountsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildProcurementModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildLogisticsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildFinanceModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildExpenseModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildHrModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildComplianceModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildVehicleModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
  ];
}

async function buildDistributorModules(models, scope, currentRange, previousRange, currentLabel, previousLabel) {
  return [
    await buildExpenseModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildFinanceModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildPaymentsModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildPrimaryOrderRequestModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildSalesModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
    await buildComplianceModule(models, scope, currentRange, previousRange, currentLabel, previousLabel),
  ];
}

async function buildMasterReport(req, { period = "month", companyId = "", companyName = "" } = {}) {
  const normalizedPeriod = ["all", "day", "week", "month", "quarter", "year"].includes(period) ? period : "month";
  const range = getPeriodRange(normalizedPeriod);
  const models = await getScopedModels(req, companyId, companyName);
  const scope = await resolveRoleScope(models, resolveViewerScope(req));
  const modules = scope.isDistributor
    ? await buildDistributorModules(models, scope, range.current, range.previous, range.currentLabel, range.previousLabel)
    : await buildAdminModules(models, scope, range.current, range.previous, range.currentLabel, range.previousLabel);
  const summary = await buildReportsMeta(models, scope, modules, range.current, range.previous, range.currentLabel, range.previousLabel);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      period: normalizedPeriod,
      currentLabel: range.currentLabel,
      previousLabel: range.previousLabel,
      role: scope.role,
      scopeLabel: scope.scopeLabel,
      companyId: scope.companyId || companyId || "",
      companyName: scope.companyName || companyName || "",
      availablePeriods: ["all", "day", "week", "month", "quarter", "year"],
    },
    summary,
    modules,
  };
}

const focusAliases = {
  dashboard: "dashboard",
  companies: "companies",
  products: "products",
  inventory: "inventory",
  territory: "territory",
  sales: "sales",
  orders: "orders",
  payments: "payments",
  accounts: "accounts",
  procurement: "procurement",
  logistics: "logistics",
  finance: "finance",
  receipts: "receipts",
  expenses: "expenses",
  hr: "hr",
  compliance: "compliance",
  messages: "messages",
  "live-tracking": "live-tracking",
  vehicles: "vehicles",
  "primary-order-request": "primary-order-request",
  "return-stock": "return-stock",
};

async function buildFocusedReport(req, moduleKey, options = {}) {
  const report = await buildMasterReport(req, options);
  const normalized = focusAliases[asText(moduleKey)] || asText(moduleKey);
  const module = report.modules.find((item) => item.key === normalized);
  if (!module) {
    const error = new Error(`Unknown report module: ${moduleKey}`);
    error.statusCode = 404;
    throw error;
  }
  return {
    meta: report.meta,
    summary: report.summary,
    module,
  };
}

module.exports = {
  buildMasterReport,
  buildFocusedReport,
};