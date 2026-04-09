const express = require("express");
const mongoose = require("mongoose");
const InventoryMovement = require("../models/InventoryMovement");
const StockTransfer = require("../models/StockTransfer");
const Product = require("../models/Product");
const WarehouseTransaction = require("../models/WarehouseTransaction");
const Warehouse = require("../models/Warehouse");
const Company = require("../models/Company");
const Message = require("../models/Message");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../utils/auth");
const { createModuleAccessGuard } = require("../utils/moduleAccess");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");
const { isModuleSectionAllowed } = require("../utils/moduleAccess");

const router = express.Router();

function toTrimmedString(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function isAdminRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return ["admin", "system admin", "company admin"].includes(normalized);
}

function isSystemLevelAdmin(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "system admin";
}

function isWarehouseManagerRole(role) {
  return String(role || "").trim().toLowerCase() === "warehouse manager";
}

function getScopedWarehouseId(user) {
  return toTrimmedString(user?.warehouse_id || user?.warehouseId || "");
}

function applyWarehouseScope(query, req) {
  if (!isWarehouseManagerRole(req.user?.role)) return query;
  const warehouseId = getScopedWarehouseId(req.user);
  query.warehouseId = warehouseId || "__no_warehouse__";
  return query;
}

function getUserCompanyId(req) {
  return toTrimmedString(req.user?.companyId);
}

function moduleKeyForInventoryTransactionType(transactionType, role = "") {
  const normalizedType = toTrimmedString(transactionType).toUpperCase();
  const normalizedRole = toTrimmedString(role).toLowerCase();
  if (normalizedType === "SALE_STOCK") {
    if (normalizedRole === "supplier") return "supplier.primary-orders";
    if (normalizedRole === "distributor") return "distributor.primary-order";
    return "order-management.primary";
  }
  if (normalizedType === "RETURN_STOCK") {
    if (normalizedRole === "distributor") return "distributor.return-stock";
    return "order-management.return-stock";
  }
  return "";
}

async function ensureTransactionSectionAccess(user, transactionType) {
  const key = moduleKeyForInventoryTransactionType(transactionType, user?.role);
  if (!key) return true;
  return isModuleSectionAllowed({
    companyId: user?.companyId,
    role: user?.role,
    key,
  });
}

async function filterTransactionsByModuleAccess(user, transactions = []) {
  const filtered = [];
  for (const transaction of transactions) {
    if (await ensureTransactionSectionAccess(user, transaction?.transactionType)) filtered.push(transaction);
  }
  return filtered;
}

function applyCompanyScope(query, req, requestedCompanyId = "") {
  const userCompanyId = getUserCompanyId(req);
  if (isSystemLevelAdmin(req.user?.role)) {
    const normalizedRequested = toTrimmedString(requestedCompanyId);
    if (normalizedRequested) query.companyId = normalizedRequested;
    return query;
  }
  query.companyId = userCompanyId || "__no_company__";
  return query;
}

function resolveCompanyPayload(req, body = {}, fallbackCompany = {}) {
  const userCompanyId = getUserCompanyId(req);
  const userCompanyName = toTrimmedString(req.user?.companyName);
  if (isSystemLevelAdmin(req.user?.role)) {
    const providedId = toTrimmedString(body.companyId);
    const providedName = toTrimmedString(body.companyName);
    return {
      companyId: providedId || toTrimmedString(fallbackCompany.companyId),
      companyName: providedName || toTrimmedString(fallbackCompany.companyName),
    };
  }
  return {
    companyId: userCompanyId || toTrimmedString(fallbackCompany.companyId),
    companyName: userCompanyName || toTrimmedString(fallbackCompany.companyName),
  };
}

async function resolveTenantDbName(companyId, fallbackCompanyName = "") {
  const normalizedCompanyId = toTrimmedString(companyId);
  const normalizedFallbackName = toTrimmedString(fallbackCompanyName);
  if (!normalizedCompanyId && !normalizedFallbackName) return "";
  if (normalizedFallbackName) return toTenantDatabaseName(normalizedFallbackName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedInventoryModels(req, companyId, companyName = "") {
  const normalizedCompanyId = toTrimmedString(companyId);
  if (!normalizedCompanyId) {
    return {
      InventoryMovementModel: InventoryMovement,
      WarehouseTransactionModel: WarehouseTransaction,
      StockTransferModel: StockTransfer,
      ProductModel: Product,
      MessageModel: Message,
      UserModel: User,
    };
  }
  const dbName = await resolveTenantDbName(normalizedCompanyId, companyName);
  if (!dbName) {
    return {
      InventoryMovementModel: InventoryMovement,
      WarehouseTransactionModel: WarehouseTransaction,
      StockTransferModel: StockTransfer,
      ProductModel: Product,
      MessageModel: Message,
      UserModel: User,
    };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    InventoryMovementModel: getModelFromDb(tenantDb, InventoryMovement),
    WarehouseTransactionModel: getModelFromDb(tenantDb, WarehouseTransaction),
    StockTransferModel: getModelFromDb(tenantDb, StockTransfer),
    ProductModel: getModelFromDb(tenantDb, Product),
    MessageModel: getModelFromDb(tenantDb, Message),
    UserModel: getModelFromDb(tenantDb, User),
  };
}

function serializePodUploader(user) {
  if (!user) return null;
  return {
    id: String(user._id || ""),
    name: String(user.fullName || user.name || user.userId || "").trim() || "Unknown",
  };
}

function withPodFields(transaction, uploaderById = {}) {
  if (!transaction) return transaction;
  const podUploaderId = String(transaction.podUploadedBy || "").trim();
  const podUploadedBy = podUploaderId ? (uploaderById[podUploaderId] || { id: podUploaderId, name: "Unknown" }) : null;
  return {
    ...transaction,
    podUploadedBy,
    pod_url: transaction.podUrl || null,
    pod_uploaded_at: transaction.podUploadedAt || null,
    pod_uploaded_by: podUploadedBy,
  };
}

async function attachPodMetaToTransactions(transactions = [], UserModel = User) {
  const podUserIds = Array.from(new Set(transactions.map((transaction) => String(transaction?.podUploadedBy || "").trim()).filter(Boolean)));
  let uploaderById = {};
  if (podUserIds.length) {
    const users = await UserModel.find({ _id: { $in: podUserIds } }).select("fullName name userId").lean();
    uploaderById = users.reduce((acc, user) => {
      acc[String(user._id)] = serializePodUploader(user);
      return acc;
    }, {});
  }
  return transactions.map((transaction) => withPodFields(transaction, uploaderById));
}

async function attachPodMetaToTransaction(transaction, UserModel = User) {
  if (!transaction) return transaction;
  const [mapped] = await attachPodMetaToTransactions([transaction], UserModel);
  return mapped;
}

function isPrimarySaleRequest(transaction) {
  if (toTrimmedString(transaction?.transactionType).toUpperCase() !== "SALE_STOCK") return false;
  const role = toTrimmedString(transaction?.requestSourceRole || transaction?.fromEntityType).toLowerCase();
  return role.includes("brand") || role.includes("distributor");
}

function buildSupplierMatchQuery(user) {
  const ids = Array.from(new Set([
    toTrimmedString(user?.userId),
    toTrimmedString(user?.supplierId),
    toTrimmedString(user?._id),
    toTrimmedString(user?.uid),
  ].filter(Boolean)));
  const names = Array.from(new Set([
    toTrimmedString(user?.supplierName),
    toTrimmedString(user?.businessName),
    toTrimmedString(user?.fullName),
  ].filter(Boolean)));
  const or = [];
  if (ids.length) or.push({ supplierId: { $in: ids } });
  if (names.length) or.push({ supplierName: { $in: names } });
  return or.length ? { $or: or } : { _id: null };
}

function buildTransactionCode() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
  return `TXN-${ymd}-${suffix}`;
}


function parseCartonSizeLabel(value) {
  const label = toTrimmedString(value).toLowerCase().replace(/\s+/g, "");
  const match = label.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  const cartonCount = toNumber(match[1], 0);
  const totalPacks = toNumber(match[2], 0);
  if (cartonCount <= 0 || totalPacks <= 0) return null;
  return {
    cartonCount,
    totalPacks,
    packsPerCarton: totalPacks / cartonCount,
    cartonSize: `${cartonCount}x${totalPacks}`,
  };
}

function movementTypeForTransaction(transactionType) {
  const map = {
    PURCHASING_STOCK: "PURCHASE_IN",
    SALE_STOCK: "SALE_OUT",
    DAMAGE_STOCK: "ADJUSTMENT",
    RETURN_STOCK: "RETURN_IN",
    RETURN_TO_SD: "SALE_OUT",
    STOCK_IN: "TRANSFER_IN",
    STOCK_OUT: "TRANSFER_OUT",
    PURCHASING_OUT: "SALE_OUT",
    MOVEMENT: "ADJUSTMENT",
  };
  return map[transactionType] || "ADJUSTMENT";
}

const requestLifecycleStatuses = ["PENDING", "APPROVED", "REJECTED", "DISPATCHED", "DELIVERED"];

function quantitySignForTransaction(transactionType) {
  const outTypes = ["SALE_STOCK", "DAMAGE_STOCK", "RETURN_TO_SD", "STOCK_OUT", "PURCHASING_OUT"];
  return outTypes.includes(transactionType) ? -1 : 1;
}

async function createInventoryMovementsForTransaction(transaction, items = [], userId, InventoryMovementModel = InventoryMovement) {
  const movementType = movementTypeForTransaction(transaction.transactionType);
  const quantitySign = quantitySignForTransaction(transaction.transactionType);
  await Promise.all(
    items.map((item) =>
      InventoryMovementModel.create({
        productId: item.productId,
        productName: item.productName,
        warehouseId: transaction.warehouseId,
        warehouseName: transaction.warehouseName,
        regionId: transaction.regionId,
        regionName: transaction.regionName,
        zoneId: transaction.zoneId,
        zoneName: transaction.zoneName,
        companyId: transaction.companyId,
        companyName: transaction.companyName,
        movementScope: "warehouse",
        quantity: quantitySign * item.totalPacks,
        movementType,
        referenceId: transaction.transactionCode,
        batchManufactureDate: item.manufactureDate || undefined,
        batchExpiryDate: item.expiryDate || undefined,
        createdBy: userId,
      })
    )
  );
}

async function createLowStockMessageIfRequired(transaction, productBalances, userId, MessageModel = Message) {
  const lowBalances = productBalances.filter((row) => row.quantity <= (row.minStockLevel || 0));
  if (!lowBalances.length) return;

  const lines = lowBalances
    .map(
      (row) => `${row.productName || row.productId}: ${row.quantity} packs (min ${row.minStockLevel || 0})`
    )
    .join("; ");

  await MessageModel.create({
    subject: `Low Stock Alert (${transaction.transactionCode})`,
    body: `Low stock detected after transaction ${transaction.transactionCode}: ${lines}`,
    messageType: "alert",
    createdBy: userId,
  });
}

async function calculateProductBalanceMap(warehouseId, productIds, companyId = "", InventoryMovementModel = InventoryMovement, ProductModel = Product) {
  const match = {
    productId: { $in: productIds },
  };
  if (warehouseId) match.warehouseId = warehouseId;
  if (companyId) match.companyId = companyId;

  const balances = await InventoryMovementModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$productId",
        productName: { $first: "$productName" },
        quantity: { $sum: "$quantity" },
      },
    },
  ]);

  const productFilter = { productId: { $in: productIds } };
  if (companyId) productFilter.companyId = companyId;
  const productDocs = await ProductModel.find(productFilter)
    .select("productId name minStockLevel")
    .lean();
  const balanceByProductId = new Map(balances.map((row) => [row._id, row]));

  return productDocs.map((product) => ({
    productId: product.productId,
    productName: product.name,
    minStockLevel: toNumber(product.minStockLevel, 0),
    quantity: toNumber(balanceByProductId.get(product.productId)?.quantity, 0),
  }));
}

router.post("/transactions", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const transactionType = toTrimmedString(body.transactionType);

    if (!(await ensureTransactionSectionAccess(req.user, transactionType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    const scopeWarehouseId = isWarehouseManagerRole(req.user?.role)
      ? getScopedWarehouseId(req.user)
      : toTrimmedString(body.warehouseId);
    const scopeWarehouseName = toTrimmedString(body.warehouseName);

    const incomingItems = Array.isArray(body.items) ? body.items : [];
    if (!incomingItems.length) {
      return res.status(400).json({ ok: false, message: "At least one item is required" });
    }

    const normalizedItems = incomingItems.map((item) => {
      const parsedSize = parseCartonSizeLabel(item.cartonSize);
      const cartons = Math.max(0, toNumber(item.cartons, parsedSize?.cartonCount || 0));
      const packs = Math.max(0, toNumber(item.packs, 0));
      const packsPerCarton = Math.max(0, toNumber(item.packsPerCarton, parsedSize?.packsPerCarton || 0));
      const totalPacks = Math.max(0, toNumber(item.totalPacks, parsedSize?.totalPacks || cartons * packsPerCarton + packs));
      const onePackPrice = Math.max(0, toNumber(item.onePackPrice, 0));
      const oneCartonPrice = Math.max(0, toNumber(item.oneCartonPrice, 0));
      const totalPrice = Math.max(0, toNumber(item.totalPrice, 0));
      const unitPrice = totalPacks > 0 ? toNumber(item.unitPrice, totalPrice / totalPacks) : 0;
      return {
        productId: toTrimmedString(item.productId),
        productName: toTrimmedString(item.productName),
        cartonSize: parsedSize?.cartonSize || toTrimmedString(item.cartonSize),
        cartonCount: parsedSize?.cartonCount || cartons,
        packsPerCarton,
        cartons,
        packs,
        totalPacks,
        onePackPrice,
        oneCartonPrice,
        totalPrice,
        unitPrice,
        manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : undefined,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        returnDate: item.returnDate ? new Date(item.returnDate) : undefined,
        notes: toTrimmedString(item.notes),
      };
    });

    const invalidItem = normalizedItems.find((item) => !item.productId || item.totalPacks <= 0);
    if (invalidItem) {
      return res.status(400).json({ ok: false, message: "Each item needs product and quantity" });
    }

    if (transactionType === "RETURN_STOCK") {
      const missingDates = normalizedItems.some((item) => !item.manufactureDate || !item.expiryDate);
      if (missingDates) {
        return res.status(400).json({ ok: false, message: "Manufacture date and expiry date are required for return stock items" });
      }
    }

    if (!scopeWarehouseId) {
      return res.status(400).json({ ok: false, message: "Warehouse is required" });
    }

    const warehouseDoc = await Warehouse.findOne({ warehouseId: scopeWarehouseId })
      .select("companyId companyName")
      .lean();
    const companyPayload = resolveCompanyPayload(req, body, warehouseDoc || {});
    if (!companyPayload.companyId) {
      return res.status(400).json({ ok: false, message: "Company is required" });
    }
    const { WarehouseTransactionModel, InventoryMovementModel, ProductModel, MessageModel, UserModel } = await getScopedInventoryModels(
      req,
      companyPayload.companyId,
      companyPayload.companyName
    );

    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.totalPrice || item.totalPacks * item.unitPrice), 0);
    const adjustment = toNumber(body.adjustment, 0);
    const grandTotal = subtotal + adjustment;

    const now = new Date();
    const transactionCode = buildTransactionCode();
    const sourceRole = toTrimmedString(body.requestSourceRole || req.user?.role || "");
    const isReturnStockRequest = transactionType === "RETURN_STOCK";
    const isSaleStockRequest =
      transactionType === "SALE_STOCK"
      && ["brand manager", "distributor"].includes(String(sourceRole || "").trim().toLowerCase());
    const isApprovalRequest = isReturnStockRequest || isSaleStockRequest;

    const paymentDueDate =
      transactionType === "RETURN_STOCK"
        ? new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
        : body.paymentDueDate
          ? new Date(body.paymentDueDate)
          : undefined;

    let transaction;

    try {
      transaction = await WarehouseTransactionModel.create({
        transactionCode,
        transactionType,
        transactionAt: body.transactionAt ? new Date(body.transactionAt) : now,
        fromEntityType: toTrimmedString(body.fromEntityType),
        fromEntityName: toTrimmedString(body.fromEntityName),
        toEntityType: toTrimmedString(body.toEntityType),
        toEntityName: toTrimmedString(body.toEntityName),
        companyId: companyPayload.companyId,
        companyName: companyPayload.companyName,
        warehouseId: scopeWarehouseId,
        warehouseName: scopeWarehouseName,
        regionId: toTrimmedString(body.regionId),
        regionName: toTrimmedString(body.regionName),
        zoneId: toTrimmedString(body.zoneId),
        zoneName: toTrimmedString(body.zoneName),
        territory: toTrimmedString(body.territory),
        fieldId: toTrimmedString(body.fieldId),
        fieldName: toTrimmedString(body.fieldName),
        brandId: toTrimmedString(body.brandId),
        brandName: toTrimmedString(body.brandName),
        distributorId: toTrimmedString(body.distributorId),
        distributorName: toTrimmedString(body.distributorName),
        subDistributorId: toTrimmedString(body.subDistributorId),
        subDistributorName: toTrimmedString(body.subDistributorName),
        supplierId: toTrimmedString(body.supplierId),
        supplierName: toTrimmedString(body.supplierName),
        dispatchFromWarehouseId: toTrimmedString(body.dispatchFromWarehouseId),
        dispatchFromWarehouseName: toTrimmedString(body.dispatchFromWarehouseName),
        note: toTrimmedString(body.note),
        paymentDueDate,
        returnPaymentStatus: transactionType === "RETURN_STOCK" ? "PENDING" : "NOT_APPLICABLE",
        requestStatus: isApprovalRequest ? "PENDING" : "APPROVED",
        requestSourceRole: isApprovalRequest ? sourceRole : "admin",
        requestApplied: !isApprovalRequest,
        subtotal,
        adjustment,
        extraDiscPer: toNumber(body.extraDiscPer, 0),
        advTaxPer: toNumber(body.advTaxPer, 0),
        whTaxPer: toNumber(body.whTaxPer, 0),
        expense: toNumber(body.expense, 0),
        grandTotal,
        items: normalizedItems,
        createdBy: req.user?.uid,
      });

      if (!isApprovalRequest) {
        await createInventoryMovementsForTransaction(transaction, normalizedItems, req.user?.uid, InventoryMovementModel);
      }
    } catch (persistError) {
      if (transaction?._id) {
        await InventoryMovementModel.deleteMany({ referenceId: transaction.transactionCode });
        await WarehouseTransactionModel.findByIdAndDelete(transaction._id);
      }
      throw persistError;
    }

    const productBalances = !isApprovalRequest
      ? await calculateProductBalanceMap(
        scopeWarehouseId,
        normalizedItems.map((item) => item.productId),
        companyPayload.companyId,
        InventoryMovementModel,
        ProductModel
      )
      : [];

    if (!isApprovalRequest) {
      try {
        await createLowStockMessageIfRequired(transaction, productBalances, req.user?.uid, MessageModel);
      } catch (alertError) {
        console.error("Failed to create low stock alert", alertError);
      }
    }

    if (isReturnStockRequest) {
      try {
        await MessageModel.create({
          title: "Return Stock Request",
          body: `${req.user?.role || "User"} submitted return stock request ${transaction.transactionCode}`,
          senderUserId: req.user?.uid,
          senderRole: req.user?.role,
          recipientRole: "admin",
          relatedEntity: transaction.transactionCode,
        });
      } catch (messageError) {
        console.error("Failed to notify admin about return stock request", messageError);
      }
    }

    return res.status(201).json({ ok: true, transaction: await attachPodMetaToTransaction(transaction.toObject ? transaction.toObject() : transaction, UserModel), productBalances });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create transaction" });
  }
});

router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const requestedCompanyId = toTrimmedString(req.query.companyId);
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? requestedCompanyId : getUserCompanyId(req);
    const { WarehouseTransactionModel, UserModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const query = {};
    if (req.query.transactionType) query.transactionType = toTrimmedString(req.query.transactionType);
    if (req.query.warehouseId) query.warehouseId = toTrimmedString(req.query.warehouseId);
    applyWarehouseScope(query, req);
    if (req.query.distributorId) query.distributorId = toTrimmedString(req.query.distributorId);
    if (req.query.requestStatus) query.requestStatus = toTrimmedString(req.query.requestStatus).toUpperCase();
    if (req.query.requestSourceRole) query.requestSourceRole = toTrimmedString(req.query.requestSourceRole);
    applyCompanyScope(query, req, req.query.companyId);
    if (!isAdminRole(req.user?.role) && !isWarehouseManagerRole(req.user?.role)) {
      query.createdBy = req.user?.uid;
    }
    const transactions = await WarehouseTransactionModel.find(query).sort({ transactionAt: -1 }).lean();
    const allowedTransactions = await filterTransactionsByModuleAccess(req.user, transactions);

    const withStatus = allowedTransactions.map((txn) => {
      if (txn.returnPaymentStatus !== "PENDING" || !txn.paymentDueDate) return txn;
      const overdue = new Date(txn.paymentDueDate) < new Date();
      return { ...txn, returnPaymentStatus: overdue ? "OVERDUE" : txn.returnPaymentStatus };
    });

    return res.json({ ok: true, transactions: await attachPodMetaToTransactions(withStatus, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load transactions" });
  }
});


router.get("/transactions/supplier/primary", requireAuth, async (req, res) => {
  try {
    if (toTrimmedString(req.user?.role).toLowerCase() !== "supplier") {
      return res.status(403).json({ ok: false, message: "Only Supplier can access primary dispatch queue" });
    }
    const supplierModuleAllowed = await isModuleSectionAllowed({
      companyId: req.user?.companyId,
      role: req.user?.role,
      key: "supplier.primary-orders",
    });
    if (!supplierModuleAllowed) {
      return res.status(403).json({ ok: false, message: "Supplier primary orders module is locked for this role" });
    }
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, UserModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const me = await UserModel.findById(req.user?.uid).lean();
    if (!me) return res.status(404).json({ ok: false, message: "User not found" });
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const query = {
      transactionType: "SALE_STOCK",
      requestStatus: { $in: ["APPROVED", "DISPATCHED", "DELIVERED"] },
      ...buildSupplierMatchQuery(me),
    };
    applyCompanyScope(query, req, req.query.companyId);
    const transactions = await WarehouseTransactionModel.find(query).sort({ transactionAt: -1, createdAt: -1 }).limit(limit).lean();
    const allowedTransactions = await filterTransactionsByModuleAccess(req.user, transactions);
    return res.json({ ok: true, transactions: await attachPodMetaToTransactions(allowedTransactions, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load supplier primary orders" });
  }
});

router.put("/transactions/:id/assignment", requireAuth, requireRole("admin", "warehouse manager"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.body?.companyId || req.query?.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, UserModel } = await getScopedInventoryModels(req, scopedCompanyId, req.body?.companyName || req.query?.companyName);
    const transaction = await WarehouseTransactionModel.findById(req.params.id);
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });
    if (!(await ensureTransactionSectionAccess(req.user, transaction.transactionType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!isPrimarySaleRequest(transaction)) {
      return res.status(400).json({ ok: false, message: "Supplier assignment is available only for primary sale requests" });
    }
    if (["REJECTED", "DELIVERED"].includes(toTrimmedString(transaction.requestStatus).toUpperCase())) {
      return res.status(400).json({ ok: false, message: "This request can no longer be assigned" });
    }
    if (!isSystemLevelAdmin(req.user?.role)) {
      const userCompanyId = getUserCompanyId(req);
      if (!userCompanyId || toTrimmedString(transaction.companyId) !== userCompanyId) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }
    if (isWarehouseManagerRole(req.user?.role)) {
      const scopedWarehouseId = getScopedWarehouseId(req.user);
      if (!scopedWarehouseId || scopedWarehouseId !== toTrimmedString(transaction.warehouseId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }
    transaction.supplierId = toTrimmedString(req.body?.supplierId || transaction.supplierId);
    transaction.supplierName = toTrimmedString(req.body?.supplierName || transaction.supplierName);
    transaction.dispatchFromWarehouseId = toTrimmedString(req.body?.dispatchFromWarehouseId || transaction.dispatchFromWarehouseId || transaction.warehouseId);
    transaction.dispatchFromWarehouseName = toTrimmedString(req.body?.dispatchFromWarehouseName || transaction.dispatchFromWarehouseName || transaction.warehouseName);
    await transaction.save();
    return res.json({ ok: true, transaction: await attachPodMetaToTransaction(transaction.toObject ? transaction.toObject() : transaction, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to save supplier assignment" });
  }
});

router.post("/transactions/:id/pod", requireAuth, async (req, res) => {
  try {
    if (toTrimmedString(req.user?.role).toLowerCase() !== "supplier") {
      return res.status(403).json({ ok: false, message: "Only Supplier can upload POD for primary orders" });
    }
    const supplierModuleAllowed = await isModuleSectionAllowed({
      companyId: req.user?.companyId,
      role: req.user?.role,
      key: "supplier.primary-orders",
    });
    if (!supplierModuleAllowed) {
      return res.status(403).json({ ok: false, message: "Supplier primary orders module is locked for this role" });
    }
    const objectKey = toTrimmedString(req.body?.objectKey);
    const publicUrl = toTrimmedString(req.body?.publicUrl);
    if (!objectKey || !publicUrl) {
      return res.status(400).json({ ok: false, message: "objectKey and publicUrl are required" });
    }
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.body?.companyId || req.query?.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, UserModel } = await getScopedInventoryModels(req, scopedCompanyId, req.body?.companyName || req.query?.companyName);
    const me = await UserModel.findById(req.user?.uid).lean();
    if (!me) return res.status(404).json({ ok: false, message: "User not found" });
    const transaction = await WarehouseTransactionModel.findById(req.params.id);
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });
    if (!(await ensureTransactionSectionAccess(req.user, transaction.transactionType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!isPrimarySaleRequest(transaction)) {
      return res.status(400).json({ ok: false, message: "POD upload is only available for primary sale requests" });
    }
    const ownershipMatch = buildSupplierMatchQuery(me).$or || [];
    const matches = ownershipMatch.some((condition) => {
      if (condition.supplierId?.$in) return condition.supplierId.$in.includes(toTrimmedString(transaction.supplierId));
      if (condition.supplierName?.$in) return condition.supplierName.$in.includes(toTrimmedString(transaction.supplierName));
      return false;
    });
    if (!matches) {
      return res.status(403).json({ ok: false, message: "This primary order is not assigned to you" });
    }
    const currentStatus = toTrimmedString(transaction.requestStatus).toUpperCase();
    if (!["APPROVED", "DISPATCHED"].includes(currentStatus)) {
      return res.status(400).json({ ok: false, message: "POD upload is allowed only after approval" });
    }
    transaction.podObjectKey = objectKey;
    transaction.podUrl = publicUrl;
    transaction.podUploadedAt = new Date();
    transaction.podUploadedBy = req.user?.uid;
    transaction.proofOfDeliveryImageUrl = publicUrl;
    transaction.proofOfDeliveryAt = transaction.podUploadedAt;
    transaction.proofOfDeliveryBy = req.user?.uid;
    await transaction.save();
    return res.json({ ok: true, transaction: await attachPodMetaToTransaction(transaction.toObject ? transaction.toObject() : transaction, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to save supplier POD" });
  }
});

router.put("/transactions/:id", requireAuth, requireRole("admin", "warehouse manager"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.body?.companyId || req.query?.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, UserModel } = await getScopedInventoryModels(req, scopedCompanyId, req.body?.companyName || req.query?.companyName);
    const transaction = await WarehouseTransactionModel.findById(req.params.id);
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });
    if (!(await ensureTransactionSectionAccess(req.user, transaction.transactionType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!isSystemLevelAdmin(req.user?.role)) {
      const userCompanyId = getUserCompanyId(req);
      if (!userCompanyId || toTrimmedString(transaction.companyId) !== userCompanyId) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (isWarehouseManagerRole(req.user?.role)) {
      const scopedWarehouseId = getScopedWarehouseId(req.user);
      if (!scopedWarehouseId || scopedWarehouseId !== toTrimmedString(transaction.warehouseId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (String(transaction.requestStatus || "").toUpperCase() !== "PENDING" || transaction.requestApplied) {
      return res.status(400).json({ ok: false, message: "Only pending requests can be updated" });
    }

    const body = req.body || {};
    const incomingItems = Array.isArray(body.items) ? body.items : [];
    if (!incomingItems.length) {
      return res.status(400).json({ ok: false, message: "At least one item is required" });
    }

    const normalizedItems = incomingItems.map((item) => {
      const parsedSize = parseCartonSizeLabel(item.cartonSize);
      const cartons = Math.max(0, toNumber(item.cartons, parsedSize?.cartonCount || 0));
      const packs = Math.max(0, toNumber(item.packs, 0));
      const packsPerCarton = Math.max(0, toNumber(item.packsPerCarton, parsedSize?.packsPerCarton || 0));
      const totalPacks = Math.max(0, toNumber(item.totalPacks, parsedSize?.totalPacks || cartons * packsPerCarton + packs));
      const onePackPrice = Math.max(0, toNumber(item.onePackPrice, 0));
      const oneCartonPrice = Math.max(0, toNumber(item.oneCartonPrice, 0));
      const totalPrice = Math.max(0, toNumber(item.totalPrice, 0));
      const unitPrice = totalPacks > 0 ? toNumber(item.unitPrice, totalPrice / totalPacks) : 0;
      return {
        productId: toTrimmedString(item.productId),
        productName: toTrimmedString(item.productName),
        cartonSize: parsedSize?.cartonSize || toTrimmedString(item.cartonSize),
        cartonCount: parsedSize?.cartonCount || cartons,
        packsPerCarton,
        cartons,
        packs,
        totalPacks,
        onePackPrice,
        oneCartonPrice,
        totalPrice,
        unitPrice,
        notes: toTrimmedString(item.notes),
      };
    });

    const invalidItem = normalizedItems.find((item) => !item.productId || item.totalPacks <= 0);
    if (invalidItem) {
      return res.status(400).json({ ok: false, message: "Each item needs product and quantity" });
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.totalPrice || item.totalPacks * item.unitPrice), 0);
    const extraDiscPer = toNumber(body.extraDiscPer, transaction.extraDiscPer || 0);
    const advTaxPer = toNumber(body.advTaxPer, transaction.advTaxPer || 0);
    const whTaxPer = toNumber(body.whTaxPer, transaction.whTaxPer || 0);
    const expense = toNumber(body.expense, transaction.expense || 0);
    const extraDiscAmt = (subtotal * extraDiscPer) / 100;
    const advTaxAmt = (subtotal * advTaxPer) / 100;
    const whTaxAmt = (subtotal * whTaxPer) / 100;
    const grandTotal = subtotal - extraDiscAmt + advTaxAmt + whTaxAmt + expense;

    transaction.fromEntityName = toTrimmedString(body.fromEntityName || transaction.fromEntityName);
    transaction.toEntityName = toTrimmedString(body.toEntityName || transaction.toEntityName);
    transaction.regionId = toTrimmedString(body.regionId || transaction.regionId);
    transaction.regionName = toTrimmedString(body.regionName || transaction.regionName);
    transaction.zoneId = toTrimmedString(body.zoneId || transaction.zoneId);
    transaction.zoneName = toTrimmedString(body.zoneName || transaction.zoneName);
    transaction.territory = toTrimmedString(body.territory || transaction.territory);
    transaction.fieldId = toTrimmedString(body.fieldId || transaction.fieldId);
    transaction.fieldName = toTrimmedString(body.fieldName || transaction.fieldName);
    transaction.brandName = toTrimmedString(body.brandName || transaction.brandName);
    transaction.distributorName = toTrimmedString(body.distributorName || transaction.distributorName);
    transaction.subDistributorName = toTrimmedString(body.subDistributorName || transaction.subDistributorName);
    transaction.supplierId = toTrimmedString(body.supplierId || transaction.supplierId);
    transaction.supplierName = toTrimmedString(body.supplierName || transaction.supplierName);
    transaction.dispatchFromWarehouseId = toTrimmedString(body.dispatchFromWarehouseId || transaction.dispatchFromWarehouseId);
    transaction.dispatchFromWarehouseName = toTrimmedString(body.dispatchFromWarehouseName || transaction.dispatchFromWarehouseName);
    transaction.note = toTrimmedString(body.note || transaction.note);
    transaction.extraDiscPer = extraDiscPer;
    transaction.advTaxPer = advTaxPer;
    transaction.whTaxPer = whTaxPer;
    transaction.expense = expense;
    transaction.subtotal = subtotal;
    transaction.grandTotal = grandTotal;
    transaction.items = normalizedItems;

    await transaction.save();
    return res.json({ ok: true, transaction: await attachPodMetaToTransaction(transaction.toObject ? transaction.toObject() : transaction, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update transaction" });
  }
});

router.put("/transactions/:id/mark-read", requireAuth, requireRole("admin", "warehouse manager"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.body?.companyId || req.query?.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, UserModel } = await getScopedInventoryModels(req, scopedCompanyId, req.body?.companyName || req.query?.companyName);
    const transaction = await WarehouseTransactionModel.findByIdAndUpdate(
      req.params.id,
      { requestReadAt: new Date() },
      { new: true }
    );
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });
    if (!(await ensureTransactionSectionAccess(req.user, transaction.transactionType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!isSystemLevelAdmin(req.user?.role)) {
      const userCompanyId = getUserCompanyId(req);
      if (!userCompanyId || toTrimmedString(transaction.companyId) !== userCompanyId) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (isWarehouseManagerRole(req.user?.role)) {
      const scopedWarehouseId = getScopedWarehouseId(req.user);
      if (!scopedWarehouseId || scopedWarehouseId !== toTrimmedString(transaction.warehouseId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }
    return res.json({ ok: true, transaction: await attachPodMetaToTransaction(transaction.toObject ? transaction.toObject() : transaction, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to mark request as read" });
  }
});

router.put("/transactions/:id/request-status", requireAuth, requireRole("admin", "warehouse manager"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.body?.companyId || req.query?.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, InventoryMovementModel, MessageModel, UserModel } = await getScopedInventoryModels(req, scopedCompanyId, req.body?.companyName || req.query?.companyName);
    const status = toTrimmedString(req.body?.status || "").toUpperCase();
    if (!requestLifecycleStatuses.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const transaction = await WarehouseTransactionModel.findById(req.params.id);
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });
    if (!(await ensureTransactionSectionAccess(req.user, transaction.transactionType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!isSystemLevelAdmin(req.user?.role)) {
      const userCompanyId = getUserCompanyId(req);
      if (!userCompanyId || toTrimmedString(transaction.companyId) !== userCompanyId) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (isWarehouseManagerRole(req.user?.role)) {
      const scopedWarehouseId = getScopedWarehouseId(req.user);
      if (!scopedWarehouseId || scopedWarehouseId !== toTrimmedString(transaction.warehouseId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (isPrimarySaleRequest(transaction) && status === "APPROVED") {
      if (!toTrimmedString(transaction.supplierId) || !toTrimmedString(transaction.supplierName)) {
        return res.status(400).json({ ok: false, message: "Assign supplier before approving primary order" });
      }
      if (!toTrimmedString(transaction.dispatchFromWarehouseId) || !toTrimmedString(transaction.dispatchFromWarehouseName)) {
        return res.status(400).json({ ok: false, message: "Select dispatch warehouse before approving primary order" });
      }
    }
    if (isPrimarySaleRequest(transaction) && ["DISPATCHED", "DELIVERED"].includes(status) && !toTrimmedString(transaction.podUrl)) {
      return res.status(400).json({ ok: false, message: "Supplier POD is required before changing this primary order status" });
    }

    transaction.requestStatus = status;
    transaction.requestReadAt = transaction.requestReadAt || new Date();
    transaction.requestReviewedAt = new Date();
    transaction.requestReviewedBy = req.user?.uid;

    if (["APPROVED", "DISPATCHED", "DELIVERED"].includes(status) && !transaction.requestApplied) {
      await createInventoryMovementsForTransaction(transaction, transaction.items || [], req.user?.uid, InventoryMovementModel);
      transaction.requestApplied = true;
    }

    await transaction.save();

    if (transaction.requestSourceRole && transaction.requestSourceRole !== "admin") {
      try {
        await MessageModel.create({
          title: "Stock Request Update",
          body: `Request ${transaction.transactionCode} is ${status}`,
          senderUserId: req.user?.uid,
          senderRole: "admin",
          recipientRole: transaction.requestSourceRole,
          relatedEntity: transaction.transactionCode,
        });
      } catch (notifyError) {
        console.error("Failed to notify requester", notifyError);
      }
    }

    return res.json({ ok: true, transaction: await attachPodMetaToTransaction(transaction.toObject ? transaction.toObject() : transaction, UserModel) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update request status" });
  }
});

router.put("/transactions/:id/return-payment", requireAuth, async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.body?.companyId || req.query?.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel } = await getScopedInventoryModels(req, scopedCompanyId, req.body?.companyName || req.query?.companyName);
    const status = toTrimmedString(req.body?.status || "PAID");
    if (!["PENDING", "PAID", "OVERDUE"].includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }
    const transaction = await WarehouseTransactionModel.findByIdAndUpdate(
      req.params.id,
      { returnPaymentStatus: status },
      { new: true }
    );
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });
    if (!(await ensureTransactionSectionAccess(req.user, transaction.transactionType))) {
      return res.status(403).json({ ok: false, message: "This order section is locked for your role" });
    }
    if (!isSystemLevelAdmin(req.user?.role)) {
      const userCompanyId = getUserCompanyId(req);
      if (!userCompanyId || toTrimmedString(transaction.companyId) !== userCompanyId) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (isWarehouseManagerRole(req.user?.role)) {
      const scopedWarehouseId = getScopedWarehouseId(req.user);
      if (!scopedWarehouseId || scopedWarehouseId !== toTrimmedString(transaction.warehouseId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }
    return res.json({ ok: true, transaction });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update payment status" });
  }
});

router.delete("/transactions/:id", requireAuth, async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, InventoryMovementModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const deleteFilter = { _id: req.params.id };
    applyCompanyScope(deleteFilter, req);
    if (isWarehouseManagerRole(req.user?.role)) {
      deleteFilter.warehouseId = getScopedWarehouseId(req.user) || "__no_warehouse__";
    }
    const deleted = await WarehouseTransactionModel.findOneAndDelete(deleteFilter);
    if (!deleted) return res.status(404).json({ ok: false, message: "Transaction not found" });

    await InventoryMovementModel.deleteMany({ referenceId: deleted.transactionCode });
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to delete transaction" });
  }
});

router.delete("/transactions/clear", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel, InventoryMovementModel, StockTransferModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const filter = {};
    applyCompanyScope(filter, req);
    await WarehouseTransactionModel.deleteMany(filter);
    await InventoryMovementModel.deleteMany(filter);
    await StockTransferModel.deleteMany(filter);
    return res.json({ ok: true, message: "Warehouse inventory module data cleared" });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to clear transaction data" });
  }
});

router.get("/near-expiry-products", requireAuth, createModuleAccessGuard("warehouse-inventory.near-expiry"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { InventoryMovementModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const now = new Date();
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const companyMatch = {};
    applyCompanyScope(companyMatch, req, req.query.companyId);
    const rows = await InventoryMovementModel.aggregate([
      {
        $match: {
          ...companyMatch,
          ...(isWarehouseManagerRole(req.user?.role) ? { warehouseId: getScopedWarehouseId(req.user) || "__no_warehouse__" } : {}),
          batchExpiryDate: { $gte: now, $lte: threeMonthsLater },
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
          productName: 1,
          quantity: 1,
          warehouseName: 1,
          manufactureDate: "$_id.manufactureDate",
          expiryDate: "$_id.expiryDate",
        },
      },
      { $sort: { expiryDate: 1 } },
    ]);
    return res.json({ ok: true, products: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load near expiry products" });
  }
});

router.get("/analytics", requireAuth, createModuleAccessGuard("warehouse-inventory.overview"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { WarehouseTransactionModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const now = new Date();
    const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weeklyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const companyMatch = {};
    applyCompanyScope(companyMatch, req, req.query.companyId);

    async function totalsSince(date) {
      const rows = await WarehouseTransactionModel.aggregate([
        { $match: { ...companyMatch, ...(isWarehouseManagerRole(req.user?.role) ? { warehouseId: getScopedWarehouseId(req.user) || "__no_warehouse__" } : {}), transactionAt: { $gte: date } } },
        {
          $group: {
            _id: "$transactionType",
            amount: { $sum: "$grandTotal" },
            transactions: { $sum: 1 },
            packs: {
              $sum: {
                $reduce: {
                  input: "$items",
                  initialValue: 0,
                  in: { $add: ["$$value", { $ifNull: ["$$this.totalPacks", 0] }] },
                },
              },
            },
          },
        },
      ]);
      return rows;
    }

    const [daily, weekly, monthly] = await Promise.all([
      totalsSince(dailyStart),
      totalsSince(weeklyStart),
      totalsSince(monthlyStart),
    ]);

    const expiryAlertRows = await WarehouseTransactionModel.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          ...companyMatch,
          ...(isWarehouseManagerRole(req.user?.role) ? { warehouseId: getScopedWarehouseId(req.user) || "__no_warehouse__" } : {}),
          "items.expiryDate": {
            $lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
            $gte: now,
          },
        },
      },
      {
        $project: {
          transactionCode: 1,
          transactionAt: 1,
          transactionType: 1,
          productId: "$items.productId",
          productName: "$items.productName",
          expiryDate: "$items.expiryDate",
          totalPacks: "$items.totalPacks",
        },
      },
      { $sort: { expiryDate: 1 } },
    ]);

    const returnPayments = await WarehouseTransactionModel.find({
      ...companyMatch,
      ...(isWarehouseManagerRole(req.user?.role) ? { warehouseId: getScopedWarehouseId(req.user) || "__no_warehouse__" } : {}),
      transactionType: "RETURN_STOCK",
      returnPaymentStatus: { $in: ["PENDING", "OVERDUE"] },
    })
      .sort({ paymentDueDate: 1 })
      .lean();

    return res.json({
      ok: true,
      analytics: {
        daily,
        weekly,
        monthly,
        expiryAlerts: expiryAlertRows,
        returnPayments,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load analytics" });
  }
});

router.post("/movements", requireAuth, createModuleAccessGuard("warehouse-inventory.ledger"), async (req, res) => {
  try {
    const body = req.body || {};
    const companyPayload = resolveCompanyPayload(req, body);
    if (!companyPayload.companyId) {
      return res.status(400).json({ ok: false, message: "Company is required" });
    }
    const { InventoryMovementModel } = await getScopedInventoryModels(req, companyPayload.companyId, companyPayload.companyName);
    const doc = await InventoryMovementModel.create({
      productId: String(body.productId || "").trim(),
      productName: String(body.productName || "").trim(),
      warehouseId: isWarehouseManagerRole(req.user?.role) ? getScopedWarehouseId(req.user) : String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      areaId: String(body.areaId || "").trim(),
      areaName: String(body.areaName || "").trim(),
      companyId: companyPayload.companyId,
      companyName: companyPayload.companyName,
      movementScope: String(body.movementScope || "warehouse").trim(),
      quantity: Number(body.quantity || 0),
      movementType: String(body.movementType || "").trim(),
      referenceId: String(body.referenceId || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, movement: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create movement" });
  }
});

router.get("/movements", requireAuth, createModuleAccessGuard("warehouse-inventory.ledger"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { InventoryMovementModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const query = {};
    if (req.query.productId) query.productId = String(req.query.productId);
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    applyWarehouseScope(query, req);
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);
    if (req.query.areaId) query.areaId = String(req.query.areaId);
    if (req.query.movementType) query.movementType = String(req.query.movementType);
    applyCompanyScope(query, req, req.query.companyId);
    const items = await InventoryMovementModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, movements: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load movements" });
  }
});

router.put("/movements/:id", requireAuth, createModuleAccessGuard("warehouse-inventory.ledger"), async (req, res) => {
  try {
    const body = req.body || {};
    const companyPayload = resolveCompanyPayload(req, body);
    if (!companyPayload.companyId) {
      return res.status(400).json({ ok: false, message: "Company is required" });
    }
    const { InventoryMovementModel } = await getScopedInventoryModels(req, companyPayload.companyId, companyPayload.companyName);
    const scope = { _id: req.params.id };
    applyCompanyScope(scope, req);
    const updated = await InventoryMovementModel.findOneAndUpdate(
      scope,
      {
        productId: String(body.productId || "").trim(),
        productName: String(body.productName || "").trim(),
        warehouseId: isWarehouseManagerRole(req.user?.role) ? getScopedWarehouseId(req.user) : String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        zoneId: String(body.zoneId || "").trim(),
        zoneName: String(body.zoneName || "").trim(),
        areaId: String(body.areaId || "").trim(),
        areaName: String(body.areaName || "").trim(),
        companyId: companyPayload.companyId,
        companyName: companyPayload.companyName,
        movementScope: String(body.movementScope || "warehouse").trim(),
        quantity: Number(body.quantity || 0),
        movementType: String(body.movementType || "").trim(),
        referenceId: String(body.referenceId || "").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, movement: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update movement" });
  }
});

router.delete("/movements/clear", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { InventoryMovementModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const filter = {};
    applyCompanyScope(filter, req);
    await InventoryMovementModel.deleteMany(filter);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to clear movements" });
  }
});

router.post("/transfers", requireAuth, createModuleAccessGuard("warehouse-inventory.transfers"), async (req, res) => {
  try {
    const body = req.body || {};
    const fromWarehouseId = isWarehouseManagerRole(req.user?.role) ? getScopedWarehouseId(req.user) : String(body.fromWarehouseId || "").trim();
    const fromWarehouseDoc = await Warehouse.findOne({ warehouseId: fromWarehouseId }).select("companyId companyName").lean();
    const companyPayload = resolveCompanyPayload(req, body, fromWarehouseDoc || {});
    if (!companyPayload.companyId) {
      return res.status(400).json({ ok: false, message: "Company is required" });
    }
    const { StockTransferModel, InventoryMovementModel } = await getScopedInventoryModels(req, companyPayload.companyId, companyPayload.companyName);
    const doc = await StockTransferModel.create({
      productId: String(body.productId || "").trim(),
      productName: String(body.productName || "").trim(),
      companyId: companyPayload.companyId,
      companyName: companyPayload.companyName,
      fromWarehouseId,
      fromWarehouseName: String(body.fromWarehouseName || "").trim(),
      toWarehouseId: String(body.toWarehouseId || "").trim(),
      toWarehouseName: String(body.toWarehouseName || "").trim(),
      quantity: Number(body.quantity || 0),
      status: String(body.status || "pending").trim(),
      requestedBy: req.user?.uid,
      note: String(body.note || "").trim(),
    });
    doc.statusHistory = [{ status: doc.status, at: new Date(), by: req.user?.uid }];

    if (doc.status === "completed" && !doc.transferApplied) {
      await InventoryMovementModel.create({
        productId: doc.productId,
        productName: doc.productName,
        companyId: doc.companyId,
        companyName: doc.companyName,
        warehouseId: doc.fromWarehouseId,
        warehouseName: doc.fromWarehouseName,
        movementScope: "warehouse",
        quantity: -Math.abs(Number(doc.quantity || 0)),
        movementType: "TRANSFER_OUT",
        referenceId: `TRANSFER-${doc._id}`,
        createdBy: req.user?.uid,
      });
      await InventoryMovementModel.create({
        productId: doc.productId,
        productName: doc.productName,
        companyId: doc.companyId,
        companyName: doc.companyName,
        warehouseId: doc.toWarehouseId,
        warehouseName: doc.toWarehouseName,
        movementScope: "warehouse",
        quantity: Math.abs(Number(doc.quantity || 0)),
        movementType: "TRANSFER_IN",
        referenceId: `TRANSFER-${doc._id}`,
        createdBy: req.user?.uid,
      });
      doc.transferApplied = true;
      doc.transferAppliedAt = new Date();
    }

    await doc.save();
    return res.status(201).json({ ok: true, transfer: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create transfer" });
  }
});

router.get("/transfers", requireAuth, createModuleAccessGuard("warehouse-inventory.transfers"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { StockTransferModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const transferQuery = {};
    applyCompanyScope(transferQuery, req, req.query.companyId);
    if (isWarehouseManagerRole(req.user?.role)) {
      const warehouseId = getScopedWarehouseId(req.user);
      transferQuery.$or = [{ fromWarehouseId: warehouseId || "__no_warehouse__" }, { toWarehouseId: warehouseId || "__no_warehouse__" }];
    }
    const items = await StockTransferModel.find(transferQuery).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, transfers: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load transfers" });
  }
});

router.put("/transfers/:id", requireAuth, createModuleAccessGuard("warehouse-inventory.transfers"), async (req, res) => {
  try {
    const body = req.body || {};
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.body?.companyId || req.query?.companyId) : getUserCompanyId(req);
    const { StockTransferModel, InventoryMovementModel } = await getScopedInventoryModels(req, scopedCompanyId, req.body?.companyName || req.query?.companyName);
    const transferScope = { _id: req.params.id };
    applyCompanyScope(transferScope, req);
    if (isWarehouseManagerRole(req.user?.role)) {
      const warehouseId = getScopedWarehouseId(req.user) || "__no_warehouse__";
      transferScope.$or = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }
    const existing = await StockTransferModel.findOne(transferScope);
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });

    const updatePayload = {
      status: String(body.status || "").trim(),
      note: String(body.note || "").trim(),
    };
    if (updatePayload.status === "approved") updatePayload.approvedBy = req.user?.uid;

    if (updatePayload.status === "completed" && !existing.transferApplied) {
      await InventoryMovementModel.create({
        productId: existing.productId,
        productName: existing.productName,
        companyId: existing.companyId,
        companyName: existing.companyName,
        warehouseId: existing.fromWarehouseId,
        warehouseName: existing.fromWarehouseName,
        movementScope: "warehouse",
        quantity: -Math.abs(Number(existing.quantity || 0)),
        movementType: "TRANSFER_OUT",
        referenceId: `TRANSFER-${existing._id}`,
        createdBy: req.user?.uid,
      });
      await InventoryMovementModel.create({
        productId: existing.productId,
        productName: existing.productName,
        companyId: existing.companyId,
        companyName: existing.companyName,
        warehouseId: existing.toWarehouseId,
        warehouseName: existing.toWarehouseName,
        movementScope: "warehouse",
        quantity: Math.abs(Number(existing.quantity || 0)),
        movementType: "TRANSFER_IN",
        referenceId: `TRANSFER-${existing._id}`,
        createdBy: req.user?.uid,
      });
      updatePayload.transferApplied = true;
      updatePayload.transferAppliedAt = new Date();
    }

    const updated = await StockTransferModel.findByIdAndUpdate(existing._id, updatePayload, { new: true });
    if (updatePayload.status) {
      updated.statusHistory = [
        ...(updated.statusHistory || []),
        { status: updatePayload.status, at: new Date(), by: req.user?.uid },
      ];
      await updated.save();
    }
    return res.json({ ok: true, transfer: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update transfer" });
  }
});

router.delete("/transfers/:id", requireAuth, createModuleAccessGuard("warehouse-inventory.transfers"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { StockTransferModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const deleteScope = { _id: req.params.id };
    applyCompanyScope(deleteScope, req);
    if (isWarehouseManagerRole(req.user?.role)) {
      const warehouseId = getScopedWarehouseId(req.user) || "__no_warehouse__";
      deleteScope.$or = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }
    const deleted = await StockTransferModel.findOneAndDelete(deleteScope);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    // Intentionally do not rollback applied transfer inventory movements.
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to delete transfer" });
  }
});

router.get("/summary", requireAuth, createModuleAccessGuard("warehouse-inventory.summary"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { InventoryMovementModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const match = {};
    if (req.query.warehouseId) match.warehouseId = String(req.query.warehouseId);
    applyWarehouseScope(match, req);
    applyCompanyScope(match, req, req.query.companyId);
    const items = await InventoryMovementModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { productId: "$productId", warehouseId: "$warehouseId" },
          productName: { $first: "$productName" },
          warehouseName: { $first: "$warehouseName" },
          quantity: { $sum: "$quantity" },
        },
      },
      { $sort: { productName: 1 } },
    ]);
    return res.json({ ok: true, summary: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load summary" });
  }
});


router.get("/summary-detail", requireAuth, createModuleAccessGuard("warehouse-inventory.summary"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { InventoryMovementModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const productId = toTrimmedString(req.query.productId);
    let warehouseId = toTrimmedString(req.query.warehouseId);
    if (isWarehouseManagerRole(req.user?.role)) {
      warehouseId = getScopedWarehouseId(req.user);
    }
    if (!productId || !warehouseId) {
      return res.status(400).json({ ok: false, message: "productId and warehouseId are required" });
    }
    const detailMatch = { productId, warehouseId };
    applyCompanyScope(detailMatch, req, req.query.companyId);

    const rows = await InventoryMovementModel.aggregate([
      {
        $match: {
          ...detailMatch,
          batchManufactureDate: { $exists: true, $ne: null },
          batchExpiryDate: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            manufactureDate: "$batchManufactureDate",
            expiryDate: "$batchExpiryDate",
          },
          quantity: { $sum: "$quantity" },
          productName: { $first: "$productName" },
        },
      },
      { $match: { quantity: { $gt: 0 } } },
      { $sort: { "_id.expiryDate": 1, "_id.manufactureDate": 1 } },
      {
        $project: {
          _id: 0,
          productName: 1,
          quantity: 1,
          manufactureDate: "$_id.manufactureDate",
          expiryDate: "$_id.expiryDate",
        },
      },
    ]);

    return res.json({ ok: true, rows });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load stock detail" });
  }
});

router.get("/low-stock", requireAuth, createModuleAccessGuard("warehouse-inventory.low-stock"), async (req, res) => {
  try {
    const scopedCompanyId = isSystemLevelAdmin(req.user?.role) ? toTrimmedString(req.query.companyId) : getUserCompanyId(req);
    const { InventoryMovementModel, ProductModel } = await getScopedInventoryModels(req, scopedCompanyId, req.query.companyName);
    const lowStockMatch = {};
    applyWarehouseScope(lowStockMatch, req);
    applyCompanyScope(lowStockMatch, req, req.query.companyId);
    const summary = await InventoryMovementModel.aggregate([
      { $match: lowStockMatch },
      {
        $group: {
          _id: { productId: "$productId", warehouseId: "$warehouseId" },
          productName: { $first: "$productName" },
          warehouseId: { $first: "$warehouseId" },
          warehouseName: { $first: "$warehouseName" },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);
    const productFilter = {};
    applyCompanyScope(productFilter, req, req.query.companyId);
    const products = await ProductModel.find(productFilter).select("productId name minStockLevel").lean();
    const lowStock = products
      .flatMap((p) => {
        const matches = summary.filter((s) => s._id.productId === p.productId);
        if (!matches.length) {
          return [
            {
              productDbId: p._id,
              productId: p.productId,
              name: p.name,
              minStockLevel: p.minStockLevel || 0,
              quantity: 0,
              warehouseId: "",
              warehouseName: "",
            },
          ];
        }
        return matches.map((s) => ({
          productDbId: p._id,
          productId: p.productId,
          name: p.name,
          minStockLevel: p.minStockLevel || 0,
          quantity: s.quantity || 0,
          warehouseId: s.warehouseId || "",
          warehouseName: s.warehouseName || "",
        }));
      })
      .filter((p) => p.quantity <= p.minStockLevel);
    return res.json({ ok: true, lowStock });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load low stock" });
  }
});

module.exports = router;