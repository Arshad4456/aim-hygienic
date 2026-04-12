async function recalcInvoiceBalance(InvoiceModel, invoiceId) {
  const invoice = await InvoiceModel.findById(invoiceId);
  if (!invoice) return null;

  const invoiceTotal = Number(invoice.invoiceTotal || invoice.totals?.grandTotal || 0);
  const allocatedTotal = Number(invoice.allocatedReceiptTotal || invoice.allocatedPaymentTotal || 0);

  let paymentStatus = "unpaid";
  if (allocatedTotal > 0 && allocatedTotal < invoiceTotal) paymentStatus = "partial";
  if (allocatedTotal === invoiceTotal && invoiceTotal > 0) paymentStatus = "paid";
  if (allocatedTotal > invoiceTotal) paymentStatus = "overpaid";

  invoice.balanceAmount = Math.max(invoiceTotal - allocatedTotal, 0);
  invoice.paymentStatus = paymentStatus;
  await invoice.save();

  return invoice;
}

module.exports = { recalcInvoiceBalance };