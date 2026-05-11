const CompanyReceiptFromDistributor = require('../../models/CompanyReceiptFromDistributor');
const CompanyInvoiceToDistributor = require('../../models/CompanyInvoiceToDistributor');
const CompanySalesOrder = require('../../../../distribution/sales/models/CompanySalesOrder');
const { getScopedModels, asText } = require('../../../../platform/tenancy/services/scopedModels');
const { recalcInvoiceBalance } = require('../../services/balances/recalcInvoiceBalance');

async function syncOrderFinancialStatus(CompanySalesOrderModel, orderId, paymentStatus, changedBy) {
  if (!orderId) return;
  const order = await CompanySalesOrderModel.findById(orderId);
  if (!order) return;
  order.financialStatus = paymentStatus === 'unpaid' ? 'unpaid' : paymentStatus;
  if (paymentStatus === 'paid' && order.status === 'invoiced') {
    order.status = 'closed';
    if (Array.isArray(order.statusHistory)) {
      order.statusHistory.push({ status: 'closed', changedBy, note: 'Invoice fully settled' });
    }
  }
  await order.save();
}

async function postCompanyReceiptFromDistributor(req, receiptId) {
  const {
    CompanyReceiptFromDistributorModel,
    CompanyInvoiceToDistributorModel,
    CompanySalesOrderModel,
  } = await getScopedModels(req, {
    CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
    CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
    CompanySalesOrderModel: CompanySalesOrder,
  });

  const receipt = await CompanyReceiptFromDistributorModel.findById(receiptId);
  if (!receipt) throw new Error('Company receipt from distributor not found');
  if (receipt.ledgerPosting?.postingState === 'posted') return receipt;

  receipt.status = 'posted';
  receipt.ledgerPosting = {
    postingState: 'posted',
    postingKey: `company_receipt_from_distributor:${receipt._id}`,
    postedAt: new Date(),
  };
  receipt.statusHistory.push({
    status: 'posted',
    changedBy: asText(req.user.uid),
    note: 'Company receipt posted',
  });
  await receipt.save();

  for (const allocation of receipt.allocations || []) {
    const invoice = await CompanyInvoiceToDistributorModel.findById(allocation.invoiceId);
    if (!invoice) continue;
    invoice.allocatedReceiptTotal = Number(invoice.allocatedReceiptTotal || 0) + Number(allocation.allocatedAmount || 0);
    await invoice.save();
    const recalculated = await recalcInvoiceBalance(
      CompanyInvoiceToDistributorModel,
      invoice._id,
      'allocatedReceiptTotal'
    );
    await syncOrderFinancialStatus(
      CompanySalesOrderModel,
      invoice.companySalesOrderId,
      recalculated?.paymentStatus || invoice.paymentStatus || 'partial',
      asText(req.user.uid)
    );
  }

  return receipt;
}

module.exports = { postCompanyReceiptFromDistributor };
