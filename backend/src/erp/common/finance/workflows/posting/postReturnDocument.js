const ReturnDocument = require('../../../returns/models/ReturnDocument');
const InventoryLedger = require('../../../inventory/models/InventoryLedger');
const CustomerInvoice = require('../../models/CustomerInvoice');
const CompanyInvoiceToDistributor = require('../../models/CompanyInvoiceToDistributor');
const SupplierInvoice = require('../../models/SupplierInvoice');
const { getScopedModels, asText } = require('../../../../platform/tenancy/services/scopedModels');
const { recalcInvoiceBalance } = require('../../services/balances/recalcInvoiceBalance');

function inventoryMovementForReturn(doc) {
  const warehouseId = asText(doc.warehouseId || doc.toParty?.partyId || doc.fromParty?.partyId);
  const warehouseName = asText(doc.warehouseName || doc.toParty?.partyName || doc.fromParty?.partyName);

  if (doc.returnType === 'customer_return') {
    return { movementType: 'return_in', direction: 'in', warehouseId, warehouseName };
  }
  if (doc.returnType === 'distributor_return_to_company') {
    return { movementType: doc.ownerType === 'company' ? 'return_in' : 'return_out', direction: doc.ownerType === 'company' ? 'in' : 'out', warehouseId, warehouseName };
  }
  return { movementType: 'return_out', direction: 'out', warehouseId, warehouseName };
}

async function adjustSourceInvoice(doc, models) {
  const returnValue = Number(doc.totals?.grandTotal || 0);
  if (!returnValue || !doc.sourceDocumentId) return null;

  const sourceType = asText(doc.sourceDocumentType).toLowerCase();

  if (doc.returnType === 'customer_return' || sourceType.includes('customer_invoice')) {
    const invoice = await models.CustomerInvoiceModel.findById(doc.sourceDocumentId);
    if (!invoice) return null;
    invoice.invoiceTotal = Math.max(Number(invoice.invoiceTotal || invoice.totals?.grandTotal || 0) - returnValue, 0);
    await invoice.save();
    return recalcInvoiceBalance(models.CustomerInvoiceModel, invoice._id, 'allocatedReceiptTotal');
  }

  if (doc.returnType === 'distributor_return_to_company' || sourceType.includes('company_invoice')) {
    const invoice = await models.CompanyInvoiceToDistributorModel.findById(doc.sourceDocumentId);
    if (!invoice) return null;
    invoice.invoiceTotal = Math.max(Number(invoice.invoiceTotal || invoice.totals?.grandTotal || 0) - returnValue, 0);
    await invoice.save();
    return recalcInvoiceBalance(models.CompanyInvoiceToDistributorModel, invoice._id, 'allocatedReceiptTotal');
  }

  if (doc.returnType === 'purchase_return' || sourceType.includes('supplier_invoice')) {
    const invoice = await models.SupplierInvoiceModel.findById(doc.sourceDocumentId);
    if (!invoice) return null;
    invoice.invoiceTotal = Math.max(Number(invoice.invoiceTotal || invoice.totals?.grandTotal || 0) - returnValue, 0);
    await invoice.save();
    return recalcInvoiceBalance(models.SupplierInvoiceModel, invoice._id, 'allocatedPaymentTotal');
  }

  return null;
}

async function postReturnDocument(req, returnId) {
  const {
    ReturnDocumentModel,
    InventoryLedgerModel,
    CustomerInvoiceModel,
    CompanyInvoiceToDistributorModel,
    SupplierInvoiceModel,
  } = await getScopedModels(req, {
    ReturnDocumentModel: ReturnDocument,
    InventoryLedgerModel: InventoryLedger,
    CustomerInvoiceModel: CustomerInvoice,
    CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
    SupplierInvoiceModel: SupplierInvoice,
  });

  const doc = await ReturnDocumentModel.findById(returnId);
  if (!doc) throw new Error('Return document not found');
  if (doc.ledgerPosting?.postingState === 'posted') return doc;

  const movement = inventoryMovementForReturn(doc);
  const ledgerRows = (doc.lines || []).map((line) => ({
    companyId: doc.companyId,
    ownerType: doc.ownerType,
    ownerId: doc.ownerId,
    distributorId: doc.distributorId,
    warehouseId: movement.warehouseId,
    warehouseName: movement.warehouseName,
    productId: asText(line.productId),
    productCode: asText(line.productCode),
    productName: asText(line.productName),
    batchNo: asText(line.batchNo),
    movementType: movement.movementType,
    direction: movement.direction,
    qty: Number(line.returnedQty || line.qty || 0),
    unitCost: Number(line.unitCost || 0),
    totalValue: Number(line.unitCost || 0) * Number(line.returnedQty || line.qty || 0),
    referenceType: 'return_document',
    referenceId: doc._id,
    referenceNo: doc.documentNo,
    postedByUserId: asText(req.user.uid),
  }));

  if (ledgerRows.length) {
    await InventoryLedgerModel.insertMany(ledgerRows);
  }

  await adjustSourceInvoice(doc, {
    CustomerInvoiceModel,
    CompanyInvoiceToDistributorModel,
    SupplierInvoiceModel,
  });

  doc.status = 'posted';
  doc.ledgerPosting = {
    postingState: 'posted',
    postingKey: `return_document:${doc._id}`,
    postedAt: new Date(),
  };
  doc.statusHistory.push({
    status: 'posted',
    changedBy: asText(req.user.uid),
    note: 'Return inventory/financial effects posted',
  });
  await doc.save();

  return doc;
}

module.exports = { postReturnDocument };
