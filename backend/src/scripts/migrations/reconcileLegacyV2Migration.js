const { parseArgs, ensureDb, getTargets, getTenantModels, printSummary, closeDb } = require("./utils");
const SalesOrder = require("../../models/SalesOrder");
const InventoryMovement = require("../../models/InventoryMovement");
const WarehouseTransaction = require("../../models/WarehouseTransaction");
const Receipt = require("../../models/Receipt");
const PrimaryPayment = require("../../models/PrimaryPayment");
const SecondaryPayment = require("../../models/SecondaryPayment");
const CompanySalesOrder = require("../../models/CompanySalesOrder");
const SecondaryOrder = require("../../models/SecondaryOrder");
const InventoryLedger = require("../../models/InventoryLedger");
const GoodsReceipt = require("../../models/GoodsReceipt");
const CompanyDispatchNote = require("../../models/CompanyDispatchNote");
const ReturnDocument = require("../../models/ReturnDocument");
const CustomerReceipt = require("../../models/CustomerReceipt");
const CompanyReceiptFromDistributor = require("../../models/CompanyReceiptFromDistributor");
const CompanyInvoiceToDistributor = require("../../models/CompanyInvoiceToDistributor");

async function main() {
  const options = parseArgs();
  await ensureDb();
  const targets = await getTargets(options.companyId);

  for (const target of targets) {
    const models = await getTenantModels(target, {
      SalesOrderModel: SalesOrder,
      InventoryMovementModel: InventoryMovement,
      WarehouseTransactionModel: WarehouseTransaction,
      ReceiptModel: Receipt,
      PrimaryPaymentModel: PrimaryPayment,
      SecondaryPaymentModel: SecondaryPayment,
      CompanySalesOrderModel: CompanySalesOrder,
      SecondaryOrderModel: SecondaryOrder,
      InventoryLedgerModel: InventoryLedger,
      GoodsReceiptModel: GoodsReceipt,
      CompanyDispatchNoteModel: CompanyDispatchNote,
      ReturnDocumentModel: ReturnDocument,
      CustomerReceiptModel: CustomerReceipt,
      CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
      CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
    });

    const summary = {
      companyId: target.companyId,
      legacy: {
        salesOrders: await models.SalesOrderModel.countDocuments(),
        inventoryMovements: await models.InventoryMovementModel.countDocuments(),
        warehouseTransactions: await models.WarehouseTransactionModel.countDocuments(),
        receipts: await models.ReceiptModel.countDocuments(),
        primaryPayments: await models.PrimaryPaymentModel.countDocuments(),
        secondaryPayments: await models.SecondaryPaymentModel.countDocuments(),
      },
      v2: {
        companySalesOrders: await models.CompanySalesOrderModel.countDocuments(),
        secondaryOrders: await models.SecondaryOrderModel.countDocuments(),
        inventoryLedger: await models.InventoryLedgerModel.countDocuments(),
        goodsReceipts: await models.GoodsReceiptModel.countDocuments(),
        companyDispatchNotes: await models.CompanyDispatchNoteModel.countDocuments(),
        returnDocuments: await models.ReturnDocumentModel.countDocuments(),
        customerReceipts: await models.CustomerReceiptModel.countDocuments(),
        companyReceiptsFromDistributors: await models.CompanyReceiptFromDistributorModel.countDocuments(),
        companyInvoicesToDistributors: await models.CompanyInvoiceToDistributorModel.countDocuments(),
      },
    };

    printSummary(`Reconcile ${target.companyId}`, summary);
  }

  await closeDb();
}

main().catch(async (error) => {
  console.error("Reconcile failed:", error);
  await closeDb();
  process.exit(1);
});
