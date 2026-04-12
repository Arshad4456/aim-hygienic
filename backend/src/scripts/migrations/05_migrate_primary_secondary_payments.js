const PrimaryPayment = require("../../models/PrimaryPayment");
const SecondaryPayment = require("../../models/SecondaryPayment");
const CompanyInvoiceToDistributor = require("../../models/CompanyInvoiceToDistributor");
const CompanyReceiptFromDistributor = require("../../models/CompanyReceiptFromDistributor");
const { mapLegacyPrimaryPayment, mapLegacySecondaryPayment } = require("../../services/migrations/legacyMappers");
const { getTenantModels } = require("./utils");

async function migratePrimarySecondaryPayments(target, options = {}) {
  const models = await getTenantModels(target, {
    LegacyPrimaryPaymentModel: PrimaryPayment,
    LegacySecondaryPaymentModel: SecondaryPayment,
    CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
    CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
  });

  const summary = { companyId: target.companyId, primarySourceCount: 0, secondarySourceCount: 0, invoicesCreated: 0, receiptsCreated: 0, skipped: 0, errors: [] };

  const primaryDocs = await models.LegacyPrimaryPaymentModel.find({}).sort({ payDate: 1 }).limit(options.limit || 0);
  summary.primarySourceCount = primaryDocs.length;
  for (const legacy of primaryDocs) {
    try {
      const mapped = mapLegacyPrimaryPayment(legacy);
      const exists = await models.CompanyInvoiceToDistributorModel.findOne({ documentNo: mapped.payload.documentNo });
      if (exists) {
        summary.skipped += 1;
        continue;
      }
      if (!options.dryRun) await models.CompanyInvoiceToDistributorModel.create(mapped.payload);
      summary.invoicesCreated += 1;
    } catch (error) {
      summary.errors.push({ id: String(legacy._id), invoiceNo: legacy.invoiceNo, message: error.message });
    }
  }

  const secondaryDocs = await models.LegacySecondaryPaymentModel.find({}).sort({ paidDate: 1 }).limit(options.limit || 0);
  summary.secondarySourceCount = secondaryDocs.length;
  for (const legacy of secondaryDocs) {
    try {
      const mapped = mapLegacySecondaryPayment(legacy);
      const exists = await models.CompanyReceiptFromDistributorModel.findOne({ documentNo: mapped.payload.documentNo });
      if (exists) {
        summary.skipped += 1;
        continue;
      }
      if (!options.dryRun) await models.CompanyReceiptFromDistributorModel.create(mapped.payload);
      summary.receiptsCreated += 1;
    } catch (error) {
      summary.errors.push({ id: String(legacy._id), primaryInvoiceNo: legacy.primaryInvoiceNo, message: error.message });
    }
  }

  return summary;
}

module.exports = { migratePrimarySecondaryPayments };
