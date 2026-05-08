const InventoryLedger = require("../../models/InventoryLedger");
const GoodsReceipt = require("../../models/GoodsReceipt");
const Warehouse = require("../../models/Warehouse");
const Product = require("../../models/Product");
const StockTransfer = require("../../models/StockTransfer");
const StockAdjustment = require("../../models/StockAdjustment");
const { asText, getScopedModels, scopedCompanyId } = require("../../services/scopedModels");

function companyIdFrom(req) { return scopedCompanyId(req); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function makeDocNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`; }
function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function toMoney(value) { return Math.round(Number(value || 0) * 100) / 100; }
function dateOrNow(value) { return value ? new Date(value) : new Date(); }

async function scoped(req) {
  return getScopedModels(req, {
    InventoryLedgerModel: InventoryLedger,
    GoodsReceiptModel: GoodsReceipt,
    WarehouseModel: Warehouse,
    ProductModel: Product,
    StockTransferModel: StockTransfer,
    StockAdjustmentModel: StockAdjustment,
  });
}

function baseMatch(req) {
  const match = { companyId: companyIdFrom(req) };
  if (req.query.ownerType) match.ownerType = asText(req.query.ownerType);
  if (req.query.ownerId) match.ownerId = asText(req.query.ownerId);
  if (req.query.warehouseId) match.warehouseId = asText(req.query.warehouseId);
  if (req.query.productId) match.productId = asText(req.query.productId);
  if (req.query.batchNo) match.batchNo = asText(req.query.batchNo);
  return match;
}

async function productNameMap(ProductModel, companyId) {
  const products = await ProductModel.find({ companyId }).select("_id productId code sku name minStockLevel costPrice tradePrice wholesalePrice unit").lean().catch(() => []);
  const map = new Map();
  for (const product of products) {
    const name = asText(product.name || product.productName);
    [product._id, product.productId, product.code, product.sku, name].filter(Boolean).forEach((key) => map.set(String(key), { ...product, name }));
  }
  return map;
}

function productName(row, names) {
  const current = asText(row.productName);
  const master = names.get(String(row.productId || "")) || names.get(String(row.productCode || ""));
  if (master?.name && (!current || /^(primary sale item|procurement item|product)$/i.test(current))) return master.name;
  return current || master?.name || "Product";
}

async function resolveProduct(req, body) {
  const { ProductModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const key = asText(body.productId || body.productCode || body.sku);
  let product = null;
  if (key) {
    product = await ProductModel.findOne({ companyId, $or: [{ productId: key }, { code: key }, { sku: key }, { _id: /^[a-f\d]{24}$/i.test(key) ? key : undefined }].filter((x) => Object.values(x)[0] !== undefined) }).lean().catch(() => null);
  }
  if (!product && body.productName) product = await ProductModel.findOne({ companyId, name: asText(body.productName) }).lean().catch(() => null);
  if (!product && !asText(body.productName)) throw new Error("Product is required.");
  return {
    product,
    productId: asText(product?.productId || product?._id || body.productId),
    productCode: asText(product?.code || product?.sku || body.productCode),
    productName: asText(product?.name || body.productName),
    unitCost: toMoney(body.unitCost ?? product?.costPrice ?? product?.tradePrice ?? product?.wholesalePrice ?? 0),
  };
}

async function resolveWarehouse(req, body, fieldPrefix = "") {
  const { WarehouseModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const idKey = asText(body[`${fieldPrefix}WarehouseId`] || body.warehouseId);
  const nameKey = asText(body[`${fieldPrefix}WarehouseName`] || body.warehouseName);
  let warehouse = null;
  if (idKey) warehouse = await WarehouseModel.findOne({ companyId, $or: [{ warehouseId: idKey }, { _id: /^[a-f\d]{24}$/i.test(idKey) ? idKey : undefined }].filter((x) => Object.values(x)[0] !== undefined) }).lean().catch(() => null);
  if (!warehouse && nameKey) warehouse = await WarehouseModel.findOne({ companyId, name: nameKey }).lean().catch(() => null);
  return {
    warehouse,
    warehouseId: asText(warehouse?.warehouseId || warehouse?._id || idKey),
    warehouseName: asText(warehouse?.name || nameKey || "Main Warehouse"),
  };
}

async function ledger(req) {
  const { InventoryLedgerModel, ProductModel } = await scoped(req);
  const match = baseMatch(req);
  if (req.query.referenceType) match.referenceType = asText(req.query.referenceType);
  const rows = await InventoryLedgerModel.find(match).sort({ postedAt: -1, createdAt: -1 }).limit(1000).lean();
  const names = await productNameMap(ProductModel, companyIdFrom(req));
  return rows.map((row) => ({ ...row, productName: productName(row, names) }));
}

async function stockSummary(req) {
  const { InventoryLedgerModel, ProductModel } = await scoped(req);
  const rows = await InventoryLedgerModel.aggregate([
    { $match: baseMatch(req) },
    { $group: {
      _id: { ownerType: "$ownerType", ownerId: "$ownerId", distributorId: "$distributorId", productId: "$productId", productCode: "$productCode", productName: "$productName" },
      warehouses: { $addToSet: { warehouseId: "$warehouseId", warehouseName: "$warehouseName" } },
      inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } },
      outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } },
      inValue: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$totalValue", 0] } },
      outValue: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$totalValue", 0] } },
      lastMovementAt: { $max: "$postedAt" },
    } },
    { $project: {
      _id: 0, ownerType: "$_id.ownerType", ownerId: "$_id.ownerId", distributorId: "$_id.distributorId", productId: "$_id.productId", productCode: "$_id.productCode", productName: "$_id.productName",
      warehouseCount: { $size: "$warehouses" }, warehouses: 1, inQty: 1, outQty: 1, inValue: 1, outValue: 1, balanceQty: { $subtract: ["$inQty", "$outQty"] }, stockValue: { $subtract: ["$inValue", "$outValue"] }, lastMovementAt: 1,
    } },
    { $sort: { ownerType: 1, productName: 1 } },
  ]);
  const names = await productNameMap(ProductModel, companyIdFrom(req));
  return rows.map((row) => ({ ...row, productName: productName(row, names) }));
}

async function warehouseStockSummary(req) {
  const { InventoryLedgerModel, ProductModel } = await scoped(req);
  const rows = await InventoryLedgerModel.aggregate([
    { $match: baseMatch(req) },
    { $group: {
      _id: { ownerType: "$ownerType", ownerId: "$ownerId", warehouseId: "$warehouseId", warehouseName: "$warehouseName", productId: "$productId", productCode: "$productCode", productName: "$productName", batchNo: "$batchNo" },
      inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } },
      outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } },
      inValue: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$totalValue", 0] } },
      outValue: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$totalValue", 0] } },
      lastMovementAt: { $max: "$postedAt" },
    } },
    { $project: {
      _id: 0, ownerType: "$_id.ownerType", ownerId: "$_id.ownerId", warehouseId: "$_id.warehouseId", warehouseName: "$_id.warehouseName", productId: "$_id.productId", productCode: "$_id.productCode", productName: "$_id.productName", batchNo: "$_id.batchNo", inQty: 1, outQty: 1,
      balanceQty: { $subtract: ["$inQty", "$outQty"] }, stockValue: { $subtract: ["$inValue", "$outValue"] }, lastMovementAt: 1,
    } },
    { $sort: { warehouseName: 1, productName: 1 } },
  ]);
  const names = await productNameMap(ProductModel, companyIdFrom(req));
  return rows.map((row) => ({ ...row, productName: productName(row, names) }));
}

async function availableQty(req, criteria) {
  const request = { ...req, query: { ...req.query, ...criteria } };
  const rows = await warehouseStockSummary(request);
  return rows.reduce((total, row) => total + Number(row.balanceQty || 0), 0);
}

async function createLedgerRow(req, payload) {
  const { InventoryLedgerModel } = await scoped(req);
  return InventoryLedgerModel.create({
    companyId: companyIdFrom(req), ownerType: payload.ownerType || "company", ownerId: payload.ownerId || companyIdFrom(req), distributorId: payload.distributorId,
    warehouseId: payload.warehouseId, warehouseName: payload.warehouseName, productId: payload.productId, productCode: payload.productCode, productName: payload.productName,
    batchNo: payload.batchNo, movementType: payload.movementType, direction: payload.direction, qty: toNumber(payload.qty), unitCost: toMoney(payload.unitCost), totalValue: toMoney(payload.qty * payload.unitCost),
    referenceType: payload.referenceType, referenceId: payload.referenceId, referenceNo: payload.referenceNo, postedAt: payload.postedAt || new Date(), postedByUserId: uidFrom(req),
  });
}

async function listAdjustments(req) {
  const { StockAdjustmentModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.warehouseId) filter.warehouseId = asText(req.query.warehouseId);
  if (req.query.productId) filter.productId = asText(req.query.productId);
  if (req.query.adjustmentType) filter.adjustmentType = asText(req.query.adjustmentType);
  return StockAdjustmentModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();
}

async function createAdjustment(req) {
  const { StockAdjustmentModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required.");
  const product = await resolveProduct(req, body);
  const warehouse = await resolveWarehouse(req, body);
  const adjustmentType = asText(body.adjustmentType || "adjustment_in");
  const qty = toNumber(body.qty || body.quantity);
  if (qty <= 0) throw new Error("Quantity must be greater than zero.");
  if (!["adjustment_in", "adjustment_out", "damage_out", "expiry_out"].includes(adjustmentType)) throw new Error("Invalid adjustment type.");
  const direction = adjustmentType === "adjustment_in" ? "in" : "out";
  if (direction === "out") {
    const current = await availableQty(req, { productId: product.productId, warehouseId: warehouse.warehouseId, ownerType: asText(body.ownerType || "company"), ownerId: asText(body.ownerId || companyId) });
    if (current < qty) throw new Error(`Insufficient stock. Available: ${current}`);
  }
  const unitCost = toMoney(body.unitCost ?? product.unitCost);
  const adjustment = await StockAdjustmentModel.create({
    companyId, documentNo: asText(body.documentNo) || makeDocNo("ADJ"), ownerType: asText(body.ownerType || "company"), ownerId: asText(body.ownerId || companyId), distributorId: asText(body.distributorId),
    warehouseId: warehouse.warehouseId, warehouseName: warehouse.warehouseName, productId: product.productId, productCode: product.productCode, productName: product.productName,
    batchNo: asText(body.batchNo), adjustmentType, qty, unitCost, totalValue: toMoney(qty * unitCost), reason: asText(body.reason), attachmentUrl: asText(body.attachmentUrl),
    status: "posted", postedAt: dateOrNow(body.postedAt), postedByUserId: uidFrom(req), createdByUserId: uidFrom(req), notes: asText(body.notes),
  });
  const ledger = await createLedgerRow(req, { ...adjustment.toObject(), direction, movementType: adjustmentType, referenceType: "stock_adjustment", referenceId: adjustment._id, referenceNo: adjustment.documentNo });
  return { adjustment, ledger };
}

async function listTransfers(req) {
  const { StockTransferModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status) filter.status = asText(req.query.status);
  return StockTransferModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();
}

async function createTransfer(req) {
  const { StockTransferModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required.");
  const product = await resolveProduct(req, body);
  const from = await resolveWarehouse(req, body, "from");
  const to = await resolveWarehouse(req, body, "to");
  const qty = toNumber(body.qty || body.quantity);
  if (!from.warehouseId || !to.warehouseId) throw new Error("From and to warehouses are required.");
  if (from.warehouseId === to.warehouseId) throw new Error("From and to warehouses must be different.");
  if (qty <= 0) throw new Error("Quantity must be greater than zero.");
  const current = await availableQty(req, { productId: product.productId, warehouseId: from.warehouseId, ownerType: "company", ownerId: companyId });
  if (current < qty) throw new Error(`Insufficient stock in ${from.warehouseName}. Available: ${current}`);
  const transfer = await StockTransferModel.create({
    companyId, companyName: req.user?.companyName, productId: product.productId, productName: product.productName,
    fromWarehouseId: from.warehouseId, fromWarehouseName: from.warehouseName, toWarehouseId: to.warehouseId, toWarehouseName: to.warehouseName,
    quantity: qty, status: "pending", requestedBy: uidFrom(req), note: asText(body.note || body.notes), statusHistory: [{ status: "pending", at: new Date(), by: uidFrom(req) }],
  });
  if (body.autoPost !== false) return completeTransfer({ ...req, params: { id: transfer._id }, body: { unitCost: product.unitCost, batchNo: body.batchNo } });
  return { transfer };
}

async function completeTransfer(req) {
  const { StockTransferModel } = await scoped(req);
  const transfer = await StockTransferModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!transfer) throw new Error("Stock transfer not found.");
  if (transfer.transferApplied) return { transfer };
  const qty = toNumber(transfer.quantity);
  const current = await availableQty(req, { productId: transfer.productId, warehouseId: transfer.fromWarehouseId, ownerType: "company", ownerId: companyIdFrom(req) });
  if (current < qty) throw new Error(`Insufficient stock in ${transfer.fromWarehouseName}. Available: ${current}`);
  const unitCost = toMoney(req.body?.unitCost || 0);
  const batchNo = asText(req.body?.batchNo);
  const outRow = await createLedgerRow(req, { ownerType: "company", ownerId: companyIdFrom(req), warehouseId: transfer.fromWarehouseId, warehouseName: transfer.fromWarehouseName, productId: transfer.productId, productName: transfer.productName, batchNo, movementType: "transfer_out", direction: "out", qty, unitCost, referenceType: "stock_transfer", referenceId: transfer._id, referenceNo: `TRF-${transfer._id}` });
  const inRow = await createLedgerRow(req, { ownerType: "company", ownerId: companyIdFrom(req), warehouseId: transfer.toWarehouseId, warehouseName: transfer.toWarehouseName, productId: transfer.productId, productName: transfer.productName, batchNo, movementType: "transfer_in", direction: "in", qty, unitCost, referenceType: "stock_transfer", referenceId: transfer._id, referenceNo: `TRF-${transfer._id}` });
  transfer.status = "completed";
  transfer.transferApplied = true;
  transfer.transferAppliedAt = new Date();
  transfer.approvedBy = uidFrom(req);
  transfer.statusHistory.push({ status: "completed", at: new Date(), by: uidFrom(req) });
  await transfer.save();
  return { transfer, ledger: [outRow, inRow] };
}

async function lowStock(req) {
  const { ProductModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [products, rows] = await Promise.all([ProductModel.find({ companyId }).lean().catch(() => []), stockSummary(req)]);
  const stockByProduct = new Map(rows.map((row) => [String(row.productId), row]));
  return products.map((product) => {
    const row = stockByProduct.get(String(product.productId || product._id)) || stockByProduct.get(String(product._id)) || {};
    const minStockLevel = toNumber(product.minStockLevel);
    const balanceQty = toNumber(row.balanceQty);
    return { productId: product.productId || String(product._id), productCode: product.code || product.sku, productName: product.name, minStockLevel, balanceQty, shortageQty: Math.max(0, minStockLevel - balanceQty), status: balanceQty <= minStockLevel ? "low" : "ok" };
  }).filter((row) => row.status === "low").sort((a, b) => b.shortageQty - a.shortageQty);
}

async function valuation(req) {
  const rows = await stockSummary(req);
  return rows.map((row) => ({ ...row, averageCost: row.balanceQty ? toMoney(row.stockValue / row.balanceQty) : 0 })).sort((a, b) => Number(b.stockValue || 0) - Number(a.stockValue || 0));
}

async function batches(req) {
  const rows = await warehouseStockSummary(req);
  return rows.filter((row) => row.batchNo).map((row) => ({ ...row, status: Number(row.balanceQty || 0) > 0 ? "available" : "closed" }));
}

async function stockCard(req) {
  const rows = await ledger(req);
  let runningQty = 0;
  let runningValue = 0;
  return [...rows].reverse().map((row) => {
    runningQty += row.direction === "in" ? Number(row.qty || 0) : -Number(row.qty || 0);
    runningValue += row.direction === "in" ? Number(row.totalValue || 0) : -Number(row.totalValue || 0);
    return { ...row, runningQty, runningValue: toMoney(runningValue) };
  }).reverse();
}

async function overview(req) {
  const { InventoryLedgerModel, GoodsReceiptModel, WarehouseModel, ProductModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [summary, warehouseSummary, ledgerCount, postedReceipts, draftReceipts, warehouses, products, adjustments, transfers, lowStockRows, valuationRows, batchRows, ledgerRows] = await Promise.all([
    stockSummary(req), warehouseStockSummary(req), InventoryLedgerModel.countDocuments({ companyId }), GoodsReceiptModel.countDocuments({ companyId, status: "posted" }), GoodsReceiptModel.countDocuments({ companyId, status: "draft" }), WarehouseModel.find({ companyId }).sort({ name: 1 }).lean().catch(() => []), ProductModel.find({ companyId }).sort({ name: 1 }).lean().catch(() => []), listAdjustments(req), listTransfers(req), lowStock(req), valuation(req), batches(req), ledger(req),
  ]);
  const companySummary = summary.filter((row) => row.ownerType === "company");
  const distributorSummary = summary.filter((row) => row.ownerType === "distributor");
  const totalQty = companySummary.reduce((sum, row) => sum + Number(row.balanceQty || 0), 0);
  const distributorQty = distributorSummary.reduce((sum, row) => sum + Number(row.balanceQty || 0), 0);
  const totalValue = companySummary.reduce((sum, row) => sum + Number(row.stockValue || 0), 0);
  return { summary, warehouseSummary, companySummary, distributorSummary, adjustments, transfers, lowStock: lowStockRows, valuation: valuationRows, batches: batchRows, ledgerRows: ledgerRows.slice(0, 200), warehouses, products, kpis: { totalQty, distributorQty, totalValue, ledgerCount, postedReceipts, draftReceipts, warehouses: warehouses.length, products: products.length, stockLines: summary.length, lowStockItems: lowStockRows.length, pendingTransfers: transfers.filter((t) => t.status !== "completed").length, adjustments: adjustments.length, batchLines: batchRows.length } };
}

module.exports = { overview, stockSummary, warehouseStockSummary, ledger, listAdjustments, createAdjustment, listTransfers, createTransfer, completeTransfer, lowStock, valuation, batches, stockCard };
