const SalesOrder = require("../../models/SalesOrder");
const CompanySalesOrder = require("../../models/CompanySalesOrder");
const SecondaryOrder = require("../../models/SecondaryOrder");
const { mapLegacySalesOrder } = require("../../services/migrations/legacyMappers");
const { getTenantModels } = require("./utils");

async function migrateSalesOrders(target, options = {}) {
  const models = await getTenantModels(target, {
    LegacySalesOrderModel: SalesOrder,
    CompanySalesOrderModel: CompanySalesOrder,
    SecondaryOrderModel: SecondaryOrder,
  });

  const summary = { companyId: target.companyId, sourceCount: 0, migratedCompany: 0, migratedSecondary: 0, skipped: 0, errors: [] };
  const legacyDocs = await models.LegacySalesOrderModel.find({}).sort({ createdAt: 1 }).limit(options.limit || 0);
  summary.sourceCount = legacyDocs.length;

  for (const legacy of legacyDocs) {
    try {
      const mapped = mapLegacySalesOrder(legacy);
      if (!mapped.target) {
        summary.skipped += 1;
        continue;
      }
      const Model = mapped.target === 'CompanySalesOrder' ? models.CompanySalesOrderModel : models.SecondaryOrderModel;
      const exists = await Model.findOne({ documentNo: mapped.payload.documentNo });
      if (exists) {
        summary.skipped += 1;
        continue;
      }
      if (!options.dryRun) await Model.create(mapped.payload);
      if (mapped.target === 'CompanySalesOrder') summary.migratedCompany += 1;
      else summary.migratedSecondary += 1;
    } catch (error) {
      summary.errors.push({ id: String(legacy._id), orderNo: legacy.orderNo, message: error.message });
    }
  }
  return summary;
}

module.exports = { migrateSalesOrders };
