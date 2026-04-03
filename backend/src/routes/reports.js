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
const { buildMasterReport, buildFocusedReport } = require("../services/reportsMaster");

const router = express.Router();

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

const ALLOWED_REPORT_PERIODS = new Set(["all", "day", "week", "month", "quarter", "year"]);

function normalizeReportPeriod(value) {
  const normalized = String(value || "month").trim().toLowerCase();
  return ALLOWED_REPORT_PERIODS.has(normalized) ? normalized : "month";
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
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

async function getScopedFinanceModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyId || "").trim()
    : String(req.user?.companyId || "").trim();
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyName || "").trim()
    : String(req.user?.companyName || "").trim();
  if (!scopedCompanyId) return { ExpenseModel: Expense, AccountModel: Account };
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) return { ExpenseModel: Expense, AccountModel: Account };
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    ExpenseModel: getModelFromDb(tenantDb, Expense),
    AccountModel: getModelFromDb(tenantDb, Account),
  };
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

async function getScopedProcurementModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const { scopedCompanyId, scopedCompanyName } = getScopedCompanyContext(req, requestedCompanyId, requestedCompanyName);
  if (!scopedCompanyId) {
    return {
      InventoryMovementModel: InventoryMovement,
      UserModel: User,
      StockTransferModel: StockTransfer,
      VehicleModel: Vehicle,
      MessageModel: Message,
      ReturnClaimModel: ReturnClaim,
    };
  }
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) {
    return {
      InventoryMovementModel: InventoryMovement,
      UserModel: User,
      StockTransferModel: StockTransfer,
      VehicleModel: Vehicle,
      MessageModel: Message,
      ReturnClaimModel: ReturnClaim,
    };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    InventoryMovementModel: getModelFromDb(tenantDb, InventoryMovement),
    UserModel: getModelFromDb(tenantDb, User),
    StockTransferModel: getModelFromDb(tenantDb, StockTransfer),
    VehicleModel: getModelFromDb(tenantDb, Vehicle),
    MessageModel: getModelFromDb(tenantDb, Message),
    ReturnClaimModel: getModelFromDb(tenantDb, ReturnClaim),
  };
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


router.get("/master", requireAuth, async (req, res) => {
  try {
    const report = await buildMasterReport(req, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || "",
      companyName: req.query?.companyName || "",
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    const status = Number(error?.statusCode || error?.status || 500);
    return res.status(status).json({ ok: false, message: error.message || "Failed to build master report" });
  }
});

router.get("/focus/:moduleKey", requireAuth, async (req, res) => {
  try {
    const report = await buildFocusedReport(req, req.params.moduleKey, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || "",
      companyName: req.query?.companyName || "",
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    const status = Number(error?.statusCode || error?.status || 500);
    return res.status(status).json({ ok: false, message: error.message || "Failed to build focused report" });
  }
});

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, ExpenseModel, UserModel, ProductModel, WarehouseModel, StockTransferModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const [salesAgg] = await InventoryMovementModel.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);

    const [expenseAgg] = await ExpenseModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totalUsers = await UserModel.countDocuments();
    const activeUsers = await UserModel.countDocuments({ status: "active" });
    const totalProducts = await ProductModel.countDocuments();
    const totalWarehouses = await WarehouseModel.countDocuments();
    const expenseCategories = await ExpenseModel.distinct("category");
    const userRoles = await UserModel.distinct("role");
    const salesRegions = await InventoryMovementModel.distinct("regionName", { movementType: "SALE_OUT" });
    const transferStatuses = await StockTransferModel.distinct("status");

    return res.json({
      ok: true,
      metrics: {
        totalSalesOrders: salesAgg?.orders || 0,
        totalSalesQuantity: salesAgg?.quantity || 0,
        totalExpenses: safeNumber(expenseAgg?.total),
        pendingExpenses: expenseAgg?.pending || 0,
        totalUsers,
        activeUsers,
        totalProducts,
        totalWarehouses,
        expenseCategories: expenseCategories.filter(Boolean).length,
        userRoles: userRoles.filter(Boolean).length,
        salesRegions: salesRegions.filter(Boolean).length,
        transferStatuses: transferStatuses.filter(Boolean).length,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load report overview" });
  }
});

router.get("/builder", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, ExpenseModel, StockTransferModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const [salesAgg] = await InventoryMovementModel.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          lastRunAt: { $max: "$createdAt" },
        },
      },
    ]);

    const [inventoryAgg] = await InventoryMovementModel.aggregate([
      {
        $group: {
          _id: null,
          movementCount: { $sum: 1 },
          lastRunAt: { $max: "$createdAt" },
        },
      },
    ]);

    const [expenseAgg] = await ExpenseModel.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          lastRunAt: { $max: "$createdAt" },
        },
      },
    ]);

    const [transferAgg] = await StockTransferModel.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          inProgress: {
            $sum: {
              $cond: [{ $in: ["$status", ["pending", "in_transit"]] }, 1, 0],
            },
          },
          lastRunAt: { $max: "$createdAt" },
        },
      },
    ]);

    const rows = [
      {
        id: "sales-performance",
        title: "Sales Performance Snapshot",
        owner: "Finance",
        cadence: "Daily",
        lastRunAt: salesAgg?.lastRunAt || null,
        recordCount: safeNumber(salesAgg?.orders),
        status: salesAgg?.orders ? "Ready" : "Draft",
      },
      {
        id: "inventory-health",
        title: "Inventory Health Overview",
        owner: "Supply Chain",
        cadence: "Weekly",
        lastRunAt: inventoryAgg?.lastRunAt || null,
        recordCount: safeNumber(inventoryAgg?.movementCount),
        status: inventoryAgg?.movementCount ? "Ready" : "Draft",
      },
      {
        id: "expense-category",
        title: "Expense Category Tracker",
        owner: "Accounts",
        cadence: "Weekly",
        lastRunAt: expenseAgg?.lastRunAt || null,
        recordCount: safeNumber(expenseAgg?.count),
        status: expenseAgg?.pending ? "Needs review" : expenseAgg?.count ? "Ready" : "Draft",
      },
      {
        id: "transfer-status",
        title: "Transfer Status Monitor",
        owner: "Logistics",
        cadence: "Daily",
        lastRunAt: transferAgg?.lastRunAt || null,
        recordCount: safeNumber(transferAgg?.count),
        status: transferAgg?.inProgress ? "Needs review" : transferAgg?.count ? "Ready" : "Draft",
      },
    ];

    return res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      rows,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load report builder data" });
  }
});

router.get("/sales", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const rows = await InventoryMovementModel.aggregate([
      { $match: { movementType: "SALE_OUT" } },
      {
        $group: {
          _id: { $ifNull: ["$regionName", "Unassigned"] },
          orders: { $sum: 1 },
          quantity: { $sum: "$quantity" },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $sort: { quantity: -1 } },
    ]);

    return res.json({
      ok: true,
      regions: rows.map((row) => ({
        region: row._id,
        orders: row.orders,
        quantity: row.quantity,
        lastMovementAt: row.lastMovementAt,
      })),
    });
  } catch (e) {
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
          inQty: {
            $sum: {
              $cond: [{ $in: ["$movementType", inTypes] }, "$quantity", 0],
            },
          },
          outQty: {
            $sum: {
              $cond: [{ $in: ["$movementType", outTypes] }, "$quantity", 0],
            },
          },
          movementCount: { $sum: 1 },
          lastMovementAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastMovementAt: -1 } },
    ]);

    const totalProducts = await ProductModel.countDocuments();

    return res.json({
      ok: true,
      totalProducts,
      warehouses: rows.map((row) => ({
        warehouse: row._id,
        inQty: row.inQty,
        outQty: row.outQty,
        onHand: row.inQty - row.outQty,
        movementCount: row.movementCount,
        lastMovementAt: row.lastMovementAt,
      })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load inventory report" });
  }
});

router.get("/finance", requireAuth, async (req, res) => {
  try {
    const { ExpenseModel, AccountModel } = await getScopedFinanceModels(req, req.query?.companyId, req.query?.companyName);
    const [expenseTotals] = await ExpenseModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          approved: {
            $sum: {
              $cond: [{ $in: ["$status", ["approved", "paid"]] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    const expensesByCategory = await ExpenseModel.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$category", "Uncategorized"] },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const accounts = await AccountModel.find()
      .select("accountName accountType currency currentBalance")
      .sort({ accountName: 1 })
      .lean();

    return res.json({
      ok: true,
      totals: {
        totalExpenses: safeNumber(expenseTotals?.total),
        approvedExpenses: safeNumber(expenseTotals?.approved),
      },
      expensesByCategory: expensesByCategory.map((row) => ({
        category: row._id,
        total: row.total,
        count: row.count,
      })),
      accounts,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load finance report" });
  }
});

router.get("/hr", requireAuth, async (req, res) => {
  try {
    const { UserModel } = await getScopedReportModels(req, req.query?.companyId, req.query?.companyName);
    const roleCounts = await UserModel.aggregate([
      { $group: { _id: { $ifNull: ["$role", "Unassigned"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const statusCounts = await UserModel.aggregate([
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
    ]);

    const totalUsers = await UserModel.countDocuments();

    return res.json({
      ok: true,
      totalUsers,
      roleCounts: roleCounts.map((row) => ({ role: row._id, count: row.count })),
      statusCounts: statusCounts.map((row) => ({ status: row._id, count: row.count })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load HR report" });
  }
});

router.get("/logistics", requireAuth, async (req, res) => {
  try {
    const { StockTransferModel, VehicleModel } = await getScopedProcurementModels(req, req.query?.companyId, req.query?.companyName);
    const transferCounts = await StockTransferModel.aggregate([
      { $group: { _id: { $ifNull: ["$status", "unknown"] }, count: { $sum: 1 } } },
    ]);
    const vehicleCount = await VehicleModel.countDocuments();

    return res.json({
      ok: true,
      vehicleCount,
      transferCounts: transferCounts.map((row) => ({ status: row._id, count: row.count })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load logistics report" });
  }
});

router.get("/compliance", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, MessageModel, ReturnClaimModel } = await getScopedProcurementModels(req, req.query?.companyId, req.query?.companyName);
    const adjustmentCount = await InventoryMovementModel.countDocuments({ movementType: "ADJUSTMENT" });
    const returnCount = await ReturnClaimModel.countDocuments();
    const messageCount = await MessageModel.countDocuments();

    return res.json({
      ok: true,
      adjustmentCount,
      returnCount,
      messageCount,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load compliance report" });
  }
});

router.get("/procurement", requireAuth, async (req, res) => {
  try {
    const { InventoryMovementModel, UserModel } = await getScopedProcurementModels(req, req.query?.companyId, req.query?.companyName);
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
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            quantity: { $sum: "$quantity" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const trendMap = trendAgg.reduce((acc, row) => {
      acc[row._id] = {
        quantity: safeNumber(row.quantity),
        count: safeNumber(row.count),
      };
      return acc;
    }, {});

    const trendDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return date;
    });

    const inboundTrend = trendDates.map((date) => {
      const key = date.toISOString().slice(0, 10);
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        quantity: trendMap[key]?.quantity || 0,
        count: trendMap[key]?.count || 0,
      };
    });

    return res.json({
      ok: true,
      kpis: {
        totalSuppliers: supplierTotal,
        activeSuppliers: supplierActive,
        totalReceipts: purchaseAgg?.[0]?.count || 0,
        totalQuantity: safeNumber(purchaseAgg?.[0]?.quantity),
      },
      recentPurchases,
      inboundTrend,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load procurement report" });
  }
});

module.exports = router;