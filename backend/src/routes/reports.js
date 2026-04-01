
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

const REPORT_SECTIONS = [
  { key: "overview", title: "Overview", caption: "Executive command center", accent: "indigo", audience: "all" },
  { key: "primary-sales", title: "Primary Sales", caption: "Distributor-facing order and revenue flow", accent: "emerald", audience: "admin" },
  { key: "secondary-sales", title: "Secondary Sales", caption: "Customer and field-market sales execution", accent: "sky", audience: "all" },
  { key: "return-stock", title: "Return Stock", caption: "Return claims, recovery, and stock reversals", accent: "amber", audience: "all" },
  { key: "inventory", title: "Inventory", caption: "Warehouse, stock health, movement, and risks", accent: "violet", audience: "all" },
  { key: "suppliers", title: "Suppliers", caption: "Supplier network, activity, and delivery support", accent: "cyan", audience: "admin" },
  { key: "salesmen", title: "Salesmen", caption: "Field execution, coverage, and commercial output", accent: "rose", audience: "all" },
  { key: "customers", title: "Customers", caption: "Customer value, activity, and growth", accent: "orange", audience: "all" },
  { key: "distributors", title: "Distributors", caption: "Distributor performance and outstanding exposure", accent: "teal", audience: "admin" },
  { key: "team-performance", title: "Team Performance", caption: "Role-wise productivity and territory coverage", accent: "fuchsia", audience: "all" },
  { key: "delivery-pod", title: "Delivery & POD", caption: "Fulfilment, POD compliance, and dispatch control", accent: "blue", audience: "all" },
  { key: "expenses", title: "Expenses", caption: "Expense control, approvals, and outflow intelligence", accent: "pink", audience: "all" },
  { key: "area-analysis", title: "Area Analysis", caption: "Region, zone, and territory performance", accent: "slate", audience: "all" },
  { key: "recovery", title: "Recovery & Payments", caption: "Primary payments, secondary collections, and receipts", accent: "green", audience: "all" },
  { key: "exceptions", title: "Exceptions", caption: "Critical watchlist and action list", accent: "red", audience: "all" },
];

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

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfQuarter(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth();
  const quarterStart = month - (month % 3);
  d.setMonth(quarterStart, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function resolvePeriodRange(period = "this_month") {
  const now = new Date();
  const end = endOfDay(now);
  switch (String(period || "").trim().toLowerCase()) {
    case "today":
      return { key: "today", label: "Today", start: startOfDay(now), end };
    case "this_week": {
      const start = startOfDay(now);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return { key: "this_week", label: "This week", start, end };
    }
    case "quarter":
    case "this_quarter":
      return { key: "quarter", label: "This quarter", start: startOfQuarter(now), end };
    case "ytd": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { key: "ytd", label: "Year to date", start, end };
    }
    case "last_30_days":
    case "30d": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 29);
      return { key: "30d", label: "Last 30 days", start, end };
    }
    case "last_90_days":
    case "90d": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 89);
      return { key: "90d", label: "Last 90 days", start, end };
    }
    case "this_month":
    default:
      return { key: "this_month", label: "This month", start: startOfMonth(now), end };
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString("en-PK");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-PK");
}

function compactCurrency(value) {
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

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function deliveryHasPod(order) {
  return Boolean(order?.podUrl || order?.proofOfDeliveryImageUrl);
}

function toTitleCase(value) {
  const input = String(value || "").trim();
  if (!input) return "—";
  return input
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const zoneName = String(currentUser?.zoneName || req.user?.zoneName || "").trim();
  const regionId = String(currentUser?.regionId || req.user?.regionId || "").trim();
  const regionName = String(currentUser?.regionName || req.user?.regionName || "").trim();
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
    zoneName,
    regionId,
    regionName,
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

function applyDateRange(match, field, range) {
  if (!range?.start || !field) return match;
  match[field] = { $gte: range.start, $lte: range.end || new Date() };
  return match;
}

function applyDateRangeWithFallback(match, primaryField, fallbackField, range) {
  if (!range?.start || !primaryField) return match;
  const between = { $gte: range.start, $lte: range.end || new Date() };
  if (!fallbackField) {
    match[primaryField] = between;
    return match;
  }
  match.$and = [
    ...(match.$and || []),
    {
      $or: [
        { [primaryField]: between },
        { [primaryField]: { $exists: false }, [fallbackField]: between },
        { [primaryField]: null, [fallbackField]: between },
      ],
    },
  ];
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

function buildSalesOrderMatch(scope, periodRange, { includeDate = true } = {}) {
  const match = applyCommonScopeFilter({}, scope);
  applyDistributorScope(match, scope, {
    field: "territoryId",
    territoryNameField: "territoryName",
    distributorField: "distributorId",
  });
  if (includeDate) applyDateRangeWithFallback(match, "orderDate", "createdAt", periodRange);
  return match;
}

function buildPrimaryPaymentMatch(scope, periodRange, { includeDate = true } = {}) {
  const match = {};
  if (scope.companyId && !scope.tenantScoped) match.companyId = scope.companyId;
  if (isDistributor(scope.role)) {
    const scoped = [];
    if (scope.distributorId && mongoose.Types.ObjectId.isValid(scope.distributorId)) {
      scoped.push({ distributorId: new mongoose.Types.ObjectId(scope.distributorId) });
    }
    if (scope.territoryId) scoped.push({ territoryId: scope.territoryId });
    if (scope.territoryName) scoped.push({ territoryName: scope.territoryName });
    if (scoped.length) match.$or = scoped;
  }
  if (includeDate) applyDateRangeWithFallback(match, "payDate", "createdAt", periodRange);
  return match;
}

function buildUserMatch(scope) {
  const match = applyCommonScopeFilter({}, scope);
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
  const validIds = userIds
    .filter(Boolean)
    .map((value) => {
      try {
        return new mongoose.Types.ObjectId(String(value));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (!validIds.length) return null;
  return { payerUserId: { $in: validIds } };
}

function buildExpenseMatch(scope, periodRange) {
  const match = applyCommonScopeFilter({}, scope);
  if (isDistributor(scope.role)) {
    const scoped = [];
    if (scope.distributorId && mongoose.Types.ObjectId.isValid(scope.distributorId)) {
      scoped.push({ distributorId: new mongoose.Types.ObjectId(scope.distributorId) });
    }
    if (scope.territoryId) scoped.push({ territory: scope.territoryId });
    if (scope.territoryName) scoped.push({ territory: scope.territoryName });
    if (scoped.length) match.$and = [...(match.$and || []), { $or: scoped }];
  }
  applyDateRange(match, "expenseDate", periodRange);
  return match;
}

function buildInventoryMatch(scope, warehouseHints = []) {
  const match = applyCommonScopeFilter({}, scope);
  if (isDistributor(scope.role)) {
    const scoped = [];
    if (scope.regionId) scoped.push({ regionId: scope.regionId });
    if (scope.regionName) scoped.push({ regionName: scope.regionName });
    if (scope.zoneId) scoped.push({ zoneId: scope.zoneId });
    if (scope.zoneName) scoped.push({ zoneName: scope.zoneName });
    if (warehouseHints.length) scoped.push({ warehouseName: { $in: warehouseHints } });
    if (scoped.length) match.$and = [...(match.$and || []), { $or: scoped }];
  }
  return match;
}

function buildVehicleMatch(scope) {
  const match = applyCommonScopeFilter({}, scope);
  if (isDistributor(scope.role)) {
    const scoped = [];
    if (scope.regionId) scoped.push({ regionId: scope.regionId });
    if (scope.zoneId) scoped.push({ zoneId: scope.zoneId });
    if (scope.regionName) scoped.push({ regionName: scope.regionName });
    if (scope.zoneName) scoped.push({ zoneName: scope.zoneName });
    if (scoped.length) match.$and = [...(match.$and || []), { $or: scoped }];
  }
  return match;
}

function sumOrderQuantity(order) {
  return (order?.items || []).reduce((sum, item) => sum + safeNumber(item.quantity), 0);
}

function buildGroupMap() {
  return new Map();
}

function addToGroup(map, key, payload = {}) {
  const normalizedKey = String(key || "Unassigned").trim() || "Unassigned";
  const previous = map.get(normalizedKey) || {
    key: normalizedKey,
    label: normalizedKey,
    orders: 0,
    quantity: 0,
    amount: 0,
    customers: new Set(),
    lastDate: null,
  };
  previous.orders += safeNumber(payload.orders ?? 1);
  previous.quantity += safeNumber(payload.quantity ?? 0);
  previous.amount += safeNumber(payload.amount ?? 0);
  if (payload.customer) previous.customers.add(String(payload.customer));
  const when = payload.lastDate ? new Date(payload.lastDate) : null;
  if (when && !Number.isNaN(when.getTime())) {
    if (!previous.lastDate || when > previous.lastDate) previous.lastDate = when;
  }
  map.set(normalizedKey, previous);
  return previous;
}

function finalizeGroupMap(map, { limit = 12, sortBy = "amount" } = {}) {
  return Array.from(map.values())
    .map((row) => ({
      key: row.key,
      label: row.label,
      orders: row.orders,
      quantity: row.quantity,
      amount: row.amount,
      customers: row.customers instanceof Set ? row.customers.size : safeNumber(row.customers),
      lastDate: row.lastDate ? row.lastDate.toISOString() : null,
    }))
    .sort((a, b) => safeNumber(b[sortBy]) - safeNumber(a[sortBy]))
    .slice(0, limit);
}

function countBy(list, accessor) {
  const map = new Map();
  for (const item of list || []) {
    const key = accessor(item);
    map.set(key, safeNumber(map.get(key)) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
}

function buildLeaderboards(orders, users = []) {
  const territoryMap = buildGroupMap();
  const regionMap = buildGroupMap();
  const zoneMap = buildGroupMap();
  const distributorMap = buildGroupMap();
  const customerMap = buildGroupMap();
  const warehouseMap = buildGroupMap();
  const salesmanMap = buildGroupMap();
  const supplierMap = buildGroupMap();

  for (const order of orders) {
    const quantity = sumOrderQuantity(order);
    const amount = safeNumber(order.totalAmount);
    const customer = order.customerName || order.customerId || "Customer";
    const territory = order.territoryName || "Unassigned territory";
    const region = order.regionName || "Unassigned region";
    const zone = order.zoneName || "Unassigned zone";
    const distributor = order.distributorName || "Unassigned distributor";
    const warehouse = order.toWarehouseName || "Unassigned warehouse";
    const salesman = order.salesmanId || order.orderBookerId || order.fromEntityName || "Unassigned field user";
    const supplier = normalizeRole(order.fromEntityRole) === "supplier" ? (order.fromEntityName || "Unassigned supplier") : "";

    addToGroup(territoryMap, territory, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
    addToGroup(regionMap, region, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
    addToGroup(zoneMap, zone, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
    addToGroup(distributorMap, distributor, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
    addToGroup(customerMap, customer, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
    addToGroup(warehouseMap, warehouse, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
    addToGroup(salesmanMap, salesman, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
    if (supplier) addToGroup(supplierMap, supplier, { quantity, amount, customer, lastDate: order.orderDate || order.createdAt });
  }

  for (const user of users || []) {
    const role = normalizeRole(user.role);
    if (user.territoryName) addToGroup(territoryMap, user.territoryName, { orders: 0, amount: 0 });
    if (role === "customer") addToGroup(customerMap, user.customerName || user.fullName || user.username || "Customer", { orders: 0, amount: 0 });
    if (role === "distributor") addToGroup(distributorMap, user.distributorName || user.fullName || user.username || "Distributor", { orders: 0, amount: 0 });
    if (role === "salesman" || role === "order booker") addToGroup(salesmanMap, user.fullName || user.username || "Field user", { orders: 0, amount: 0 });
    if (role === "supplier") addToGroup(supplierMap, user.supplierName || user.fullName || user.username || "Supplier", { orders: 0, amount: 0 });
  }

  return {
    territories: finalizeGroupMap(territoryMap, { limit: 10 }),
    regions: finalizeGroupMap(regionMap, { limit: 10 }),
    zones: finalizeGroupMap(zoneMap, { limit: 10 }),
    distributors: finalizeGroupMap(distributorMap, { limit: 10 }),
    customers: finalizeGroupMap(customerMap, { limit: 12 }),
    warehouses: finalizeGroupMap(warehouseMap, { limit: 10 }),
    salesmen: finalizeGroupMap(salesmanMap, { limit: 12 }),
    suppliers: finalizeGroupMap(supplierMap, { limit: 12 }),
  };
}

function buildProductPerformance(orders) {
  const map = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.productName || item.productCode || "Product";
      const previous = map.get(key) || {
        label: key,
        quantity: 0,
        revenue: 0,
        orders: 0,
      };
      previous.quantity += safeNumber(item.quantity);
      previous.revenue += safeNumber(item.quantity) * safeNumber(item.unitPrice);
      previous.orders += 1;
      map.set(key, previous);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 12);
}

function buildSaleBreakdown(orders) {
  const base = {
    primary: { key: "primary", orders: 0, amount: 0, quantity: 0, delivered: 0, customers: new Set() },
    secondary: { key: "secondary", orders: 0, amount: 0, quantity: 0, delivered: 0, customers: new Set() },
  };
  for (const order of orders) {
    const type = normalizeStatus(order.saleType) === "secondary" ? "secondary" : "primary";
    const bucket = base[type];
    bucket.orders += 1;
    bucket.amount += safeNumber(order.totalAmount);
    bucket.quantity += sumOrderQuantity(order);
    if (normalizeStatus(order.status) === "delivered") bucket.delivered += 1;
    if (order.customerName) bucket.customers.add(order.customerName);
  }
  return {
    primary: { ...base.primary, customers: base.primary.customers.size, averageOrderValue: base.primary.orders ? base.primary.amount / base.primary.orders : 0 },
    secondary: { ...base.secondary, customers: base.secondary.customers.size, averageOrderValue: base.secondary.orders ? base.secondary.amount / base.secondary.orders : 0 },
  };
}

function buildStatusMix(orders) {
  const map = new Map();
  for (const order of orders) {
    const status = toTitleCase(order.status || "unknown");
    const previous = map.get(status) || { label: status, count: 0, amount: 0 };
    previous.count += 1;
    previous.amount += safeNumber(order.totalAmount);
    map.set(status, previous);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function buildInventorySnapshot(inventoryMovements, products) {
  const productMap = new Map((products || []).map((item) => [String(item.productId || ""), item]));
  const productState = new Map();
  const warehouseState = new Map();
  const movementTypeState = new Map();

  for (const movement of inventoryMovements || []) {
    const productId = String(movement.productId || "");
    const quantity = safeNumber(movement.quantity);
    const warehouse = movement.warehouseName || "Unassigned warehouse";
    const meta = productMap.get(productId);

    const currentProduct = productState.get(productId) || {
      productId,
      productName: movement.productName || meta?.name || "Product",
      category: meta?.category || "—",
      minStockLevel: safeNumber(meta?.minStockLevel),
      inbound: 0,
      outbound: 0,
      returns: 0,
      adjustments: 0,
      lastMovementAt: null,
    };

    if (["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN", "ADJUSTMENT"].includes(movement.movementType)) currentProduct.inbound += quantity;
    if (["TRANSFER_OUT", "SALE_OUT"].includes(movement.movementType)) currentProduct.outbound += quantity;
    if (movement.movementType === "RETURN_IN") currentProduct.returns += quantity;
    if (movement.movementType === "ADJUSTMENT") currentProduct.adjustments += quantity;
    const movementDate = movement.createdAt ? new Date(movement.createdAt) : null;
    if (movementDate && !Number.isNaN(movementDate.getTime())) {
      if (!currentProduct.lastMovementAt || movementDate > currentProduct.lastMovementAt) currentProduct.lastMovementAt = movementDate;
    }
    productState.set(productId, currentProduct);

    const currentWarehouse = warehouseState.get(warehouse) || {
      warehouse,
      inbound: 0,
      outbound: 0,
      returns: 0,
      movements: 0,
      onHand: 0,
    };
    if (["PURCHASE_IN", "TRANSFER_IN", "RETURN_IN", "ADJUSTMENT"].includes(movement.movementType)) currentWarehouse.inbound += quantity;
    if (["TRANSFER_OUT", "SALE_OUT"].includes(movement.movementType)) currentWarehouse.outbound += quantity;
    if (movement.movementType === "RETURN_IN") currentWarehouse.returns += quantity;
    currentWarehouse.movements += 1;
    warehouseState.set(warehouse, currentWarehouse);

    const movementType = toTitleCase(movement.movementType || "movement");
    movementTypeState.set(movementType, safeNumber(movementTypeState.get(movementType)) + quantity);
  }

  const stockRows = Array.from(productState.values())
    .map((row) => {
      const onHand = row.inbound - row.outbound;
      return {
        ...row,
        onHand,
        risk: onHand <= safeNumber(row.minStockLevel) ? "Critical" : onHand <= safeNumber(row.minStockLevel) * 1.5 ? "Watch" : "Healthy",
        lastMovementAt: row.lastMovementAt ? row.lastMovementAt.toISOString() : null,
      };
    })
    .sort((a, b) => a.onHand - b.onHand);

  const warehouseRows = Array.from(warehouseState.values())
    .map((row) => ({ ...row, onHand: row.inbound - row.outbound }))
    .sort((a, b) => b.onHand - a.onHand);

  return {
    totalProducts: products?.length || stockRows.length,
    onHandUnits: stockRows.reduce((sum, row) => sum + safeNumber(row.onHand), 0),
    lowStockCount: stockRows.filter((row) => row.risk === "Critical").length,
    watchStockCount: stockRows.filter((row) => row.risk === "Watch").length,
    stockRows,
    lowStockRows: stockRows.filter((row) => row.risk !== "Healthy").slice(0, 12),
    warehouseRows,
    movementTypes: Array.from(movementTypeState.entries()).map(([label, quantity]) => ({ label, quantity })).sort((a, b) => b.quantity - a.quantity),
  };
}

function buildExpenseSnapshot(expenses) {
  const categoryMap = new Map();
  const methodMap = new Map();
  let total = 0;
  let approved = 0;
  let pending = 0;
  for (const item of expenses || []) {
    const amount = safeNumber(item.amount);
    total += amount;
    if (["approved", "paid", "posted"].includes(normalizeStatus(item.status))) approved += amount;
    if (normalizeStatus(item.status) === "pending") pending += amount;
    const category = item.category || item.expenseType || item.subType || "Unclassified";
    const categoryRow = categoryMap.get(category) || { label: category, amount: 0, count: 0 };
    categoryRow.amount += amount;
    categoryRow.count += 1;
    categoryMap.set(category, categoryRow);
    const method = item.paymentMethod || item.paymentMode || "unknown";
    methodMap.set(method, safeNumber(methodMap.get(method)) + amount);
  }
  return {
    total,
    approved,
    pending,
    byCategory: Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 12),
    byMethod: Array.from(methodMap.entries()).map(([label, amount]) => ({ label: toTitleCase(label), amount })).sort((a, b) => b.amount - a.amount),
  };
}

function buildTeamSnapshot(users) {
  const roles = new Map();
  const territories = new Map();
  const statuses = new Map();
  const summary = {
    totalUsers: users?.length || 0,
    activeUsers: 0,
    salesmen: 0,
    orderBookers: 0,
    suppliers: 0,
    customers: 0,
    distributors: 0,
    companyAdmins: 0,
  };
  for (const user of users || []) {
    const role = user.role || "Unknown";
    const normalizedRole = normalizeRole(role);
    roles.set(role, safeNumber(roles.get(role)) + 1);
    statuses.set(toTitleCase(user.status || "unknown"), safeNumber(statuses.get(toTitleCase(user.status || "unknown"))) + 1);
    const territory = user.territoryName || user.zoneName || user.regionName || "Unassigned";
    territories.set(territory, safeNumber(territories.get(territory)) + 1);
    if (normalizeStatus(user.status) === "active") summary.activeUsers += 1;
    if (normalizedRole === "salesman") summary.salesmen += 1;
    if (normalizedRole === "order booker") summary.orderBookers += 1;
    if (normalizedRole === "supplier") summary.suppliers += 1;
    if (normalizedRole === "customer") summary.customers += 1;
    if (normalizedRole === "distributor") summary.distributors += 1;
    if (normalizedRole === "company admin") summary.companyAdmins += 1;
  }
  return {
    summary,
    roles: Array.from(roles.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    territories: Array.from(territories.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    statuses: Array.from(statuses.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };
}

function buildRecoverySnapshot(primaryPayments, secondaryPayments, receipts) {
  const totalPrimary = (primaryPayments || []).reduce((sum, row) => sum + safeNumber(row.amountTotal), 0);
  const outstanding = (primaryPayments || []).reduce((sum, row) => sum + safeNumber(row.amountRemaining), 0);
  const collectedBack = (secondaryPayments || []).reduce((sum, row) => sum + safeNumber(row.amountPaid), 0);
  const receiptAmount = (receipts || []).reduce((sum, row) => sum + safeNumber(row.amount), 0);
  const overdueRows = (primaryPayments || [])
    .filter((row) => safeNumber(row.amountRemaining) > 0 && row.returnDate && new Date(row.returnDate) < new Date())
    .sort((a, b) => new Date(a.returnDate || 0) - new Date(b.returnDate || 0));

  const aging = {
    "0-7": 0,
    "8-15": 0,
    "16-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };

  for (const payment of primaryPayments || []) {
    const remaining = safeNumber(payment.amountRemaining);
    if (!remaining || !payment.returnDate) continue;
    const diffDays = Math.max(0, Math.floor((new Date() - new Date(payment.returnDate)) / (1000 * 60 * 60 * 24)));
    if (diffDays <= 7) aging["0-7"] += remaining;
    else if (diffDays <= 15) aging["8-15"] += remaining;
    else if (diffDays <= 30) aging["16-30"] += remaining;
    else if (diffDays <= 60) aging["31-60"] += remaining;
    else if (diffDays <= 90) aging["61-90"] += remaining;
    else aging["90+"] += remaining;
  }

  return {
    totalPrimary,
    outstanding,
    collectedBack,
    receiptAmount,
    overdueRows,
    aging: Object.entries(aging).map(([bucket, amount]) => ({ bucket, amount })),
  };
}

function buildReturnsSnapshot(returnClaims, inventorySnapshot) {
  const totalClaims = (returnClaims || []).length;
  const totalQuantity = (returnClaims || []).reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const statusCounts = countBy(returnClaims || [], (row) => toTitleCase(row.status || "requested"));
  const returnedToStock = safeNumber(
    (inventorySnapshot?.movementTypes || []).find((row) => normalizeStatus(row.label) === "return in")?.quantity || 0
  );
  return {
    totalClaims,
    totalQuantity,
    returnedToStock,
    statusCounts,
    recentClaims: (returnClaims || []).slice(0, 20),
  };
}

function buildDeliverySnapshot(orders) {
  const dispatched = orders.filter((row) => normalizeStatus(row.status) === "dispatched");
  const delivered = orders.filter((row) => normalizeStatus(row.status) === "delivered");
  const podUploaded = delivered.filter((row) => deliveryHasPod(row));
  const missingPod = delivered.filter((row) => !deliveryHasPod(row));
  const delayedDispatch = dispatched.filter((row) => {
    const base = new Date(row.dispatchedAt || row.updatedAt || row.createdAt || row.orderDate || 0);
    return base && !Number.isNaN(base.getTime()) && (Date.now() - base.getTime()) > 48 * 60 * 60 * 1000;
  });
  return {
    dispatched: dispatched.length,
    delivered: delivered.length,
    podUploaded: podUploaded.length,
    missingPod: missingPod.length,
    delayedDispatch: delayedDispatch.length,
    recentDelivered: delivered.slice(0, 20),
    recentMissingPod: missingPod.slice(0, 20),
  };
}

function buildInsightMessages({ saleBreakdown, inventorySnapshot, recoverySnapshot, expenseSnapshot, teamSnapshot, deliverySnapshot, leaderboards, returnsSnapshot }) {
  const insights = [];
  if (saleBreakdown.secondary.amount > saleBreakdown.primary.amount) {
    insights.push("Secondary sales are currently leading revenue contribution over primary sales.");
  } else {
    insights.push("Primary sales remain the stronger revenue engine in the selected scope.");
  }
  if (inventorySnapshot.lowStockCount > 0) {
    insights.push(`${inventorySnapshot.lowStockCount} products are at critical stock risk and need replenishment attention.`);
  }
  if (recoverySnapshot.overdueRows.length > 0) {
    insights.push(`${recoverySnapshot.overdueRows.length} recovery records are overdue beyond their return date.`);
  }
  if (deliverySnapshot.missingPod > 0) {
    insights.push(`${deliverySnapshot.missingPod} delivered orders are still missing Proof of Delivery.`);
  }
  if (expenseSnapshot.pending > 0) {
    insights.push(`Pending expense approvals currently represent ${formatCurrency(expenseSnapshot.pending)} of review workload.`);
  }
  if ((leaderboards.territories || []).length) {
    const top = leaderboards.territories[0];
    insights.push(`${top.label} is the highest performing territory with ${formatCurrency(top.amount)} in sales.`);
  }
  if (returnsSnapshot.totalClaims > 0) {
    insights.push(`${returnsSnapshot.totalClaims} return claims were recorded in the current reporting period.`);
  }
  if (teamSnapshot.summary.activeUsers > 0) {
    insights.push(`${teamSnapshot.summary.activeUsers} active users are participating in the current business scope.`);
  }
  return insights.slice(0, 6);
}

function buildAlerts({ inventorySnapshot, recoverySnapshot, deliverySnapshot, returnsSnapshot, saleBreakdown, orders }) {
  const alerts = [];
  for (const row of recoverySnapshot.overdueRows.slice(0, 4)) {
    alerts.push({
      severity: "critical",
      title: `Overdue payment • ${row.distributorName || row.territoryName || row.invoiceNo}`,
      description: `${formatCurrency(row.amountRemaining)} is overdue since ${formatDate(row.returnDate)}.`,
      route: "recovery",
      meta: row.invoiceNo || row.distributorName || "Recovery",
    });
  }
  for (const row of inventorySnapshot.lowStockRows.slice(0, 4)) {
    alerts.push({
      severity: row.risk === "Critical" ? "critical" : "warning",
      title: `Low stock • ${row.productName}`,
      description: `On hand ${formatNumber(row.onHand)} vs minimum ${formatNumber(row.minStockLevel)}.`,
      route: "inventory",
      meta: row.category || "Inventory",
    });
  }
  for (const row of deliverySnapshot.recentMissingPod.slice(0, 4)) {
    alerts.push({
      severity: "warning",
      title: `Missing POD • ${row.orderNo}`,
      description: `${row.customerName || "Customer"} order is delivered but POD is not uploaded.`,
      route: "delivery-pod",
      meta: row.territoryName || row.toWarehouseName || "Delivery",
    });
  }
  for (const row of (returnsSnapshot.recentClaims || []).slice(0, 3)) {
    alerts.push({
      severity: normalizeStatus(row.status) === "requested" ? "warning" : "info",
      title: `Return claim • ${row.orderNo}`,
      description: `${row.customerName} raised a return claim for ${formatNumber(row.quantity)} units.`,
      route: "return-stock",
      meta: toTitleCase(row.status),
    });
  }
  const pendingOrders = orders.filter((row) => normalizeStatus(row.status) === "pending").length;
  if (pendingOrders > 0) {
    alerts.push({
      severity: "warning",
      title: "Pending order approvals",
      description: `${formatNumber(pendingOrders)} orders still require operational approval.`,
      route: "overview",
      meta: "Orders",
    });
  }
  if (saleBreakdown.secondary.orders === 0) {
    alerts.push({
      severity: "info",
      title: "Secondary sales are inactive",
      description: "No secondary sales were recorded in the selected period.",
      route: "secondary-sales",
      meta: "Sales",
    });
  }
  return alerts.slice(0, 12);
}

function buildRecentActivity(orders, receipts, expenses) {
  const orderRows = (orders || []).slice(0, 8).map((row) => ({
    id: `order-${row._id}`,
    title: `${toTitleCase(row.saleType)} sale • ${row.orderNo}`,
    meta: `${row.customerName || "Customer"} • ${toTitleCase(row.status)}`,
    at: row.orderDate || row.createdAt || new Date(),
  }));
  const receiptRows = (receipts || []).slice(0, 5).map((row) => ({
    id: `receipt-${row._id}`,
    title: `Receipt • ${row.receiptNo}`,
    meta: `${row.payerName || row.payerRole || "Payer"} • ${formatCurrency(row.amount)}`,
    at: row.paymentDate || row.createdAt || new Date(),
  }));
  const expenseRows = (expenses || []).slice(0, 5).map((row) => ({
    id: `expense-${row._id}`,
    title: `Expense • ${row.title || row.category || "Expense"}`,
    meta: `${toTitleCase(row.status)} • ${formatCurrency(row.amount)}`,
    at: row.expenseDate || row.createdAt || new Date(),
  }));
  return [...orderRows, ...receiptRows, ...expenseRows]
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 14);
}

function buildNavigator(scope) {
  const basePath = isDistributor(scope.role) ? "/dashboards/distributor/reports" : "/dashboards/admin/reports";
  return REPORT_SECTIONS
    .filter((item) => item.audience !== "admin" || !isDistributor(scope.role))
    .map((item) => ({
      ...item,
      href: `${basePath}/${item.key}`,
    }));
}

function buildCompanySummary(users, orders) {
  const companyMap = new Map();
  for (const order of orders || []) {
    const company = order.companyName || order.companyId || "Current scope";
    const previous = companyMap.get(company) || { label: company, revenue: 0, orders: 0 };
    previous.revenue += safeNumber(order.totalAmount);
    previous.orders += 1;
    companyMap.set(company, previous);
  }
  for (const user of users || []) {
    const company = user.companyName || user.companyId || "Current scope";
    const previous = companyMap.get(company) || { label: company, revenue: 0, orders: 0 };
    companyMap.set(company, previous);
  }
  return Array.from(companyMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 12);
}

async function gatherReportBundle(req) {
  const requestedCompanyId = String(req.query?.companyId || "").trim();
  const requestedCompanyName = String(req.query?.companyName || "").trim();
  const periodRange = resolvePeriodRange(req.query?.period || "this_month");
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
    ReturnClaimModel,
  } = models;

  const currentUser = await resolveCurrentUser(req, UserModel);
  const scope = { ...buildScope(req, currentUser), tenantScoped: Boolean(models.__usesTenantDb) };

  const orderMatch = buildSalesOrderMatch(scope, periodRange);
  const users = await UserModel.find(buildUserMatch(scope))
    .select("fullName username role status territoryName territoryId zoneName zoneId regionName regionId fieldName distributorId distributorName customerName supplierName companyId companyName createdAt updatedAt warehouseName")
    .sort({ createdAt: -1 })
    .limit(2500)
    .lean();

  const orders = await SalesOrderModel.find(orderMatch)
    .select("orderNo saleType sourceType customerName customerId distributorName distributorId territoryName territoryId zoneName zoneId regionName regionId fieldName salesmanId orderBookerId fromEntityName fromEntityRole status orderDate createdAt updatedAt toWarehouseName totalAmount items podUrl proofOfDeliveryImageUrl dispatchedAt deliveredAt invoiceNo")
    .sort({ orderDate: -1, createdAt: -1 })
    .limit(2500)
    .lean();

  const warehouseHints = Array.from(new Set(orders.map((item) => item.toWarehouseName).filter(Boolean)));

  const [
    primaryPayments,
    secondaryPayments,
    products,
    inventoryMovements,
    expenses,
    warehouses,
    vehicles,
    transfers,
    returnClaims,
  ] = await Promise.all([
    PrimaryPaymentModel.find(buildPrimaryPaymentMatch(scope, periodRange, { includeDate: false })).sort({ payDate: -1, createdAt: -1 }).limit(1500).lean(),
    SecondaryPaymentModel.find(buildPrimaryPaymentMatch(scope, periodRange)).sort({ paidDate: -1, createdAt: -1 }).limit(1500).lean(),
    ProductModel.find(applyCommonScopeFilter({}, scope)).select("productId name category minStockLevel companyId companyName").limit(3000).lean(),
    InventoryMovementModel.find(buildInventoryMatch(scope, warehouseHints)).sort({ createdAt: -1 }).limit(4000).lean(),
    ExpenseModel.find(buildExpenseMatch(scope, periodRange)).sort({ expenseDate: -1, createdAt: -1 }).limit(1500).lean(),
    WarehouseModel.find(applyCommonScopeFilter({}, scope)).select("warehouseId name region status companyId companyName").limit(400).lean(),
    VehicleModel.find(buildVehicleMatch(scope)).select("registrationNo type make model status regionName zoneName companyId companyName").limit(400).lean(),
    StockTransferModel.find(applyCommonScopeFilter({}, scope)).sort({ createdAt: -1 }).limit(1000).lean(),
    ReturnClaimModel.find(applyDateRange(applyCommonScopeFilter({}, scope), "createdAt", periodRange)).sort({ createdAt: -1 }).limit(1000).lean(),
  ]);

  const relevantUserIds = users
    .map((value) => String(value._id || ""))
    .filter(Boolean);
  if (currentUser?._id) relevantUserIds.push(String(currentUser._id));

  const receiptFilter = isDistributor(scope.role)
    ? buildReceiptUserIdsFilter(relevantUserIds)
    : buildReceiptUserIdsFilter(relevantUserIds) || applyCommonScopeFilter({}, scope);

  const receipts = receiptFilter
    ? await ReceiptModel.find(receiptFilter).sort({ paymentDate: -1, createdAt: -1 }).limit(1500).lean()
    : [];

  const saleBreakdown = buildSaleBreakdown(orders);
  const statusMix = buildStatusMix(orders);
  const leaderboards = buildLeaderboards(orders, users);
  const productPerformance = buildProductPerformance(orders);
  const inventorySnapshot = buildInventorySnapshot(inventoryMovements, products);
  const expenseSnapshot = buildExpenseSnapshot(expenses);
  const teamSnapshot = buildTeamSnapshot(users);
  const recoverySnapshot = buildRecoverySnapshot(primaryPayments, secondaryPayments, receipts);
  const returnsSnapshot = buildReturnsSnapshot(returnClaims, inventorySnapshot);
  const deliverySnapshot = buildDeliverySnapshot(orders);
  const insights = buildInsightMessages({ saleBreakdown, inventorySnapshot, recoverySnapshot, expenseSnapshot, teamSnapshot, deliverySnapshot, leaderboards, returnsSnapshot });
  const alerts = buildAlerts({ inventorySnapshot, recoverySnapshot, deliverySnapshot, returnsSnapshot, saleBreakdown, orders });
  const activity = buildRecentActivity(orders, receipts, expenses);
  const companySummary = buildCompanySummary(users, orders);

  return {
    scope,
    periodRange,
    models,
    users,
    orders,
    receipts,
    expenses,
    primaryPayments,
    secondaryPayments,
    warehouses,
    vehicles,
    transfers,
    products,
    returnClaims,
    saleBreakdown,
    statusMix,
    leaderboards,
    productPerformance,
    inventorySnapshot,
    expenseSnapshot,
    teamSnapshot,
    recoverySnapshot,
    returnsSnapshot,
    deliverySnapshot,
    insights,
    alerts,
    activity,
    companySummary,
  };
}

function buildOverviewPayload(bundle) {
  const { scope, periodRange, saleBreakdown, inventorySnapshot, expenseSnapshot, teamSnapshot, recoverySnapshot, deliverySnapshot, returnsSnapshot, alerts, leaderboards, activity, companySummary, warehouses, vehicles, transfers, insights } = bundle;
  const totalOrders = saleBreakdown.primary.orders + saleBreakdown.secondary.orders;
  const totalRevenue = saleBreakdown.primary.amount + saleBreakdown.secondary.amount;

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    roleScope: scope.role || "admin",
    scopeLabel: scope.companyName || scope.companyId || "All accessible companies",
    periodLabel: periodRange.label,
    hero: {
      eyebrow: isDistributor(scope.role) ? "Territory reporting cockpit" : "Business intelligence workspace",
      title: isDistributor(scope.role) ? "Distributor reports command center" : "Professional reports command center",
      subtitle: isDistributor(scope.role)
        ? "Monitor your territory, customers, salesmen, order bookers, delivery execution, and outstanding recovery from one responsive reporting surface."
        : "Monitor company performance across sales, returns, inventory, suppliers, customers, distributors, delivery, expenses, areas, and exceptions.",
    },
    spotlight: [
      { key: "revenue", label: "Total Revenue", value: formatCurrency(totalRevenue), helper: `${formatNumber(totalOrders)} orders in ${periodRange.label.toLowerCase()}`, tone: "emerald" },
      { key: "primary", label: "Primary Sales", value: formatCurrency(saleBreakdown.primary.amount), helper: `${formatNumber(saleBreakdown.primary.orders)} distributor-facing orders`, tone: "sky" },
      { key: "secondary", label: "Secondary Sales", value: formatCurrency(saleBreakdown.secondary.amount), helper: `${formatNumber(saleBreakdown.secondary.orders)} market execution orders`, tone: "indigo" },
      { key: "outstanding", label: "Outstanding", value: formatCurrency(recoverySnapshot.outstanding), helper: `${formatNumber(recoverySnapshot.overdueRows.length)} overdue records`, tone: "rose" },
      { key: "stock", label: "On-hand Units", value: formatNumber(inventorySnapshot.onHandUnits), helper: `${formatNumber(inventorySnapshot.lowStockCount)} critical low stock`, tone: "amber" },
      { key: "expenses", label: "Expenses", value: formatCurrency(expenseSnapshot.total), helper: `${formatCurrency(expenseSnapshot.pending)} pending approvals`, tone: "violet" },
      { key: "customers", label: "Customers", value: formatNumber(teamSnapshot.summary.customers), helper: `${formatNumber(teamSnapshot.summary.activeUsers)} active users in scope`, tone: "cyan" },
      { key: "delivery", label: "POD Compliance", value: `${deliverySnapshot.delivered ? Math.round((deliverySnapshot.podUploaded / Math.max(deliverySnapshot.delivered, 1)) * 100) : 0}%`, helper: `${formatNumber(deliverySnapshot.missingPod)} deliveries missing POD`, tone: "fuchsia" },
    ],
    navigator: buildNavigator(scope),
    teamCounts: [
      { label: "Salesmen", value: teamSnapshot.summary.salesmen },
      { label: "Order Bookers", value: teamSnapshot.summary.orderBookers },
      { label: "Suppliers", value: teamSnapshot.summary.suppliers },
      { label: "Customers", value: teamSnapshot.summary.customers },
      ...(isDistributor(scope.role) ? [] : [{ label: "Distributors", value: teamSnapshot.summary.distributors }]),
      { label: "Warehouses", value: warehouses.length },
      { label: "Vehicles", value: vehicles.length },
      { label: "Open Transfers", value: transfers.filter((row) => !["completed"].includes(normalizeStatus(row.status))).length },
    ],
    insights,
    alerts,
    leaderboards: {
      territories: leaderboards.territories.slice(0, 6),
      customers: leaderboards.customers.slice(0, 6),
      distributors: leaderboards.distributors.slice(0, 6),
      salesmen: leaderboards.salesmen.slice(0, 6),
      suppliers: leaderboards.suppliers.slice(0, 6),
      companies: companySummary.slice(0, 6),
    },
    sectionsPreview: [
      {
        key: "sales",
        title: "Commercial pulse",
        points: [
          `${compactCurrency(totalRevenue)} revenue captured`,
          `${formatNumber(saleBreakdown.primary.orders)} primary orders`,
          `${formatNumber(saleBreakdown.secondary.orders)} secondary orders`,
        ],
      },
      {
        key: "inventory",
        title: "Warehouse posture",
        points: [
          `${formatNumber(inventorySnapshot.totalProducts)} products tracked`,
          `${formatNumber(inventorySnapshot.lowStockCount)} low stock alerts`,
          `${formatNumber(inventorySnapshot.warehouseRows.length)} warehouses in movement history`,
        ],
      },
      {
        key: "recovery",
        title: "Recovery watch",
        points: [
          `${formatCurrency(recoverySnapshot.outstanding)} outstanding`,
          `${formatCurrency(recoverySnapshot.collectedBack)} secondary recovered`,
          `${formatNumber(recoverySnapshot.overdueRows.length)} overdue records`,
        ],
      },
      {
        key: "delivery",
        title: "Delivery execution",
        points: [
          `${formatNumber(deliverySnapshot.dispatched)} dispatched`,
          `${formatNumber(deliverySnapshot.delivered)} delivered`,
          `${formatNumber(deliverySnapshot.missingPod)} missing POD`,
        ],
      },
      {
        key: "returns",
        title: "Returns and claims",
        points: [
          `${formatNumber(returnsSnapshot.totalClaims)} return claims`,
          `${formatNumber(returnsSnapshot.totalQuantity)} units in claims`,
          `${formatNumber(returnsSnapshot.returnedToStock)} units returned to stock`,
        ],
      },
      {
        key: "expenses",
        title: "Expense control",
        points: [
          `${formatCurrency(expenseSnapshot.total)} total expense`,
          `${formatCurrency(expenseSnapshot.approved)} cleared`,
          `${formatCurrency(expenseSnapshot.pending)} pending review`,
        ],
      },
    ],
    recentActivity: activity,
    detailDefaults: {
      section: "overview",
      columns: ["Section", "What management sees", "Why it matters"],
      rows: buildNavigator(scope).map((item) => [item.title, item.caption, "Operational decision-making"]),
    },
  };
}

function rowsFromGroup(entries) {
  return entries.map((row) => [
    row.label,
    formatCurrency(row.amount),
    formatNumber(row.orders),
    formatNumber(row.quantity),
    formatNumber(row.customers),
    row.lastDate ? formatDate(row.lastDate) : "—",
  ]);
}

function buildSectionPayload(bundle, sectionKey) {
  const { scope, periodRange, saleBreakdown, statusMix, leaderboards, inventorySnapshot, expenseSnapshot, teamSnapshot, recoverySnapshot, returnsSnapshot, deliverySnapshot, orders, users, expenses, primaryPayments, secondaryPayments, receipts, alerts } = bundle;

  const navigator = buildNavigator(scope);
  const base = {
    ok: true,
    section: sectionKey,
    generatedAt: new Date().toISOString(),
    scopeLabel: scope.companyName || scope.companyId || "All accessible companies",
    roleScope: scope.role || "admin",
    periodLabel: periodRange.label,
    navigator,
    relatedSections: navigator.filter((item) => item.key !== sectionKey).slice(0, 6),
  };

  switch (sectionKey) {
    case "primary-sales": {
      const primaryOrders = orders.filter((row) => normalizeStatus(row.saleType) !== "secondary");
      return {
        ...base,
        title: "Primary Sales Reports",
        subtitle: "Distributor-facing sales, warehouse dispatch support, and primary commercial movement.",
        cards: [
          { label: "Revenue", value: formatCurrency(saleBreakdown.primary.amount), helper: `${formatNumber(saleBreakdown.primary.orders)} primary orders` },
          { label: "Quantity", value: formatNumber(saleBreakdown.primary.quantity), helper: `${formatNumber(saleBreakdown.primary.customers)} customers / distributors served` },
          { label: "Delivered", value: `${formatNumber(saleBreakdown.primary.delivered)}`, helper: "Delivered primary orders" },
          { label: "Average order", value: formatCurrency(saleBreakdown.primary.averageOrderValue), helper: "Average primary order value" },
        ],
        insights: [
          "Use this report to track distributor-side order placement, warehouse fulfilment, and distributor revenue concentration.",
          primaryOrders.length ? `${primaryOrders[0].territoryName || primaryOrders[0].distributorName || "Top scope"} appears first in recent primary sales activity.` : "No primary sales found in the selected period.",
        ],
        columns: ["Distributor / Territory", "Revenue", "Orders", "Qty", "Customers", "Last activity"],
        rows: rowsFromGroup(leaderboards.distributors.length ? leaderboards.distributors : leaderboards.territories),
      };
    }
    case "secondary-sales": {
      const secondaryOrders = orders.filter((row) => normalizeStatus(row.saleType) === "secondary");
      return {
        ...base,
        title: "Secondary Sales Reports",
        subtitle: "Customer-facing sales, field-market execution, and secondary market coverage.",
        cards: [
          { label: "Revenue", value: formatCurrency(saleBreakdown.secondary.amount), helper: `${formatNumber(saleBreakdown.secondary.orders)} secondary orders` },
          { label: "Quantity", value: formatNumber(saleBreakdown.secondary.quantity), helper: `${formatNumber(saleBreakdown.secondary.customers)} customers served` },
          { label: "Delivered", value: `${formatNumber(saleBreakdown.secondary.delivered)}`, helper: "Delivered secondary orders" },
          { label: "Average order", value: formatCurrency(saleBreakdown.secondary.averageOrderValue), helper: "Average secondary order value" },
        ],
        insights: [
          "This report helps company admins and distributors track customer-market movement and field order productivity.",
          secondaryOrders.length ? `${secondaryOrders.filter((row) => normalizeStatus(row.status) === "pending").length} secondary orders are still pending action.` : "No secondary sales found in the selected period.",
        ],
        columns: ["Customer", "Revenue", "Orders", "Qty", "Customers", "Last activity"],
        rows: rowsFromGroup(leaderboards.customers),
      };
    }
    case "return-stock":
      return {
        ...base,
        title: "Return Stock Reports",
        subtitle: "Return claims, stock reverse movement, claim status, and return quantity visibility.",
        cards: [
          { label: "Return claims", value: formatNumber(returnsSnapshot.totalClaims), helper: "Claims raised in current period" },
          { label: "Claim quantity", value: formatNumber(returnsSnapshot.totalQuantity), helper: "Units attached to return claims" },
          { label: "Returned to stock", value: formatNumber(returnsSnapshot.returnedToStock), helper: "Inventory return-in quantity" },
          { label: "Open claims", value: formatNumber(returnsSnapshot.recentClaims.filter((row) => normalizeStatus(row.status) === "requested").length), helper: "Need review / resolution" },
        ],
        insights: [
          "Use this report to connect return claims with operational stock reversal visibility.",
          returnsSnapshot.statusCounts.length ? `${returnsSnapshot.statusCounts[0].count} claims are in the ${returnsSnapshot.statusCounts[0].key} stage.` : "No return claims recorded in the selected period.",
        ],
        columns: ["Order No", "Customer", "Reason", "Status", "Qty", "Created"],
        rows: returnsSnapshot.recentClaims.map((row) => [
          row.orderNo || "—",
          row.customerName || "—",
          row.reason || "—",
          toTitleCase(row.status),
          formatNumber(row.quantity),
          formatDate(row.createdAt),
        ]),
      };
    case "inventory":
      return {
        ...base,
        title: "Inventory Reports",
        subtitle: "Warehouse inventory, movement type split, low stock watchlist, and stock posture.",
        cards: [
          { label: "Products", value: formatNumber(inventorySnapshot.totalProducts), helper: "Tracked products" },
          { label: "On-hand", value: formatNumber(inventorySnapshot.onHandUnits), helper: "Current on-hand units" },
          { label: "Critical low stock", value: formatNumber(inventorySnapshot.lowStockCount), helper: "Immediate replenishment risk" },
          { label: "Watchlist", value: formatNumber(inventorySnapshot.watchStockCount), helper: "Monitor soon" },
        ],
        insights: [
          "This section should cover the important operational areas from Warehouse & Inventory: on-hand balance, movement, warehouse split, and low-stock action.",
          inventorySnapshot.warehouseRows.length ? `${inventorySnapshot.warehouseRows[0].warehouse} currently leads warehouse stock balance.` : "No inventory movements found in scope.",
        ],
        columns: ["Product", "Category", "On hand", "Inbound", "Outbound", "Returns", "Minimum", "Risk"],
        rows: inventorySnapshot.lowStockRows.length ? inventorySnapshot.lowStockRows.map((row) => [
          row.productName,
          row.category || "—",
          formatNumber(row.onHand),
          formatNumber(row.inbound),
          formatNumber(row.outbound),
          formatNumber(row.returns),
          formatNumber(row.minStockLevel),
          row.risk,
        ]) : inventorySnapshot.stockRows.slice(0, 20).map((row) => [
          row.productName,
          row.category || "—",
          formatNumber(row.onHand),
          formatNumber(row.inbound),
          formatNumber(row.outbound),
          formatNumber(row.returns),
          formatNumber(row.minStockLevel),
          row.risk,
        ]),
      };
    case "suppliers": {
      const supplierRows = users.filter((row) => normalizeRole(row.role) === "supplier");
      return {
        ...base,
        title: "Supplier Reports",
        subtitle: "Supplier network, coverage, active accounts, and supplier-linked delivery support.",
        cards: [
          { label: "Suppliers", value: formatNumber(teamSnapshot.summary.suppliers), helper: "Supplier accounts in scope" },
          { label: "Active suppliers", value: formatNumber(supplierRows.filter((row) => normalizeStatus(row.status) === "active").length), helper: "Currently active" },
          { label: "Warehouses", value: formatNumber(bundle.warehouses.length), helper: "Potential supply handoff points" },
          { label: "Inbound focus", value: formatNumber(inventorySnapshot.movementTypes.find((row) => normalizeStatus(row.label) === "purchase in")?.quantity || 0), helper: "Purchase inbound quantity" },
        ],
        insights: [
          "This report gives company admins a dedicated supplier view with account coverage and supply-side operational context.",
          supplierRows.length ? `${supplierRows.length} supplier records are available in the selected scope.` : "No supplier accounts found in the selected scope.",
        ],
        columns: ["Supplier", "Status", "Territory", "Warehouse", "Company", "Created"],
        rows: supplierRows.slice(0, 40).map((row) => [
          row.fullName || row.supplierName || row.username || "Supplier",
          toTitleCase(row.status),
          row.territoryName || row.zoneName || row.regionName || "—",
          row.warehouseName || "—",
          row.companyName || row.companyId || "—",
          formatDate(row.createdAt),
        ]),
      };
    }
    case "salesmen": {
      const salesmanRows = users.filter((row) => normalizeRole(row.role) === "salesman");
      return {
        ...base,
        title: "Salesmen Reports",
        subtitle: "Field coverage, productivity, territory activity, and sales movement by sales teams.",
        cards: [
          { label: "Salesmen", value: formatNumber(teamSnapshot.summary.salesmen), helper: "Field users in current scope" },
          { label: "Active salesmen", value: formatNumber(salesmanRows.filter((row) => normalizeStatus(row.status) === "active").length), helper: "Active status" },
          { label: "Tracked territories", value: formatNumber(new Set(salesmanRows.map((row) => row.territoryName).filter(Boolean)).size), helper: "Territory spread" },
          { label: "Top field revenue", value: leaderboards.salesmen[0] ? formatCurrency(leaderboards.salesmen[0].amount) : formatCurrency(0), helper: leaderboards.salesmen[0]?.label || "No field output" },
        ],
        insights: [
          "Company admins see all field salesmen in the company. Distributors see only salesmen inside their assigned territory or linked distributor team.",
          leaderboards.salesmen.length ? `${leaderboards.salesmen[0].label} is leading field revenue in the selected period.` : "No salesman-linked sales were found.",
        ],
        columns: ["Salesman / Field user", "Revenue", "Orders", "Qty", "Customers", "Last activity"],
        rows: rowsFromGroup(leaderboards.salesmen),
      };
    }
    case "customers": {
      const customerRows = users.filter((row) => normalizeRole(row.role) === "customer");
      return {
        ...base,
        title: "Customer Reports",
        subtitle: "Customer base, value concentration, order activity, and account engagement.",
        cards: [
          { label: "Customers", value: formatNumber(teamSnapshot.summary.customers), helper: "Customer records in scope" },
          { label: "Top customer", value: leaderboards.customers[0]?.label || "—", helper: leaderboards.customers[0] ? formatCurrency(leaderboards.customers[0].amount) : "No revenue yet" },
          { label: "Primary vs Secondary", value: `${formatNumber(saleBreakdown.primary.customers)} / ${formatNumber(saleBreakdown.secondary.customers)}`, helper: "Distinct customers across sale types" },
          { label: "Recent activity", value: formatNumber(customerRows.filter((row) => normalizeStatus(row.status) === "active").length), helper: "Active customer accounts" },
        ],
        insights: [
          "Company admins and distributors both need customer reporting that shows order value, territory concentration, and which accounts need attention.",
          leaderboards.customers.length ? `${leaderboards.customers[0].label} is currently the highest-value customer.` : "No customer sales found in the selected period.",
        ],
        columns: ["Customer", "Revenue", "Orders", "Qty", "Customers", "Last activity"],
        rows: rowsFromGroup(leaderboards.customers),
      };
    }
    case "distributors": {
      const distributorUsers = users.filter((row) => normalizeRole(row.role) === "distributor");
      return {
        ...base,
        title: "Distributor Reports",
        subtitle: "Distributor performance, revenue movement, outstanding exposure, and operational contribution.",
        cards: [
          { label: "Distributors", value: formatNumber(teamSnapshot.summary.distributors), helper: "Distributor accounts in scope" },
          { label: "Top distributor", value: leaderboards.distributors[0]?.label || "—", helper: leaderboards.distributors[0] ? formatCurrency(leaderboards.distributors[0].amount) : "No revenue yet" },
          { label: "Outstanding", value: formatCurrency(recoverySnapshot.outstanding), helper: "Current primary outstanding" },
          { label: "Overdue", value: formatNumber(recoverySnapshot.overdueRows.length), helper: "Distributor-level overdue records" },
        ],
        insights: [
          "This report is designed for company admins to compare distributor size, order flow, and collection pressure.",
          distributorUsers.length ? `${distributorUsers.length} distributor users are in scope.` : "No distributor users found in the selected scope.",
        ],
        columns: ["Distributor", "Revenue", "Orders", "Qty", "Customers", "Last activity"],
        rows: rowsFromGroup(leaderboards.distributors),
      };
    }
    case "team-performance":
      return {
        ...base,
        title: "Team Performance Reports",
        subtitle: "Role-wise headcount, territory coverage, and team strength for company admins and distributors.",
        cards: [
          { label: "Users", value: formatNumber(teamSnapshot.summary.totalUsers), helper: "All role-based users in scope" },
          { label: "Active", value: formatNumber(teamSnapshot.summary.activeUsers), helper: "Currently active status" },
          { label: "Sales + OB", value: formatNumber(teamSnapshot.summary.salesmen + teamSnapshot.summary.orderBookers), helper: "Field execution team" },
          { label: "Coverage", value: formatNumber(teamSnapshot.territories.length), helper: "Territories / zones represented" },
        ],
        insights: [
          "Company admin view includes distributors, suppliers, and other internal roles. Distributor view focuses on salesmen, order bookers, and customers inside the assigned territory.",
          teamSnapshot.roles.length ? `${teamSnapshot.roles[0].label} is currently the largest user group.` : "No users found in scope.",
        ],
        columns: ["Role", "Headcount", "Status mix", "Territory coverage", "Use"],
        rows: teamSnapshot.roles.map((row) => [
          row.label,
          formatNumber(row.count),
          teamSnapshot.statuses.map((status) => `${status.label}: ${status.count}`).slice(0, 2).join(" • "),
          formatNumber(teamSnapshot.territories.length),
          normalizeRole(row.label).includes("customer") ? "Demand" : "Operations",
        ]),
      };
    case "delivery-pod":
      return {
        ...base,
        title: "Delivery & POD Reports",
        subtitle: "Dispatch, delivered orders, Proof of Delivery compliance, and follow-up action.",
        cards: [
          { label: "Dispatched", value: formatNumber(deliverySnapshot.dispatched), helper: "Orders in route / dispatched" },
          { label: "Delivered", value: formatNumber(deliverySnapshot.delivered), helper: "Delivered orders" },
          { label: "POD uploaded", value: formatNumber(deliverySnapshot.podUploaded), helper: "Completed with POD" },
          { label: "Missing POD", value: formatNumber(deliverySnapshot.missingPod), helper: "Need immediate follow-up" },
        ],
        insights: [
          "This report is designed for salesmen and suppliers doing deliveries, while management sees POD compliance and dispatch exceptions.",
          deliverySnapshot.missingPod ? `${deliverySnapshot.missingPod} deliveries need POD upload or verification.` : "POD compliance is healthy for the current period.",
        ],
        columns: ["Order No", "Customer", "Sale type", "Status", "Territory", "Warehouse", "POD", "Date"],
        rows: orders
          .filter((row) => ["dispatched", "delivered"].includes(normalizeStatus(row.status)))
          .slice(0, 30)
          .map((row) => [
            row.orderNo || "—",
            row.customerName || "—",
            toTitleCase(row.saleType),
            toTitleCase(row.status),
            row.territoryName || "—",
            row.toWarehouseName || "—",
            deliveryHasPod(row) ? "Uploaded" : "Missing",
            formatDate(row.deliveredAt || row.dispatchedAt || row.orderDate || row.createdAt),
          ]),
      };
    case "expenses":
      return {
        ...base,
        title: "Expense Reports",
        subtitle: "All expense movement, categories, payment methods, approvals, and outflow visibility.",
        cards: [
          { label: "Total expense", value: formatCurrency(expenseSnapshot.total), helper: `${formatNumber(expenses.length)} expense records` },
          { label: "Approved / cleared", value: formatCurrency(expenseSnapshot.approved), helper: "Approved, paid, or posted" },
          { label: "Pending", value: formatCurrency(expenseSnapshot.pending), helper: "Pending review / approval" },
          { label: "Top category", value: expenseSnapshot.byCategory[0]?.label || "—", helper: expenseSnapshot.byCategory[0] ? formatCurrency(expenseSnapshot.byCategory[0].amount) : "No expense data" },
        ],
        insights: [
          "A professional expense report should show category concentration, approval workload, and payment mix in one place.",
          expenseSnapshot.byCategory.length ? `${expenseSnapshot.byCategory[0].label} is the largest expense category in this period.` : "No expense rows found in scope.",
        ],
        columns: ["Category", "Amount", "Count", "Top payment mix", "Status"],
        rows: expenseSnapshot.byCategory.map((row) => [
          row.label,
          formatCurrency(row.amount),
          formatNumber(row.count),
          expenseSnapshot.byMethod[0] ? `${expenseSnapshot.byMethod[0].label} • ${formatCurrency(expenseSnapshot.byMethod[0].amount)}` : "—",
          expenseSnapshot.pending > 0 ? "Needs review" : "Stable",
        ]),
      };
    case "area-analysis": {
      const rows = [];
      for (const row of leaderboards.regions.slice(0, 5)) {
        rows.push(["Region", row.label, formatCurrency(row.amount), formatNumber(row.orders), formatNumber(row.customers), row.lastDate ? formatDate(row.lastDate) : "—"]);
      }
      for (const row of leaderboards.zones.slice(0, 5)) {
        rows.push(["Zone", row.label, formatCurrency(row.amount), formatNumber(row.orders), formatNumber(row.customers), row.lastDate ? formatDate(row.lastDate) : "—"]);
      }
      for (const row of leaderboards.territories.slice(0, 8)) {
        rows.push(["Territory", row.label, formatCurrency(row.amount), formatNumber(row.orders), formatNumber(row.customers), row.lastDate ? formatDate(row.lastDate) : "—"]);
      }
      return {
        ...base,
        title: "Area Analysis Reports",
        subtitle: "Region, zone, territory, and distributor-area performance in one professional area analysis view.",
        cards: [
          { label: "Regions", value: formatNumber(leaderboards.regions.length), helper: "Revenue active regions" },
          { label: "Zones", value: formatNumber(leaderboards.zones.length), helper: "Revenue active zones" },
          { label: "Territories", value: formatNumber(leaderboards.territories.length), helper: "Revenue active territories" },
          { label: "Top territory", value: leaderboards.territories[0]?.label || "—", helper: leaderboards.territories[0] ? formatCurrency(leaderboards.territories[0].amount) : "No area revenue" },
        ],
        insights: [
          isDistributor(scope.role) ? "Distributor area analysis is focused on the assigned territory scope." : "Company-level area analysis highlights which region, zone, and territory are driving sales and where coverage is weak.",
          leaderboards.territories.length ? `${leaderboards.territories[0].label} leads territory performance right now.` : "No area sales found in scope.",
        ],
        columns: ["Area type", "Area", "Revenue", "Orders", "Customers", "Last activity"],
        rows,
      };
    }
    case "recovery":
      return {
        ...base,
        title: "Recovery & Payments Reports",
        subtitle: "Primary payments, secondary returns, receipts, outstanding, and aging visibility.",
        cards: [
          { label: "Primary payments", value: formatCurrency(recoverySnapshot.totalPrimary), helper: `${formatNumber(primaryPayments.length)} payment records` },
          { label: "Outstanding", value: formatCurrency(recoverySnapshot.outstanding), helper: "Open balance" },
          { label: "Collected back", value: formatCurrency(recoverySnapshot.collectedBack), helper: `${formatNumber(secondaryPayments.length)} secondary payment rows` },
          { label: "Receipts", value: formatCurrency(recoverySnapshot.receiptAmount), helper: `${formatNumber(receipts.length)} receipts logged` },
        ],
        insights: [
          "A professional recovery report must show outstanding balance, overdue rows, and aging in actionable buckets.",
          recoverySnapshot.overdueRows.length ? `${recoverySnapshot.overdueRows.length} payment records are overdue and require follow-up.` : "No overdue payment rows in scope.",
        ],
        columns: ["Invoice", "Distributor", "Warehouse", "Original", "Remaining", "Return date", "Status"],
        rows: primaryPayments.slice(0, 40).map((row) => [
          row.invoiceNo || "—",
          row.distributorName || "—",
          row.warehouseName || "—",
          formatCurrency(row.amountTotal),
          formatCurrency(row.amountRemaining),
          formatDate(row.returnDate),
          safeNumber(row.amountRemaining) > 0 ? (row.returnDate && new Date(row.returnDate) < new Date() ? "Overdue" : "Open") : "Closed",
        ]),
      };
    case "exceptions":
      return {
        ...base,
        title: "Exception Reports",
        subtitle: "Management watchlist for overdue payments, missing POD, low stock, pending actions, and return pressure.",
        cards: [
          { label: "Critical", value: formatNumber(alerts.filter((row) => row.severity === "critical").length), helper: "Immediate action items" },
          { label: "Warnings", value: formatNumber(alerts.filter((row) => row.severity === "warning").length), helper: "Close monitoring required" },
          { label: "Info", value: formatNumber(alerts.filter((row) => row.severity === "info").length), helper: "Operational notes" },
          { label: "Total watchlist", value: formatNumber(alerts.length), helper: "Current exceptions list" },
        ],
        insights: [
          "This report gives management a single action list rather than forcing them to inspect every module separately.",
          alerts.length ? `${alerts[0].title} is currently the highest visible exception in this scope.` : "No major exceptions detected in the selected period.",
        ],
        columns: ["Severity", "Title", "Description", "Area", "Route"],
        rows: alerts.map((row) => [
          toTitleCase(row.severity),
          row.title,
          row.description,
          row.meta || "—",
          row.route,
        ]),
      };
    case "overview":
    default:
      return {
        ...base,
        title: "Overview Reports",
        subtitle: "A professional cross-functional management view of revenue, stock, recovery, delivery, and team execution.",
        cards: [
          { label: "Revenue", value: formatCurrency(saleBreakdown.primary.amount + saleBreakdown.secondary.amount), helper: `${formatNumber(orders.length)} orders in scope` },
          { label: "Low stock", value: formatNumber(inventorySnapshot.lowStockCount), helper: "Critical stock alerts" },
          { label: "Outstanding", value: formatCurrency(recoverySnapshot.outstanding), helper: `${formatNumber(recoverySnapshot.overdueRows.length)} overdue records` },
          { label: "Active users", value: formatNumber(teamSnapshot.summary.activeUsers), helper: `${formatNumber(teamSnapshot.summary.totalUsers)} total role users` },
        ],
        insights: [
          "This overview is designed to answer the key business questions first: how much, where, who, risk level, and what needs action now.",
          statusMix.length ? `${statusMix[0].label} is the largest current order status bucket.` : "No order status data found in scope.",
        ],
        columns: ["Section", "Primary KPI", "Supporting note"],
        rows: [
          ["Primary Sales", formatCurrency(saleBreakdown.primary.amount), `${formatNumber(saleBreakdown.primary.orders)} orders`],
          ["Secondary Sales", formatCurrency(saleBreakdown.secondary.amount), `${formatNumber(saleBreakdown.secondary.orders)} orders`],
          ["Return Stock", formatNumber(returnsSnapshot.totalClaims), `${formatNumber(returnsSnapshot.returnedToStock)} units returned to stock`],
          ["Inventory", formatNumber(inventorySnapshot.onHandUnits), `${formatNumber(inventorySnapshot.lowStockCount)} low stock products`],
          ["Recovery", formatCurrency(recoverySnapshot.outstanding), `${formatNumber(recoverySnapshot.overdueRows.length)} overdue rows`],
          ["Delivery & POD", formatNumber(deliverySnapshot.delivered), `${formatNumber(deliverySnapshot.missingPod)} missing POD`],
          ["Expenses", formatCurrency(expenseSnapshot.total), `${formatCurrency(expenseSnapshot.pending)} pending review`],
          ["Area Analysis", leaderboards.territories[0]?.label || "—", leaderboards.territories[0] ? formatCurrency(leaderboards.territories[0].amount) : "No area revenue"],
        ],
      };
  }
}

function buildLegacyDashboardPayload(bundle) {
  const overview = buildOverviewPayload(bundle);
  return {
    ok: true,
    generatedAt: overview.generatedAt,
    hero: {
      eyebrow: overview.hero.eyebrow,
      title: overview.hero.title,
      description: overview.hero.subtitle,
    },
    scope: {
      label: overview.scopeLabel,
    },
    kpis: overview.spotlight.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      helper: item.helper,
      tone: item.tone || "zinc",
      format: item.key === "revenue" || item.key === "primary" || item.key === "secondary" || item.key === "outstanding" || item.key === "expenses" ? "currency" : undefined,
    })),
    cards: overview.navigator.map((item) => ({
      key: item.key,
      title: item.title,
      description: item.caption,
      badge: item.audience === "admin" ? "Admin" : "Business",
    })),
    spotlight: {
      regionalSales: overview.leaderboards.territories.map((row) => ({ label: row.label, value: row.amount, orders: row.orders })),
      expenseCategories: (bundle.expenseSnapshot.byCategory || []).map((row) => ({ category: row.label, value: row.amount })),
    },
    recentActivity: overview.recentActivity,
  };
}

router.get("/command-center", requireAuth, async (req, res) => {
  try {
    const bundle = await gatherReportBundle(req);
    return res.json(buildOverviewPayload(bundle));
  } catch (error) {
    console.error("reports command-center error", error);
    return res.status(500).json({ ok: false, message: "Failed to load reports command center" });
  }
});

router.get("/detail/:section", requireAuth, async (req, res) => {
  try {
    const bundle = await gatherReportBundle(req);
    return res.json(buildSectionPayload(bundle, req.params.section));
  } catch (error) {
    console.error("reports detail error", error);
    return res.status(500).json({ ok: false, message: "Failed to load report detail" });
  }
});

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const bundle = await gatherReportBundle(req);
    const overview = buildOverviewPayload(bundle);
    return res.json({
      ok: true,
      metrics: {
        totalSalesOrders: safeNumber(bundle.orders.length),
        totalExpenses: safeNumber(bundle.expenseSnapshot.total),
        pendingExpenses: safeNumber(bundle.expenseSnapshot.pending),
        activeUsers: safeNumber(bundle.teamSnapshot.summary.activeUsers),
        totalWarehouses: safeNumber(bundle.warehouses.length),
        totalProducts: safeNumber(bundle.inventorySnapshot.totalProducts),
        userRoles: safeNumber(bundle.teamSnapshot.roles.length),
        salesRegions: safeNumber(bundle.leaderboards.regions.length),
      },
      overview,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load report overview" });
  }
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const bundle = await gatherReportBundle(req);
    return res.json(buildLegacyDashboardPayload(bundle));
  } catch (error) {
    console.error("reports dashboard error", error);
    return res.status(500).json({ ok: false, message: "Failed to load reports dashboard" });
  }
});

router.get("/builder", requireAuth, async (req, res) => {
  try {
    const bundle = await gatherReportBundle(req);
    const overview = buildOverviewPayload(bundle);
    const rows = overview.navigator.map((item) => ({
      id: item.key,
      title: item.title,
      owner: "Reports",
      cadence: overview.periodLabel,
      lastRunAt: overview.generatedAt,
      recordCount: 1,
      status: "Ready",
    }));
    return res.json({ ok: true, generatedAt: overview.generatedAt, rows });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load report builder data" });
  }
});

const LEGACY_SECTION_MAP = {
  sales: "secondary-sales",
  inventory: "inventory",
  finance: "recovery",
  hr: "team-performance",
  logistics: "delivery-pod",
  compliance: "exceptions",
  procurement: "suppliers",
};

for (const key of Object.keys(LEGACY_SECTION_MAP)) {
  router.get(`/${key}`, requireAuth, async (req, res) => {
    try {
      const bundle = await gatherReportBundle(req);
      const detail = buildSectionPayload(bundle, LEGACY_SECTION_MAP[key]);
      return res.json({ ok: true, detail });
    } catch (_error) {
      return res.status(500).json({ ok: false, message: `Failed to load ${key} report` });
    }
  });
}

module.exports = router;
