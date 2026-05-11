const SupplierPayment = require("../../models/SupplierPayment");
const SupplierInvoice = require("../../models/SupplierInvoice");
const { getScopedModels, asText } = require("../../../../platform/tenancy/services/scopedModels");
const { recalcInvoiceBalance } = require("../../services/balances/recalcInvoiceBalance");

async function postSupplierPayment(req, paymentId) {
  const { SupplierPaymentModel, SupplierInvoiceModel } = await getScopedModels(req, {
    SupplierPaymentModel: SupplierPayment,
    SupplierInvoiceModel: SupplierInvoice,
  });

  const payment = await SupplierPaymentModel.findById(paymentId);
  if (!payment) throw new Error("Supplier payment not found");
  if (payment.ledgerPosting?.postingState === "posted") return payment;

  payment.status = "posted";
  payment.ledgerPosting = { postingState: "posted", postingKey: `supplier_payment:${payment._id}`, postedAt: new Date() };
  payment.statusHistory.push({ status: "posted", changedBy: asText(req.user.uid), note: "Supplier payment posted" });
  await payment.save();

  for (const allocation of payment.allocations || []) {
    const invoice = await SupplierInvoiceModel.findById(allocation.invoiceId);
    if (!invoice) continue;
    invoice.allocatedPaymentTotal = Number(invoice.allocatedPaymentTotal || 0) + Number(allocation.allocatedAmount || 0);
    await invoice.save();
    await recalcInvoiceBalance(SupplierInvoiceModel, invoice._id, "allocatedPaymentTotal");
  }

  return payment;
}

module.exports = { postSupplierPayment };
