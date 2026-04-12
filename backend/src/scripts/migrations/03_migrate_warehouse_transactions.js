const WarehouseTransaction = require("../../models/WarehouseTransaction");
const GoodsReceipt = require("../../models/GoodsReceipt");
const CompanyDispatchNote = require("../../models/CompanyDispatchNote");
const ReturnDocument = require("../../models/ReturnDocument");
const { mapLegacyWarehouseTransaction } = require("../../services/migrations/legacyMappers");
const { getTenantModels } = require("./utils");

async function migrateWarehouseTransactions(target, options = {}) {
  const models = await getTenantModels(target, {
    LegacyWarehouseTransactionModel: WarehouseTransaction,
    GoodsReceiptModel: GoodsReceipt,
    CompanyDispatchNoteModel: CompanyDispatchNote,
    ReturnDocumentModel: ReturnDocument,
  });

  const summary = { companyId: target.companyId, sourceCount: 0, goodsReceipts: 0, dispatchNotes: 0, returnDocs: 0, skipped: 0, errors: [] };
  const legacyDocs = await models.LegacyWarehouseTransactionModel.find({}).sort({ transactionAt: 1 }).limit(options.limit || 0);
  summary.sourceCount = legacyDocs.length;

  for (const legacy of legacyDocs) {
    try {
      const mapped = mapLegacyWarehouseTransaction(legacy);
      if (!mapped.target) {
        summary.skipped += 1;
        continue;
      }
      const modelMap = {
        GoodsReceipt: models.GoodsReceiptModel,
        CompanyDispatchNote: models.CompanyDispatchNoteModel,
        ReturnDocument: models.ReturnDocumentModel,
      };
      const Model = modelMap[mapped.target];
      const exists = await Model.findOne({ documentNo: mapped.payload.documentNo });
      if (exists) {
        summary.skipped += 1;
        continue;
      }
      if (!options.dryRun) await Model.create(mapped.payload);
      if (mapped.target === 'GoodsReceipt') summary.goodsReceipts += 1;
      if (mapped.target === 'CompanyDispatchNote') summary.dispatchNotes += 1;
      if (mapped.target === 'ReturnDocument') summary.returnDocs += 1;
    } catch (error) {
      summary.errors.push({ id: String(legacy._id), code: legacy.transactionCode, message: error.message });
    }
  }
  return summary;
}

module.exports = { migrateWarehouseTransactions };
