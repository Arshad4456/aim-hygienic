const mongoose = require("mongoose");
const CompanyDispatchNote = require("../../../../distribution/sales/models/CompanyDispatchNote");
const CompanySalesOrder = require("../../../../distribution/sales/models/CompanySalesOrder");
const InventoryLedger = require("../../../inventory/models/InventoryLedger");
const { getScopedModels, asText } = require("../../../../platform/tenancy/services/scopedModels");

async function postCompanyDispatch(req, dispatchId) {
  const { CompanyDispatchNoteModel, CompanySalesOrderModel, InventoryLedgerModel } = await getScopedModels(req, {
    CompanyDispatchNoteModel: CompanyDispatchNote,
    CompanySalesOrderModel: CompanySalesOrder,
    InventoryLedgerModel: InventoryLedger,
  });

  const session = await mongoose.startSession();
  try {
    let responseDoc = null;

    await session.withTransaction(async () => {
      const dispatch = await CompanyDispatchNoteModel.findById(dispatchId).session(session);
      if (!dispatch) throw new Error("Dispatch note not found");
      if (dispatch.ledgerPosting?.postingState === "posted") {
        responseDoc = dispatch;
        return;
      }

      const sourceOrder = await CompanySalesOrderModel.findById(dispatch.companySalesOrderId).session(session);
      if (!sourceOrder) throw new Error("Company sales order not found");

      const ledgerRows = dispatch.lines.map((line) => ({
        companyId: dispatch.companyId,
        ownerType: "company",
        ownerId: asText(req.user.companyId),
        distributorId: dispatch.distributorId,
        warehouseId: asText(dispatch.dispatchFromWarehouse?.partyId),
        warehouseName: asText(dispatch.dispatchFromWarehouse?.partyName),
        productId: asText(line.productId),
        productCode: asText(line.productCode),
        productName: asText(line.productName),
        batchNo: asText(line.batchNo),
        movementType: "company_dispatch",
        direction: "out",
        qty: Number(line.dispatchedQty || line.qty || 0),
        unitCost: Number(line.unitCost || 0),
        totalValue: Number(line.unitCost || 0) * Number(line.dispatchedQty || line.qty || 0),
        referenceType: "company_dispatch_note",
        referenceId: dispatch._id,
        referenceNo: dispatch.documentNo,
        postedByUserId: asText(req.user.uid),
      }));

      if (ledgerRows.length) await InventoryLedgerModel.insertMany(ledgerRows, { session });

      dispatch.status = "posted";
      dispatch.ledgerPosting = { postingState: "posted", postingKey: `company_dispatch:${dispatch._id}`, postedAt: new Date() };
      dispatch.statusHistory.push({ status: "posted", changedBy: asText(req.user.uid), note: "Inventory out posted" });
      await dispatch.save({ session });

      sourceOrder.status = "dispatched";
      sourceOrder.statusHistory.push({ status: "dispatched", changedBy: asText(req.user.uid), note: `Dispatch posted: ${dispatch.documentNo}` });
      await sourceOrder.save({ session });

      responseDoc = dispatch;
    });

    return responseDoc;
  } finally {
    await session.endSession();
  }
}

module.exports = { postCompanyDispatch };
