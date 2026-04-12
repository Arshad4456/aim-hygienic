const InventoryMovement = require("../../models/InventoryMovement");
const InventoryLedger = require("../../models/InventoryLedger");
const { mapLegacyInventoryMovement } = require("../../services/migrations/legacyMappers");
const { getTenantModels } = require("./utils");

async function migrateInventoryMovements(target, options = {}) {
  const models = await getTenantModels(target, {
    LegacyInventoryMovementModel: InventoryMovement,
    InventoryLedgerModel: InventoryLedger,
  });

  const summary = { companyId: target.companyId, sourceCount: 0, migrated: 0, skipped: 0, errors: [] };
  const legacyDocs = await models.LegacyInventoryMovementModel.find({}).sort({ createdAt: 1 }).limit(options.limit || 0);
  summary.sourceCount = legacyDocs.length;

  for (const legacy of legacyDocs) {
    try {
      const payload = mapLegacyInventoryMovement(legacy);
      const exists = await models.InventoryLedgerModel.findOne({ referenceType: payload.referenceType, referenceId: payload.referenceId });
      if (exists) {
        summary.skipped += 1;
        continue;
      }
      if (!options.dryRun) await models.InventoryLedgerModel.create(payload);
      summary.migrated += 1;
    } catch (error) {
      summary.errors.push({ id: String(legacy._id), message: error.message });
    }
  }
  return summary;
}

module.exports = { migrateInventoryMovements };
