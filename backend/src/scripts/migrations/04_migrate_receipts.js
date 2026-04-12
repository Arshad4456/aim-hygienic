const Receipt = require("../../models/Receipt");
const SalesOrder = require("../../models/SalesOrder");
const CustomerReceipt = require("../../models/CustomerReceipt");
const CompanyReceiptFromDistributor = require("../../models/CompanyReceiptFromDistributor");
const { mapLegacyReceipt } = require("../../services/migrations/legacyMappers");
const { getTenantModels } = require("./utils");

async function migrateReceipts(target, options = {}) {
  const models = await getTenantModels(target, {
    LegacyReceiptModel: Receipt,
    LegacySalesOrderModel: SalesOrder,
    CustomerReceiptModel: CustomerReceipt,
    CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
  });

  const summary = { companyId: target.companyId, sourceCount: 0, customerReceipts: 0, distributorReceipts: 0, skipped: 0, errors: [] };
  const legacyDocs = await models.LegacyReceiptModel.find({}).sort({ paymentDate: 1 }).limit(options.limit || 0);
  summary.sourceCount = legacyDocs.length;

  for (const legacy of legacyDocs) {
    try {
      const linkedOrder = legacy.linkedOrderId ? await models.LegacySalesOrderModel.findById(legacy.linkedOrderId).lean() : null;
      const mapped = mapLegacyReceipt(legacy, linkedOrder);
      const Model = mapped.target === 'CustomerReceipt' ? models.CustomerReceiptModel : models.CompanyReceiptFromDistributorModel;
      const exists = await Model.findOne({ documentNo: mapped.payload.documentNo });
      if (exists) {
        summary.skipped += 1;
        continue;
      }
      if (!options.dryRun) await Model.create(mapped.payload);
      if (mapped.target === 'CustomerReceipt') summary.customerReceipts += 1;
      else summary.distributorReceipts += 1;
    } catch (error) {
      summary.errors.push({ id: String(legacy._id), receiptNo: legacy.receiptNo, message: error.message });
    }
  }
  return summary;
}

module.exports = { migrateReceipts };
