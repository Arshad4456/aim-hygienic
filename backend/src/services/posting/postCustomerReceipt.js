const CustomerReceipt = require("../../models/CustomerReceipt");
const CustomerInvoice = require("../../models/CustomerInvoice");
const { getScopedModels, asText } = require("../scopedModels");
const { recalcInvoiceBalance } = require("../balances/recalcInvoiceBalance");

async function postCustomerReceipt(req, receiptId) {
  const { CustomerReceiptModel, CustomerInvoiceModel } = await getScopedModels(req, {
    CustomerReceiptModel: CustomerReceipt,
    CustomerInvoiceModel: CustomerInvoice,
  });

  const receipt = await CustomerReceiptModel.findById(receiptId);
  if (!receipt) throw new Error("Customer receipt not found");
  if (receipt.ledgerPosting?.postingState === "posted") return receipt;

  receipt.status = "posted";
  receipt.ledgerPosting = { postingState: "posted", postingKey: `customer_receipt:${receipt._id}`, postedAt: new Date() };
  receipt.statusHistory.push({ status: "posted", changedBy: asText(req.user.uid), note: "Receipt posted" });
  await receipt.save();

  for (const allocation of receipt.allocations || []) {
    const invoice = await CustomerInvoiceModel.findById(allocation.invoiceId);
    if (!invoice) continue;
    invoice.allocatedReceiptTotal = Number(invoice.allocatedReceiptTotal || 0) + Number(allocation.allocatedAmount || 0);
    await invoice.save();
    await recalcInvoiceBalance(CustomerInvoiceModel, invoice._id, "allocatedReceiptTotal");
  }

  return receipt;
}

module.exports = { postCustomerReceipt };
