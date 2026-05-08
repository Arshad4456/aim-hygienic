const Warehouse = require("../../models/Warehouse");
const GoodsReceipt = require("../../models/GoodsReceipt");
const InventoryLedger = require("../../models/InventoryLedger");
const { asText, getScopedModels, scopedCompanyId } = require("../../services/scopedModels");

function companyIdFrom(req) { return scopedCompanyId(req); }
async function scoped(req) { return getScopedModels(req, { WarehouseModel: Warehouse, GoodsReceiptModel: GoodsReceipt, InventoryLedgerModel: InventoryLedger }); }
async function overview(req) {
  const { WarehouseModel, GoodsReceiptModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [warehouses, draftReceipts, postedReceipts, ledgerRows] = await Promise.all([
    WarehouseModel.find({ companyId }).sort({ name: 1 }).lean().catch(() => []),
    GoodsReceiptModel.find({ companyId, status: "draft" }).sort({ createdAt: -1 }).lean(),
    GoodsReceiptModel.find({ companyId, status: "posted" }).sort({ createdAt: -1 }).limit(20).lean(),
    InventoryLedgerModel.find({ companyId, ownerType: "company" }).sort({ postedAt: -1 }).limit(20).lean(),
  ]);
  return { warehouses, draftReceipts, postedReceipts, ledgerRows, kpis: { warehouses: warehouses.length, draftReceipts: draftReceipts.length, postedReceipts: postedReceipts.length, recentMovements: ledgerRows.length } };
}
module.exports = { overview };
