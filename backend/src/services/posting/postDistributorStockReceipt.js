const mongoose = require("mongoose");
const DistributorStockReceipt = require("../../models/DistributorStockReceipt");
const InventoryLedger = require("../../models/InventoryLedger");
const { getScopedModels, asText } = require("../scopedModels");

async function postDistributorStockReceipt(req, receiptId) {
  const { DistributorStockReceiptModel, InventoryLedgerModel } = await getScopedModels(req, {
    DistributorStockReceiptModel: DistributorStockReceipt,
    InventoryLedgerModel: InventoryLedger,
  });

  const session = await mongoose.startSession();
  try {
    let receiptDoc = null;

    await session.withTransaction(async () => {
      const receipt = await DistributorStockReceiptModel.findById(receiptId).session(session);
      if (!receipt) throw new Error("Distributor stock receipt not found");
      if (receipt.ledgerPosting?.postingState === "posted") {
        receiptDoc = receipt;
        return;
      }

      const ledgerRows = receipt.lines.map((line) => ({
        companyId: receipt.companyId,
        ownerType: "distributor",
        ownerId: receipt.ownerId,
        distributorId: receipt.distributorId,
        warehouseId: asText(receipt.receivedAtWarehouse?.partyId),
        warehouseName: asText(receipt.receivedAtWarehouse?.partyName),
        productId: asText(line.productId),
        productCode: asText(line.productCode),
        productName: asText(line.productName),
        batchNo: asText(line.batchNo),
        movementType: "distributor_receipt",
        direction: "in",
        qty: Number(line.receivedQty || line.qty || 0),
        unitCost: Number(line.unitCost || 0),
        totalValue: Number(line.unitCost || 0) * Number(line.receivedQty || line.qty || 0),
        referenceType: "distributor_stock_receipt",
        referenceId: receipt._id,
        referenceNo: receipt.documentNo,
        postedByUserId: asText(req.user.uid),
      }));

      if (ledgerRows.length) {
        await InventoryLedgerModel.insertMany(ledgerRows, { session });
      }

      receipt.status = "posted";
      receipt.ledgerPosting = {
        postingState: "posted",
        postingKey: `distributor_stock_receipt:${receipt._id}`,
        postedAt: new Date(),
      };
      receipt.statusHistory.push({
        status: "posted",
        changedBy: asText(req.user.uid),
        note: "Distributor inventory in posted",
      });
      await receipt.save({ session });

      receiptDoc = receipt;
    });

    return receiptDoc;
  } finally {
    await session.endSession();
  }
}

module.exports = { postDistributorStockReceipt };