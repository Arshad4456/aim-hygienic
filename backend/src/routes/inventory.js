const express = require("express");
const InventoryMovement = require("../models/InventoryMovement");
const StockTransfer = require("../models/StockTransfer");
const Product = require("../models/Product");
const WarehouseTransaction = require("../models/WarehouseTransaction");
const Message = require("../models/Message");
const { requireAuth, requireRole, requirePermission } = require("../utils/auth");

const router = express.Router();

function toTrimmedString(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function isAdminRole(role) {
  return String(role || "").trim().toLowerCase() === "admin";
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

async function createInventoryMovementsForTransaction(transaction, items = [], userId) {
  const movementType = movementTypeForTransaction(transaction.transactionType);
  const quantitySign = quantitySignForTransaction(transaction.transactionType);
  await Promise.all(
    items.map((item) =>
      InventoryMovement.create({
        productId: item.productId,
        productName: item.productName,
        warehouseId: transaction.warehouseId,
        warehouseName: transaction.warehouseName,
        regionId: transaction.regionId,
        regionName: transaction.regionName,
        zoneId: transaction.zoneId,
        zoneName: transaction.zoneName,
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

async function createLowStockMessageIfRequired(transaction, productBalances, userId) {
  const lowBalances = productBalances.filter((row) => row.quantity <= (row.minStockLevel || 0));
  if (!lowBalances.length) return;

  const lines = lowBalances
    .map(
      (row) => `${row.productName || row.productId}: ${row.quantity} packs (min ${row.minStockLevel || 0})`
    )
    .join("; ");

  await Message.create({
    subject: `Low Stock Alert (${transaction.transactionCode})`,
    body: `Low stock detected after transaction ${transaction.transactionCode}: ${lines}`,
    messageType: "alert",
    createdBy: userId,
  });
}

async function calculateProductBalanceMap(warehouseId, productIds) {
  const match = {
    productId: { $in: productIds },
  };
  if (warehouseId) match.warehouseId = warehouseId;

  const balances = await InventoryMovement.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$productId",
        productName: { $first: "$productName" },
        quantity: { $sum: "$quantity" },
      },
    },
  ]);

  const productDocs = await Product.find({ productId: { $in: productIds } })
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

router.post("/transactions", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const body = req.body || {};
    const transactionType = toTrimmedString(body.transactionType);
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
      transaction = await WarehouseTransaction.create({
        transactionCode,
        transactionType,
        transactionAt: body.transactionAt ? new Date(body.transactionAt) : now,
        fromEntityType: toTrimmedString(body.fromEntityType),
        fromEntityName: toTrimmedString(body.fromEntityName),
        toEntityType: toTrimmedString(body.toEntityType),
        toEntityName: toTrimmedString(body.toEntityName),
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
        await createInventoryMovementsForTransaction(transaction, normalizedItems, req.user?.uid);
      }
    } catch (persistError) {
      if (transaction?._id) {
        await InventoryMovement.deleteMany({ referenceId: transaction.transactionCode });
        await WarehouseTransaction.findByIdAndDelete(transaction._id);
      }
      throw persistError;
    }

    const productBalances = !isApprovalRequest
      ? await calculateProductBalanceMap(scopeWarehouseId, normalizedItems.map((item) => item.productId))
      : [];

    if (!isApprovalRequest) {
      try {
        await createLowStockMessageIfRequired(transaction, productBalances, req.user?.uid);
      } catch (alertError) {
        console.error("Failed to create low stock alert", alertError);
      }
    }

    if (isReturnStockRequest) {
      try {
        await Message.create({
          title: "Return Stock Request",
          body: `${req.user?.role || "User"} submitted return stock request ${transaction.transactionCode}`,
          senderRole: req.user?.role,
          recipientRole: "admin",
          relatedEntity: transaction.transactionCode,
        });
      } catch (messageError) {
        console.error("Failed to notify admin about return stock request", messageError);
      }
    }

    return res.status(201).json({ ok: true, transaction, productBalances });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create transaction" });
  }
});

router.get("/transactions", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const query = {};
    if (req.query.transactionType) query.transactionType = toTrimmedString(req.query.transactionType);
    if (req.query.warehouseId) query.warehouseId = toTrimmedString(req.query.warehouseId);
    applyWarehouseScope(query, req);
    if (req.query.distributorId) query.distributorId = toTrimmedString(req.query.distributorId);
    if (req.query.requestStatus) query.requestStatus = toTrimmedString(req.query.requestStatus).toUpperCase();
    if (req.query.requestSourceRole) query.requestSourceRole = toTrimmedString(req.query.requestSourceRole);
    if (!isAdminRole(req.user?.role) && !isWarehouseManagerRole(req.user?.role)) {
      query.createdBy = req.user?.uid;
    }
    const transactions = await WarehouseTransaction.find(query).sort({ transactionAt: -1 }).lean();

    const withStatus = transactions.map((txn) => {
      if (txn.returnPaymentStatus !== "PENDING" || !txn.paymentDueDate) return txn;
      const overdue = new Date(txn.paymentDueDate) < new Date();
      return { ...txn, returnPaymentStatus: overdue ? "OVERDUE" : txn.returnPaymentStatus };
    });

    return res.json({ ok: true, transactions: withStatus });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load transactions" });
  }
});


router.put("/transactions/:id", requireAuth, requireRole("admin", "warehouse manager"), async (req, res) => {
  try {
    const transaction = await WarehouseTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });

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
    transaction.note = toTrimmedString(body.note || transaction.note);
    transaction.extraDiscPer = extraDiscPer;
    transaction.advTaxPer = advTaxPer;
    transaction.whTaxPer = whTaxPer;
    transaction.expense = expense;
    transaction.subtotal = subtotal;
    transaction.grandTotal = grandTotal;
    transaction.items = normalizedItems;

    await transaction.save();
    return res.json({ ok: true, transaction });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update transaction" });
  }
});

router.put("/transactions/:id/mark-read", requireAuth, requireRole("admin", "warehouse manager"), async (req, res) => {
  try {
    const transaction = await WarehouseTransaction.findByIdAndUpdate(
      req.params.id,
      { requestReadAt: new Date() },
      { new: true }
    );
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });

    if (isWarehouseManagerRole(req.user?.role)) {
      const scopedWarehouseId = getScopedWarehouseId(req.user);
      if (!scopedWarehouseId || scopedWarehouseId !== toTrimmedString(transaction.warehouseId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }
    return res.json({ ok: true, transaction });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to mark request as read" });
  }
});

router.put("/transactions/:id/request-status", requireAuth, requireRole("admin", "warehouse manager"), async (req, res) => {
  try {
    const status = toTrimmedString(req.body?.status || "").toUpperCase();
    if (!requestLifecycleStatuses.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const transaction = await WarehouseTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });

    if (isWarehouseManagerRole(req.user?.role)) {
      const scopedWarehouseId = getScopedWarehouseId(req.user);
      if (!scopedWarehouseId || scopedWarehouseId !== toTrimmedString(transaction.warehouseId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    transaction.requestStatus = status;
    transaction.requestReadAt = transaction.requestReadAt || new Date();
    transaction.requestReviewedAt = new Date();
    transaction.requestReviewedBy = req.user?.uid;

    if (["APPROVED", "DISPATCHED", "DELIVERED"].includes(status) && !transaction.requestApplied) {
      await createInventoryMovementsForTransaction(transaction, transaction.items || [], req.user?.uid);
      transaction.requestApplied = true;
    }

    await transaction.save();

    if (transaction.requestSourceRole && transaction.requestSourceRole !== "admin") {
      try {
        await Message.create({
          title: "Stock Request Update",
          body: `Request ${transaction.transactionCode} is ${status}`,
          senderRole: "admin",
          recipientRole: transaction.requestSourceRole,
          relatedEntity: transaction.transactionCode,
        });
      } catch (notifyError) {
        console.error("Failed to notify requester", notifyError);
      }
    }

    return res.json({ ok: true, transaction });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update request status" });
  }
});

router.put("/transactions/:id/return-payment", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const status = toTrimmedString(req.body?.status || "PAID");
    if (!["PENDING", "PAID", "OVERDUE"].includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }
    const transaction = await WarehouseTransaction.findByIdAndUpdate(
      req.params.id,
      { returnPaymentStatus: status },
      { new: true }
    );
    if (!transaction) return res.status(404).json({ ok: false, message: "Transaction not found" });

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

router.delete("/transactions/:id", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const deleteFilter = { _id: req.params.id };
    if (isWarehouseManagerRole(req.user?.role)) {
      deleteFilter.warehouseId = getScopedWarehouseId(req.user) || "__no_warehouse__";
    }
    const deleted = await WarehouseTransaction.findOneAndDelete(deleteFilter);
    if (!deleted) return res.status(404).json({ ok: false, message: "Transaction not found" });

    await InventoryMovement.deleteMany({ referenceId: deleted.transactionCode });
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to delete transaction" });
  }
});

router.delete("/transactions/clear", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    await WarehouseTransaction.deleteMany({});
    await InventoryMovement.deleteMany({});
    await StockTransfer.deleteMany({});
    return res.json({ ok: true, message: "Warehouse inventory module data cleared" });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to clear transaction data" });
  }
});

router.get("/near-expiry-products", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const now = new Date();
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const rows = await InventoryMovement.aggregate([
      {
        $match: {
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

router.get("/analytics", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const now = new Date();
    const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weeklyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);

    async function totalsSince(date) {
      const rows = await WarehouseTransaction.aggregate([
        { $match: { ...(isWarehouseManagerRole(req.user?.role) ? { warehouseId: getScopedWarehouseId(req.user) || "__no_warehouse__" } : {}), transactionAt: { $gte: date } } },
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

    const expiryAlertRows = await WarehouseTransaction.aggregate([
      { $unwind: "$items" },
      {
        $match: {
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

    const returnPayments = await WarehouseTransaction.find({
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

router.post("/movements", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await InventoryMovement.create({
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

router.get("/movements", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const query = {};
    if (req.query.productId) query.productId = String(req.query.productId);
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    applyWarehouseScope(query, req);
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);
    if (req.query.areaId) query.areaId = String(req.query.areaId);
    if (req.query.movementType) query.movementType = String(req.query.movementType);
    const items = await InventoryMovement.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, movements: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load movements" });
  }
});

router.put("/movements/:id", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await InventoryMovement.findByIdAndUpdate(
      req.params.id,
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
    await InventoryMovement.deleteMany({});
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to clear movements" });
  }
});

router.post("/transfers", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await StockTransfer.create({
      productId: String(body.productId || "").trim(),
      productName: String(body.productName || "").trim(),
      fromWarehouseId: isWarehouseManagerRole(req.user?.role) ? getScopedWarehouseId(req.user) : String(body.fromWarehouseId || "").trim(),
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
      await InventoryMovement.create({
        productId: doc.productId,
        productName: doc.productName,
        warehouseId: doc.fromWarehouseId,
        warehouseName: doc.fromWarehouseName,
        movementScope: "warehouse",
        quantity: -Math.abs(Number(doc.quantity || 0)),
        movementType: "TRANSFER_OUT",
        referenceId: `TRANSFER-${doc._id}`,
        createdBy: req.user?.uid,
      });
      await InventoryMovement.create({
        productId: doc.productId,
        productName: doc.productName,
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

router.get("/transfers", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const transferQuery = {};
    if (isWarehouseManagerRole(req.user?.role)) {
      const warehouseId = getScopedWarehouseId(req.user);
      transferQuery.$or = [{ fromWarehouseId: warehouseId || "__no_warehouse__" }, { toWarehouseId: warehouseId || "__no_warehouse__" }];
    }
    const items = await StockTransfer.find(transferQuery).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, transfers: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load transfers" });
  }
});

router.put("/transfers/:id", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const body = req.body || {};
    const transferScope = { _id: req.params.id };
    if (isWarehouseManagerRole(req.user?.role)) {
      const warehouseId = getScopedWarehouseId(req.user) || "__no_warehouse__";
      transferScope.$or = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }
    const existing = await StockTransfer.findOne(transferScope);
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });

    const updatePayload = {
      status: String(body.status || "").trim(),
      note: String(body.note || "").trim(),
    };
    if (updatePayload.status === "approved") updatePayload.approvedBy = req.user?.uid;

    if (updatePayload.status === "completed" && !existing.transferApplied) {
      await InventoryMovement.create({
        productId: existing.productId,
        productName: existing.productName,
        warehouseId: existing.fromWarehouseId,
        warehouseName: existing.fromWarehouseName,
        movementScope: "warehouse",
        quantity: -Math.abs(Number(existing.quantity || 0)),
        movementType: "TRANSFER_OUT",
        referenceId: `TRANSFER-${existing._id}`,
        createdBy: req.user?.uid,
      });
      await InventoryMovement.create({
        productId: existing.productId,
        productName: existing.productName,
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

    const updated = await StockTransfer.findByIdAndUpdate(existing._id, updatePayload, { new: true });
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

router.delete("/transfers/:id", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const deleteScope = { _id: req.params.id };
    if (isWarehouseManagerRole(req.user?.role)) {
      const warehouseId = getScopedWarehouseId(req.user) || "__no_warehouse__";
      deleteScope.$or = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }
    const deleted = await StockTransfer.findOneAndDelete(deleteScope);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    // Intentionally do not rollback applied transfer inventory movements.
    return res.json({ ok: true, deletedId: req.params.id });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to delete transfer" });
  }
});

router.get("/summary", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const match = {};
    if (req.query.warehouseId) match.warehouseId = String(req.query.warehouseId);
    applyWarehouseScope(match, req);
    const items = await InventoryMovement.aggregate([
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


router.get("/summary-detail", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const productId = toTrimmedString(req.query.productId);
    let warehouseId = toTrimmedString(req.query.warehouseId);
    if (isWarehouseManagerRole(req.user?.role)) {
      warehouseId = getScopedWarehouseId(req.user);
    }
    if (!productId || !warehouseId) {
      return res.status(400).json({ ok: false, message: "productId and warehouseId are required" });
    }

    const rows = await InventoryMovement.aggregate([
      {
        $match: {
          productId,
          warehouseId,
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

router.get("/low-stock", requireAuth, requirePermission("inventory.view"), async (req, res) => {
  try {
    const lowStockMatch = {};
    applyWarehouseScope(lowStockMatch, req);
    const summary = await InventoryMovement.aggregate([
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
    const products = await Product.find().select("productId name minStockLevel").lean();
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