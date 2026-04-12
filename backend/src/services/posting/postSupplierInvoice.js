const SupplierInvoice = require("../../models/SupplierInvoice");
const { getScopedModels, asText } = require("../scopedModels");

async function postSupplierInvoice(req, invoiceId) {
  const { SupplierInvoiceModel } = await getScopedModels(req, {
    SupplierInvoiceModel: SupplierInvoice,
  });

  const invoice = await SupplierInvoiceModel.findById(invoiceId);
  if (!invoice) throw new Error("Supplier invoice not found");
  if (invoice.ledgerPosting?.postingState === "posted") return invoice;

  invoice.status = "posted";
  invoice.invoiceTotal = Number(invoice.totals?.grandTotal || invoice.invoiceTotal || 0);
  invoice.balanceAmount = invoice.invoiceTotal - Number(invoice.allocatedPaymentTotal || 0);
  invoice.ledgerPosting = {
    postingState: "posted",
    postingKey: `supplier_invoice:${invoice._id}`,
    postedAt: new Date(),
  };
  invoice.statusHistory.push({
    status: "posted",
    changedBy: asText(req.user.uid),
    note: "Supplier payable posted",
  });

  await invoice.save();
  return invoice;
}

module.exports = { postSupplierInvoice };