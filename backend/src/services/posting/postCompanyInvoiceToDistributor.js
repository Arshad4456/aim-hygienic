const CompanyInvoiceToDistributor = require('../../models/CompanyInvoiceToDistributor');
const CompanySalesOrder = require('../../models/CompanySalesOrder');
const { getScopedModels, asText } = require('../scopedModels');
const { recalcInvoiceBalance } = require('../balances/recalcInvoiceBalance');

async function syncOrderFinancialStatus(CompanySalesOrderModel, orderId, paymentStatus) {
  if (!orderId) return;
  const order = await CompanySalesOrderModel.findById(orderId);
  if (!order) return;

  order.financialStatus = paymentStatus === 'unpaid' ? 'unpaid' : paymentStatus;
  if (order.status === 'received' || order.status === 'dispatched' || order.status === 'approved' || order.status === 'reserved' || order.status === 'ready_to_dispatch') {
    order.status = 'invoiced';
  }
  if (Array.isArray(order.statusHistory)) {
    order.statusHistory.push({
      status: 'invoiced',
      changedBy: '',
      note: 'Linked company invoice posted',
    });
  }
  await order.save();
}

async function postCompanyInvoiceToDistributor(req, invoiceId) {
  const { CompanyInvoiceToDistributorModel, CompanySalesOrderModel } = await getScopedModels(req, {
    CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
    CompanySalesOrderModel: CompanySalesOrder,
  });

  const invoice = await CompanyInvoiceToDistributorModel.findById(invoiceId);
  if (!invoice) throw new Error('Company invoice to distributor not found');
  if (invoice.ledgerPosting?.postingState === 'posted') return invoice;

  invoice.status = 'posted';
  invoice.invoiceTotal = Number(invoice.invoiceTotal || invoice.totals?.grandTotal || 0);
  invoice.balanceAmount = invoice.invoiceTotal - Number(invoice.allocatedReceiptTotal || 0);
  invoice.ledgerPosting = {
    postingState: 'posted',
    postingKey: `company_invoice_to_distributor:${invoice._id}`,
    postedAt: new Date(),
  };
  invoice.statusHistory.push({
    status: 'posted',
    changedBy: asText(req.user.uid),
    note: 'Company receivable posted',
  });
  await invoice.save();

  const recalculated = await recalcInvoiceBalance(
    CompanyInvoiceToDistributorModel,
    invoice._id,
    'allocatedReceiptTotal'
  );

  await syncOrderFinancialStatus(
    CompanySalesOrderModel,
    invoice.companySalesOrderId,
    recalculated?.paymentStatus || invoice.paymentStatus || 'unpaid'
  );

  return recalculated || invoice;
}

module.exports = { postCompanyInvoiceToDistributor };
