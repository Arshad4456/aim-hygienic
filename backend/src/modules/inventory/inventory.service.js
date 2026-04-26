const InventoryLedger = require("../../models/InventoryLedger");
const GoodsReceipt = require("../../models/GoodsReceipt");
const Warehouse = require("../../models/Warehouse");
const Product = require("../../models/Product");
const { asText, getScopedModels } = require("../../services/scopedModels");

function companyIdFrom(req) { return asText(req.query.companyId || req.body?.companyId || req.user?.companyId); }
async function scoped(req) {
  return getScopedModels(req, {
    InventoryLedgerModel: InventoryLedger,
    GoodsReceiptModel: GoodsReceipt,
    WarehouseModel: Warehouse,
    ProductModel: Product,
  });
}
function baseMatch(req) {
  const match = { companyId: companyIdFrom(req) };
  if (req.query.ownerType) match.ownerType = asText(req.query.ownerType);
  if (req.query.ownerId) match.ownerId = asText(req.query.ownerId);
  if (req.query.warehouseId) match.warehouseId = asText(req.query.warehouseId);
  if (req.query.productId) match.productId = asText(req.query.productId);
  return match;
}
async function productNameMap(ProductModel, companyId) {
  const products = await ProductModel.find({ companyId }).select("_id productId code sku name").lean().catch(() => []);
  const map = new Map();
  for (const product of products) {
    const name = asText(product.name || product.productName);
    [product._id, product.productId, product.code, product.sku, name].filter(Boolean).forEach((key) => map.set(String(key), name));
  }
  return map;
}
function prettyProductName(row, names) {
  const current = asText(row.productName);
  const masterName = names.get(String(row.productId || "")) || names.get(String(row.productCode || ""));
  if (masterName && (!current || /^(primary sale item|procurement item|product)$/i.test(current))) return masterName;
  return current || masterName || "Product";
}
async function ledger(req) {
  const { InventoryLedgerModel, ProductModel } = await scoped(req);
  const match = baseMatch(req);
  if (req.query.referenceType) match.referenceType = asText(req.query.referenceType);
  const rows = await InventoryLedgerModel.find(match).sort({ postedAt: -1, createdAt: -1 }).limit(1000).lean();
  const names = await productNameMap(ProductModel, companyIdFrom(req));
  return rows.map((row) => ({ ...row, productName: prettyProductName(row, names) }));
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
      _id: 0,
      ownerType: "$_id.ownerType",
      ownerId: "$_id.ownerId",
      distributorId: "$_id.distributorId",
      productId: "$_id.productId",
      productCode: "$_id.productCode",
      productName: "$_id.productName",
      warehouseCount: { $size: "$warehouses" },
      warehouses: 1,
      inQty: 1,
      outQty: 1,
      balanceQty: { $subtract: ["$inQty", "$outQty"] },
      stockValue: { $subtract: ["$inValue", "$outValue"] },
      lastMovementAt: 1,
    } },
    { $sort: { ownerType: 1, productName: 1 } },
  ]);
  const names = await productNameMap(ProductModel, companyIdFrom(req));
  return rows.map((row) => ({ ...row, productName: prettyProductName(row, names) }));
}
async function warehouseStockSummary(req) {
  const { InventoryLedgerModel, ProductModel } = await scoped(req);
  const rows = await InventoryLedgerModel.aggregate([
    { $match: baseMatch(req) },
    { $group: {
      _id: { ownerType: "$ownerType", ownerId: "$ownerId", warehouseId: "$warehouseId", warehouseName: "$warehouseName", productId: "$productId", productCode: "$productCode", productName: "$productName" },
      inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } },
      outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } },
      inValue: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$totalValue", 0] } },
      outValue: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$totalValue", 0] } },
      lastMovementAt: { $max: "$postedAt" },
    } },
    { $project: {
      _id: 0, ownerType: "$_id.ownerType", ownerId: "$_id.ownerId", warehouseId: "$_id.warehouseId", warehouseName: "$_id.warehouseName",
      productId: "$_id.productId", productCode: "$_id.productCode", productName: "$_id.productName", inQty: 1, outQty: 1,
      balanceQty: { $subtract: ["$inQty", "$outQty"] }, stockValue: { $subtract: ["$inValue", "$outValue"] }, lastMovementAt: 1,
    } },
    { $sort: { warehouseName: 1, productName: 1 } },
  ]);
  const names = await productNameMap(ProductModel, companyIdFrom(req));
  return rows.map((row) => ({ ...row, productName: prettyProductName(row, names) }));
}
async function overview(req) {
  const { InventoryLedgerModel, GoodsReceiptModel, WarehouseModel, ProductModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [summary, warehouseSummary, ledgerCount, postedReceipts, draftReceipts, warehouses, products] = await Promise.all([
    stockSummary(req),
    warehouseStockSummary(req),
    InventoryLedgerModel.countDocuments({ companyId }),
    GoodsReceiptModel.countDocuments({ companyId, status: "posted" }),
    GoodsReceiptModel.countDocuments({ companyId, status: "draft" }),
    WarehouseModel.countDocuments({ companyId }).catch(() => 0),
    ProductModel.countDocuments({ companyId }).catch(() => 0),
  ]);
  const companySummary = summary.filter((row) => row.ownerType === "company");
  const distributorSummary = summary.filter((row) => row.ownerType === "distributor");
  const totalQty = companySummary.reduce((sum, row) => sum + Number(row.balanceQty || 0), 0);
  const distributorQty = distributorSummary.reduce((sum, row) => sum + Number(row.balanceQty || 0), 0);
  const totalValue = companySummary.reduce((sum, row) => sum + Number(row.stockValue || 0), 0);
  return { summary, warehouseSummary, companySummary, distributorSummary, kpis: { totalQty, distributorQty, totalValue, ledgerCount, postedReceipts, draftReceipts, warehouses, products, stockLines: summary.length } };
}
module.exports = { overview, stockSummary, warehouseStockSummary, ledger };
