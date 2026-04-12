const CustomerInvoice = require("../../models/CustomerInvoice");
const { getScopedModels, asText } = require("../scopedModels");

async function postCustomerInvoice(req, invoiceId) {
  const { CustomerInvoiceModel } = await getScopedModels(req, {
    CustomerInvoiceModel: CustomerInvoice,
  });

  const invoice = await CustomerInvoiceModel.findById(invoiceId);
  if (!invoice) throw new Error("Customer invoice not found");
  if (invoice.ledgerPosting?.postingState === "posted") return invoice;

  invoice.status = "posted";
  invoice.invoiceTotal = Number(invoice.totals?.grandTotal || invoice.invoiceTotal || 0);
  invoice.balanceAmount = invoice.invoiceTotal - Number(invoice.allocatedReceiptTotal || 0);
  invoice.ledgerPosting = {
    postingState: "posted",
    postingKey: `customer_invoice:${invoice._id}`,
    postedAt: new Date(),
  };
  invoice.statusHistory.push({
    status: "posted",
    changedBy: asText(req.user.uid),
    note: "Customer receivable posted",
  });

  await invoice.save();
  return invoice;
}

module.exports = { postCustomerInvoice };