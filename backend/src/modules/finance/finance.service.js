const CompanyInvoiceToDistributor = require("../../models/CompanyInvoiceToDistributor");
const CompanyReceiptFromDistributor = require("../../models/CompanyReceiptFromDistributor");
const CustomerInvoice = require("../../models/CustomerInvoice");
const CustomerReceipt = require("../../models/CustomerReceipt");
const SupplierInvoice = require("../../models/SupplierInvoice");
const SupplierPayment = require("../../models/SupplierPayment");
const Account = require("../../models/Account");
const AccountTransaction = require("../../models/AccountTransaction");
const CompanySalesOrder = require("../../models/CompanySalesOrder");
const PurchaseOrder = require("../../models/PurchaseOrder");
const { asText, getScopedModels } = require("../../services/scopedModels");

function companyIdFrom(req) { return asText(req.query.companyId || req.body?.companyId || req.user?.companyId); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function makeDocNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Date.now().toString().slice(-6)}`; }
function toMoney(value) { return Math.round(Number(value || 0) * 100) / 100; }
function userObjectId(req) { return req.user?._id && /^[a-f\d]{24}$/i.test(String(req.user._id)) ? req.user._id : undefined; }

async function scoped(req) {
  return getScopedModels(req, {
    CompanyInvoiceModel: CompanyInvoiceToDistributor,
    CompanyReceiptModel: CompanyReceiptFromDistributor,
    CustomerInvoiceModel: CustomerInvoice,
    CustomerReceiptModel: CustomerReceipt,
    SupplierInvoiceModel: SupplierInvoice,
    SupplierPaymentModel: SupplierPayment,
    AccountModel: Account,
    AccountTransactionModel: AccountTransaction,
    CompanySalesOrderModel: CompanySalesOrder,
    PurchaseOrderModel: PurchaseOrder,
  });
}

function distributorFilter(req) {
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId);
  if (req.query.paymentStatus && req.query.paymentStatus !== "all") filter.paymentStatus = asText(req.query.paymentStatus);
  return filter;
}
function supplierFilter(req) {
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.paymentStatus && req.query.paymentStatus !== "all") filter.paymentStatus = asText(req.query.paymentStatus);
  if (req.query.supplierId) filter["supplier.partyId"] = asText(req.query.supplierId);
  return filter;
}
function customerFilter(req) {
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId);
  if (req.query.paymentStatus && req.query.paymentStatus !== "all") filter.paymentStatus = asText(req.query.paymentStatus);
  return filter;
}

async function listDistributorInvoices(req) {
  const { CompanyInvoiceModel } = await scoped(req);
  return CompanyInvoiceModel.find(distributorFilter(req)).sort({ createdAt: -1 }).limit(1000).lean();
}
async function listDistributorReceipts(req) {
  const { CompanyReceiptModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId);
  return CompanyReceiptModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
}
async function listCustomerInvoices(req) {
  const { CustomerInvoiceModel } = await scoped(req);
  return CustomerInvoiceModel.find(customerFilter(req)).sort({ createdAt: -1 }).limit(1000).lean();
}
async function listCustomerReceipts(req) {
  const { CustomerReceiptModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId);
  return CustomerReceiptModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
}
async function listSupplierInvoices(req) {
  const { SupplierInvoiceModel } = await scoped(req);
  return SupplierInvoiceModel.find(supplierFilter(req)).sort({ createdAt: -1 }).limit(1000).lean();
}
async function listSupplierPayments(req) {
  const { SupplierPaymentModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.supplierId) filter["supplier.partyId"] = asText(req.query.supplierId);
  return SupplierPaymentModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
}
async function listAccounts(req) {
  const { AccountModel } = await scoped(req);
  return AccountModel.find({ status: { $ne: "inactive" } }).sort({ accountName: 1 }).limit(500).lean().catch(() => []);
}
async function listTransactions(req) {
  const { AccountTransactionModel } = await scoped(req);
  return AccountTransactionModel.find({}).sort({ transactionDate: -1, createdAt: -1 }).limit(200).lean().catch(() => []);
}

async function postAccountTransaction(req, { type, amount, referenceType, referenceId, description, accountId }) {
  const { AccountModel, AccountTransactionModel } = await scoped(req);
  if (!accountId) return null;
  const account = await AccountModel.findOne({ _id: accountId }).catch(() => null);
  if (!account) return null;
  const createdBy = userObjectId(req) || account.createdBy;
  if (!createdBy) return null;
  const tx = await AccountTransactionModel.create({ accountId: account._id, type, amount, transactionDate: new Date(), referenceType, referenceId: asText(referenceId), description, isSystemGenerated: true, createdBy });
  account.currentBalance = toMoney(Number(account.currentBalance || 0) + (type === "cash_in" ? amount : -amount));
  await account.save();
  return tx;
}

async function receiveDistributorInvoice(req) {
  const { CompanyInvoiceModel, CompanyReceiptModel, CompanySalesOrderModel } = await scoped(req);
  const invoice = await CompanyInvoiceModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!invoice) throw new Error("Distributor invoice not found.");
  if (invoice.status !== "posted") throw new Error("Only posted distributor invoices can be received.");
  const balance = Number(invoice.balanceAmount || 0);
  if (balance <= 0) throw new Error("Distributor invoice is already paid.");
  const body = req.body || {};
  const amount = Math.min(balance, toMoney(body.amount || balance));
  if (amount <= 0) throw new Error("Receipt amount must be greater than zero.");
  const receipt = await CompanyReceiptModel.create({
    companyId: invoice.companyId,
    documentNo: makeDocNo("DREC"),
    ownerType: "company",
    ownerId: invoice.companyId,
    distributorId: invoice.distributorId,
    payer: invoice.distributor,
    paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
    amount,
    paymentMethod: asText(body.paymentMethod || "cash"),
    toAccountId: asText(body.toAccountId),
    status: "posted",
    allocations: [{ invoiceId: invoice._id, invoiceNo: invoice.documentNo, allocatedAmount: amount }],
    referenceNo: asText(body.referenceNo),
    ledgerPosting: { postingState: "posted", postingKey: `DREC:${invoice._id}:${Date.now()}`, postedAt: new Date() },
    statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: `Distributor receipt posted against ${invoice.documentNo}` }],
    createdByUserId: uidFrom(req),
    notes: asText(body.notes),
  });
  invoice.allocatedReceiptTotal = toMoney(Number(invoice.allocatedReceiptTotal || 0) + amount);
  invoice.balanceAmount = toMoney(Math.max(0, Number(invoice.invoiceTotal || 0) - Number(invoice.allocatedReceiptTotal || 0)));
  invoice.paymentStatus = invoice.balanceAmount <= 0 ? "paid" : "partial";
  invoice.statusHistory.push({ status: invoice.paymentStatus, changedBy: uidFrom(req), note: `Distributor receipt ${receipt.documentNo} posted` });
  await invoice.save();
  await postAccountTransaction(req, { type: "cash_in", amount, referenceType: "primary_payment", referenceId: receipt._id, description: `Distributor receipt ${receipt.documentNo}`, accountId: body.toAccountId });
  if (invoice.companySalesOrderId) {
    const order = await CompanySalesOrderModel.findOne({ _id: invoice.companySalesOrderId, companyId: invoice.companyId }).catch(() => null);
    if (order) { order.financialStatus = invoice.paymentStatus; await order.save(); }
  }
  return { invoice, receipt };
}

async function paySupplierInvoice(req) {
  const { SupplierInvoiceModel, SupplierPaymentModel, PurchaseOrderModel } = await scoped(req);
  const invoice = await SupplierInvoiceModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!invoice) throw new Error("Supplier invoice not found.");
  if (invoice.status !== "posted") throw new Error("Only posted supplier invoices can be paid.");
  const balance = Number(invoice.balanceAmount || 0);
  if (balance <= 0) throw new Error("Supplier invoice is already paid.");
  const body = req.body || {};
  const amount = Math.min(balance, toMoney(body.amount || balance));
  if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const payment = await SupplierPaymentModel.create({
    companyId: invoice.companyId,
    documentNo: makeDocNo("SPAY"),
    ownerType: "company",
    ownerId: invoice.companyId,
    supplier: invoice.supplier,
    paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
    amount,
    paymentMethod: asText(body.paymentMethod || "cash"),
    fromAccountId: asText(body.fromAccountId),
    status: "posted",
    allocations: [{ invoiceId: invoice._id, invoiceNo: invoice.documentNo, allocatedAmount: amount }],
    referenceNo: asText(body.referenceNo),
    ledgerPosting: { postingState: "posted", postingKey: `SPAY:${invoice._id}:${Date.now()}`, postedAt: new Date() },
    statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: `Supplier payment posted against ${invoice.documentNo}` }],
    createdByUserId: uidFrom(req),
    notes: asText(body.notes),
  });
  invoice.allocatedPaymentTotal = toMoney(Number(invoice.allocatedPaymentTotal || 0) + amount);
  invoice.balanceAmount = toMoney(Math.max(0, Number(invoice.invoiceTotal || 0) - Number(invoice.allocatedPaymentTotal || 0)));
  invoice.paymentStatus = invoice.balanceAmount <= 0 ? "paid" : "partial";
  invoice.statusHistory.push({ status: invoice.paymentStatus, changedBy: uidFrom(req), note: `Supplier payment ${payment.documentNo} posted` });
  await invoice.save();
  await postAccountTransaction(req, { type: "cash_out", amount, referenceType: "supplier_payment", referenceId: payment._id, description: `Supplier payment ${payment.documentNo}`, accountId: body.fromAccountId });
  if (invoice.purchaseOrderId) {
    const po = await PurchaseOrderModel.findOne({ _id: invoice.purchaseOrderId, companyId: invoice.companyId }).catch(() => null);
    if (po) { po.paymentStatus = invoice.paymentStatus; await po.save().catch(() => null); }
  }
  return { invoice, payment };
}

function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0); }
async function overview(req) {
  const [distributorInvoices, distributorReceipts, customerInvoices, customerReceipts, supplierInvoices, supplierPayments, accounts] = await Promise.all([
    listDistributorInvoices(req), listDistributorReceipts(req), listCustomerInvoices(req), listCustomerReceipts(req), listSupplierInvoices(req), listSupplierPayments(req), listAccounts(req),
  ]);
  return {
    distributorInvoices,
    distributorReceipts,
    customerInvoices,
    customerReceipts,
    supplierInvoices,
    supplierPayments,
    accounts,
    kpis: {
      primaryReceivable: toMoney(sum(distributorInvoices, "balanceAmount")),
      primaryInvoiceTotal: toMoney(sum(distributorInvoices, "invoiceTotal")),
      distributorReceiptTotal: toMoney(sum(distributorReceipts.filter((r) => r.status === "posted"), "amount")),
      customerReceivable: toMoney(sum(customerInvoices, "balanceAmount")),
      supplierPayable: toMoney(sum(supplierInvoices, "balanceAmount")),
      supplierPaymentTotal: toMoney(sum(supplierPayments.filter((p) => p.status === "posted"), "amount")),
      accountBalance: toMoney(accounts.reduce((total, account) => total + Number(account.currentBalance || account.openingBalance || 0), 0)),
      openDistributorInvoices: distributorInvoices.filter((i) => Number(i.balanceAmount || 0) > 0).length,
      openSupplierInvoices: supplierInvoices.filter((i) => Number(i.balanceAmount || 0) > 0).length,
    },
  };
}

module.exports = { overview, listDistributorInvoices, listDistributorReceipts, receiveDistributorInvoice, listCustomerInvoices, listCustomerReceipts, listSupplierInvoices, listSupplierPayments, paySupplierInvoice, listAccounts, listTransactions };
