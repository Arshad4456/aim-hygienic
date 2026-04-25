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
async function ledger(req) {
  const { InventoryLedgerModel } = await scoped(req);
  const match = baseMatch(req);
  if (req.query.referenceType) match.referenceType = asText(req.query.referenceType);
  return InventoryLedgerModel.find(match).sort({ postedAt: -1, createdAt: -1 }).limit(1000).lean();
}
async function stockSummary(req) {
  const { InventoryLedgerModel } = await scoped(req);
  return InventoryLedgerModel.aggregate([
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
      productId: "$_id.productId", productCode: "$_id.productCode", productName: "$_id.productName",
      inQty: 1, outQty: 1, balanceQty: { $subtract: ["$inQty", "$outQty"] }, stockValue: { $subtract: ["$inValue", "$outValue"] }, lastMovementAt: 1,
    } },
    { $sort: { productName: 1, warehouseName: 1 } },
  ]);
}
async function overview(req) {
  const { InventoryLedgerModel, GoodsReceiptModel, WarehouseModel, ProductModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [summary, ledgerCount, postedReceipts, draftReceipts, warehouses, products] = await Promise.all([
    stockSummary(req),
    InventoryLedgerModel.countDocuments({ companyId }),
    GoodsReceiptModel.countDocuments({ companyId, status: "posted" }),
    GoodsReceiptModel.countDocuments({ companyId, status: "draft" }),
    WarehouseModel.countDocuments({ companyId }).catch(() => 0),
    ProductModel.countDocuments({ companyId }).catch(() => 0),
  ]);
  const totalQty = summary.reduce((sum, row) => sum + Number(row.balanceQty || 0), 0);
  const totalValue = summary.reduce((sum, row) => sum + Number(row.stockValue || 0), 0);
  return { summary, kpis: { totalQty, totalValue, ledgerCount, postedReceipts, draftReceipts, warehouses, products, stockLines: summary.length } };
}
module.exports = { overview, stockSummary, ledger };
