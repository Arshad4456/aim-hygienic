const mongoose = require("mongoose");
const WarehouseTransaction = require("../../models/WarehouseTransaction");
const GoodsReceipt = require("../../models/GoodsReceipt");
const CompanyDispatchNote = require("../../models/CompanyDispatchNote");
const CompanySalesOrder = require("../../models/CompanySalesOrder");
const ReturnDocument = require("../../models/ReturnDocument");
const User = require("../../models/User");
const { mapLegacyWarehouseTransaction } = require("../../services/migrations/legacyMappers");
const { getTenantModels } = require("./utils");

function asText(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return asText(value).toLowerCase();
}

function uniqueNonEmpty(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((value) => asText(value)).filter(Boolean)));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makePartySnapshot({ partyType, partyId, partyCode, partyName, contactName, mobile, address }) {
  return {
    partyType: asText(partyType),
    partyId: asText(partyId),
    partyCode: asText(partyCode),
    partyName: asText(partyName),
    contactName: asText(contactName),
    mobile: asText(mobile),
    address: asText(address),
  };
}

function mapWarehouseItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const qty = Number(item?.totalPacks || item?.packs || item?.cartons || 0) || 0;
    const unitPrice = Number(item?.unitPrice || item?.onePackPrice || 0) || 0;
    return {
      lineNo: index + 1,
      productId: asText(item?.productId),
      productName: asText(item?.productName),
      uom: asText(item?.cartonSize) || "pack",
      qty,
      reservedQty: qty,
      dispatchedQty: qty,
      receivedQty: 0,
      deliveredQty: 0,
      returnedQty: 0,
      bonusQty: 0,
      unitPrice,
      unitCost: Number(item?.unitCost || item?.onePackPrice || 0) || 0,
      discountValue: 0,
      taxPercent: 0,
      taxValue: 0,
      netLineAmount: Number(item?.totalPrice || qty * unitPrice) || 0,
      batchNo: asText(item?.batchNo),
      notes: asText(item?.notes),
    };
  });
}

async function resolveDistributorContext(models, legacy) {
  const explicitIds = uniqueNonEmpty([
    legacy.distributorId,
    legacy.subDistributorId,
  ]);

  const distributorHints = uniqueNonEmpty([
    legacy.distributorName,
    legacy.subDistributorName,
    normalizeText(legacy.toEntityType).includes("distributor") ? legacy.toEntityName : "",
    normalizeText(legacy.fromEntityType).includes("distributor") ? legacy.fromEntityName : "",
  ]);

  const DistributorUserModel = models.UserModel;

  for (const id of explicitIds) {
    const found = await DistributorUserModel.findOne({
      role: /^distributor$/i,
      $or: [
        { userId: id },
        { distributorId: id },
        { _id: mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : undefined },
      ].filter(Boolean),
    })
      .select("_id userId distributorId fullName businessName mobile address shopAddress")
      .lean();

    if (found) {
      const resolvedId = asText(found.userId || found.distributorId || found._id);
      const resolvedName = asText(found.businessName || found.fullName || legacy.distributorName || legacy.toEntityName);
      return {
        distributorId: resolvedId,
        distributorName: resolvedName,
        distributor: makePartySnapshot({
          partyType: "distributor",
          partyId: resolvedId,
          partyCode: asText(found.userId || found.distributorId),
          partyName: resolvedName,
          contactName: asText(found.fullName),
          mobile: asText(found.mobile),
          address: asText(found.address || found.shopAddress),
        }),
        source: "matched_by_id",
      };
    }
  }

  for (const name of distributorHints) {
    const regex = new RegExp(`^${escapeRegExp(name)}$`, "i");
    const found = await DistributorUserModel.findOne({
      role: /^distributor$/i,
      $or: [
        { businessName: regex },
        { fullName: regex },
        { distributorName: regex },
      ],
    })
      .select("_id userId distributorId fullName businessName mobile address shopAddress")
      .lean();

    if (found) {
      const resolvedId = asText(found.userId || found.distributorId || found._id);
      const resolvedName = asText(found.businessName || found.fullName || name);
      return {
        distributorId: resolvedId,
        distributorName: resolvedName,
        distributor: makePartySnapshot({
          partyType: "distributor",
          partyId: resolvedId,
          partyCode: asText(found.userId || found.distributorId),
          partyName: resolvedName,
          contactName: asText(found.fullName),
          mobile: asText(found.mobile),
          address: asText(found.address || found.shopAddress),
        }),
        source: "matched_by_name",
      };
    }
  }

  const fallbackName = distributorHints[0] || "Legacy Distributor";
  const fallbackId = explicitIds[0] || `legacy-distributor-${asText(legacy._id)}`;

  return {
    distributorId: fallbackId,
    distributorName: fallbackName,
    distributor: makePartySnapshot({
      partyType: "distributor",
      partyId: fallbackId,
      partyCode: fallbackId,
      partyName: fallbackName,
      address: "",
    }),
    source: "synthetic",
  };
}

function deriveCompanyOrderStatus(legacy) {
  const requestStatus = normalizeText(legacy.requestStatus);
  if (requestStatus === "delivered") return "received";
  if (requestStatus === "dispatched") return "dispatched";
  if (requestStatus === "approved") return "approved";
  return "approved";
}

async function ensureCompanySalesOrder(models, legacy, distributorContext, options = {}) {
  const CompanySalesOrderModel = models.CompanySalesOrderModel;
  const documentNo = asText(legacy.transactionCode);
  if (!documentNo) throw new Error("Legacy warehouse transaction has no transactionCode");

  let order = await CompanySalesOrderModel.findOne({ documentNo });
  if (order) return order;

  const payload = {
    companyId: asText(legacy.companyId),
    companyName: asText(legacy.companyName),
    documentNo,
    ownerId: asText(legacy.companyId),
    distributorId: distributorContext.distributorId,
    distributor: distributorContext.distributor,
    dispatchFromWarehouse: makePartySnapshot({
      partyType: "warehouse",
      partyId: asText(legacy.dispatchFromWarehouseId || legacy.warehouseId),
      partyName: asText(legacy.dispatchFromWarehouseName || legacy.warehouseName),
    }),
    receiveAtWarehouse: makePartySnapshot({
      partyType: "warehouse",
      partyId: asText(legacy.warehouseId),
      partyName: asText(legacy.warehouseName || legacy.toEntityName),
    }),
    freightPayer: "company",
    deliveryMode: normalizeText(legacy.toEntityType).includes("pickup") ? "distributor_pickup" : "company_truck",
    status: deriveCompanyOrderStatus(legacy),
    financialStatus: "not_invoiced",
    lines: mapWarehouseItems(legacy.items),
    totals: {
      subtotal: Number(legacy.subtotal || 0) || 0,
      discountTotal: Number(legacy.adjustment || 0) || 0,
      taxTotal: 0,
      freightTotal: Number(legacy.expense || 0) || 0,
      otherChargesTotal: 0,
      grandTotal: Number(legacy.grandTotal || 0) || 0,
    },
    createdByUserId: asText(legacy.createdBy),
    approvedByUserId: asText(legacy.requestReviewedBy),
    notes: [
      asText(legacy.note),
      `Auto-created from legacy warehouse transaction ${documentNo}`,
      distributorContext.source === "synthetic" ? "Distributor resolved using synthetic migration fallback." : "",
    ].filter(Boolean).join(" | "),
    statusHistory: [{
      status: deriveCompanyOrderStatus(legacy),
      changedBy: asText(legacy.createdBy || "legacy-migration"),
      note: "Auto-created during legacy warehouse transaction migration",
      changedAt: legacy.transactionAt ? new Date(legacy.transactionAt) : new Date(),
    }],
  };

  if (options.dryRun) {
    return { _id: new mongoose.Types.ObjectId(), ...payload };
  }

  order = await CompanySalesOrderModel.create(payload);
  return order;
}

async function migrateWarehouseTransactions(target, options = {}) {
  const models = await getTenantModels(target, {
    LegacyWarehouseTransactionModel: WarehouseTransaction,
    GoodsReceiptModel: GoodsReceipt,
    CompanyDispatchNoteModel: CompanyDispatchNote,
    CompanySalesOrderModel: CompanySalesOrder,
    ReturnDocumentModel: ReturnDocument,
    UserModel: User,
  });

  const summary = {
    companyId: target.companyId,
    sourceCount: 0,
    goodsReceipts: 0,
    dispatchNotes: 0,
    returnDocs: 0,
    autoCreatedCompanySalesOrders: 0,
    syntheticDistributorFallbacks: 0,
    skipped: 0,
    errors: [],
  };

  const legacyDocs = await models.LegacyWarehouseTransactionModel.find({})
    .sort({ transactionAt: 1 })
    .limit(options.limit || 0);
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

      if (mapped.target === "CompanyDispatchNote") {
        const distributorContext = await resolveDistributorContext(models, legacy);
        if (distributorContext.source === "synthetic") {
          summary.syntheticDistributorFallbacks += 1;
        }

        const existingOrder = await models.CompanySalesOrderModel.findOne({ documentNo: asText(legacy.transactionCode) });
        const companionOrder = existingOrder || await ensureCompanySalesOrder(models, legacy, distributorContext, options);
        if (!existingOrder) {
          summary.autoCreatedCompanySalesOrders += 1;
        }

        mapped.payload.companySalesOrderId = companionOrder?._id;
        mapped.payload.distributorId = distributorContext.distributorId;
        mapped.payload.notes = [
          asText(mapped.payload.notes),
          distributorContext.source === "synthetic" ? "Distributor resolved using synthetic migration fallback." : "",
        ].filter(Boolean).join(" | ");
      }

      if (!options.dryRun) await Model.create(mapped.payload);
      if (mapped.target === "GoodsReceipt") summary.goodsReceipts += 1;
      if (mapped.target === "CompanyDispatchNote") summary.dispatchNotes += 1;
      if (mapped.target === "ReturnDocument") summary.returnDocs += 1;
    } catch (error) {
      summary.errors.push({ id: String(legacy._id), code: legacy.transactionCode, message: error.message });
    }
  }
  return summary;
}

module.exports = { migrateWarehouseTransactions };
