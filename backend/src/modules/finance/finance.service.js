const CompanyInvoiceToDistributor = require("../../models/CompanyInvoiceToDistributor");
const CompanyReceiptFromDistributor = require("../../models/CompanyReceiptFromDistributor");
const CustomerInvoice = require("../../models/CustomerInvoice");
const CustomerReceipt = require("../../models/CustomerReceipt");
const SupplierInvoice = require("../../models/SupplierInvoice");
const SupplierPayment = require("../../models/SupplierPayment");
const Account = require("../../models/Account");
const AccountTransaction = require("../../models/AccountTransaction");
const Expense = require("../../models/Expense");
const Loan = require("../../models/Loan");
const LoanPayment = require("../../models/LoanPayment");
const CompanySalesOrder = require("../../models/CompanySalesOrder");
const PurchaseOrder = require("../../models/PurchaseOrder");
const SecondaryOrder = require("../../models/SecondaryOrder");
const ChartAccount = require("../../models/ChartAccount");
const JournalEntry = require("../../models/JournalEntry");
const { asText, getScopedModels, scopedCompanyId } = require("../../services/scopedModels");

function companyIdFrom(req) { return scopedCompanyId(req); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function makeDocNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`; }
function toMoney(value) { return Math.round(Number(value || 0) * 100) / 100; }
function validObjectId(value) { return /^[a-f\d]{24}$/i.test(String(value || "")); }
function userObjectId(req) { const id = req.user?._id || req.user?.uid; return validObjectId(id) ? id : undefined; }
function dateOrNow(value) { return value ? new Date(value) : new Date(); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function daysBetween(a, b = new Date()) { return Math.max(0, Math.floor((b - a) / 86400000)); }
function bucketByAge(dateValue, amount) {
  const d = dateValue ? new Date(dateValue) : new Date();
  const age = daysBetween(d);
  if (age <= 30) return { current: amount };
  if (age <= 60) return { d31_60: amount };
  if (age <= 90) return { d61_90: amount };
  return { over90: amount };
}
function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0); }
function statusTotal(rows, status) { return sum(rows.filter((row) => row.status === status), "amount"); }
function pickDateRange(req) {
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.$gte = req.query.from ? new Date(req.query.from) : new Date("1970-01-01");
    filter.$lte = req.query.to ? new Date(req.query.to) : new Date();
  }
  return Object.keys(filter).length ? filter : null;
}

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
    ExpenseModel: Expense,
    LoanModel: Loan,
    LoanPaymentModel: LoanPayment,
    CompanySalesOrderModel: CompanySalesOrder,
    PurchaseOrderModel: PurchaseOrder,
    SecondaryOrderModel: SecondaryOrder,
    ChartAccountModel: ChartAccount,
    JournalEntryModel: JournalEntry,
  });
}

const DEFAULT_CHART_ACCOUNTS = [
  ["1000", "Cash & Bank", "asset", "debit"],
  ["1100", "Accounts Receivable", "asset", "debit"],
  ["1200", "Inventory Asset", "asset", "debit"],
  ["2000", "Accounts Payable", "liability", "credit"],
  ["3000", "Owner Equity", "equity", "credit"],
  ["4000", "Sales Revenue", "income", "credit"],
  ["4100", "Service Revenue", "income", "credit"],
  ["5000", "Cost of Goods Sold", "expense", "debit"],
  ["5100", "Operating Expenses", "expense", "debit"],
  ["5200", "Salaries & Wages", "expense", "debit"],
  ["5300", "Delivery & Logistics Expense", "expense", "debit"],
  ["5400", "Tax Expense", "expense", "debit"],
];

async function ensureDefaultChartAccounts(req) {
  const { ChartAccountModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (!companyId) return [];
  const count = await ChartAccountModel.countDocuments({ companyId }).catch(() => 0);
  if (count) return ChartAccountModel.find({ companyId }).sort({ code: 1 }).lean();
  const createdBy = uidFrom(req);
  await ChartAccountModel.insertMany(DEFAULT_CHART_ACCOUNTS.map(([code, name, type, normalBalance]) => ({
    companyId, code, name, type, normalBalance, status: "active", isSystem: true, openingBalance: 0, currentBalance: 0, createdBy,
  })), { ordered: false }).catch(() => null);
  return ChartAccountModel.find({ companyId }).sort({ code: 1 }).lean();
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

async function listDistributorInvoices(req) { const { CompanyInvoiceModel } = await scoped(req); return CompanyInvoiceModel.find(distributorFilter(req)).sort({ createdAt: -1 }).limit(1000).lean(); }
async function listDistributorReceipts(req) { const { CompanyReceiptModel } = await scoped(req); const filter = { companyId: companyIdFrom(req) }; if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId); return CompanyReceiptModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean(); }
async function listCustomerInvoices(req) { const { CustomerInvoiceModel } = await scoped(req); return CustomerInvoiceModel.find(customerFilter(req)).sort({ createdAt: -1 }).limit(1000).lean(); }
async function listCustomerReceipts(req) { const { CustomerReceiptModel } = await scoped(req); const filter = { companyId: companyIdFrom(req) }; if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId); return CustomerReceiptModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean(); }
async function listSupplierInvoices(req) { const { SupplierInvoiceModel } = await scoped(req); return SupplierInvoiceModel.find(supplierFilter(req)).sort({ createdAt: -1 }).limit(1000).lean(); }
async function listSupplierPayments(req) { const { SupplierPaymentModel } = await scoped(req); const filter = { companyId: companyIdFrom(req) }; if (req.query.supplierId) filter["supplier.partyId"] = asText(req.query.supplierId); return SupplierPaymentModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean(); }
async function listAccounts(req) { const { AccountModel } = await scoped(req); return AccountModel.find({ status: { $ne: "inactive" } }).sort({ accountName: 1 }).limit(500).lean().catch(() => []); }
async function listTransactions(req) { const { AccountTransactionModel } = await scoped(req); const filter = {}; const range = pickDateRange(req); if (range) filter.transactionDate = range; return AccountTransactionModel.find(filter).populate("accountId", "accountName accountType").sort({ transactionDate: -1, createdAt: -1 }).limit(500).lean().catch(() => []); }
async function listExpenses(req) { const { ExpenseModel } = await scoped(req); const filter = {}; if (req.query.status) filter.status = req.query.status; if (req.query.section) filter.section = req.query.section; const range = pickDateRange(req); if (range) filter.expenseDate = range; return ExpenseModel.find(filter).sort({ expenseDate: -1, createdAt: -1 }).limit(500).lean().catch(() => []); }
async function listLoans(req) { const { LoanModel } = await scoped(req); const filter = {}; if (req.query.status) filter.status = req.query.status; if (req.query.loanType) filter.loanType = req.query.loanType; return LoanModel.find(filter).populate("sourceAccountId", "accountName accountType").sort({ createdAt: -1 }).limit(500).lean().catch(() => []); }

async function listChartAccounts(req) {
  await ensureDefaultChartAccounts(req);
  const { ChartAccountModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  if (req.query.type && req.query.type !== "all") filter.type = asText(req.query.type);
  return ChartAccountModel.find(filter).sort({ code: 1 }).limit(1000).lean();
}

async function createChartAccount(req) {
  const { ChartAccountModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  const code = asText(body.code);
  const name = asText(body.name);
  const type = asText(body.type);
  if (!companyId) throw new Error("Company is required.");
  if (!code || !name || !type) throw new Error("Account code, name, and type are required.");
  const normalBalance = ["asset", "expense"].includes(type) ? "debit" : "credit";
  return ChartAccountModel.create({
    companyId, code, name, type, normalBalance: asText(body.normalBalance || normalBalance), parentCode: asText(body.parentCode),
    openingBalance: toMoney(body.openingBalance), currentBalance: toMoney(body.openingBalance), status: asText(body.status || "active"),
    notes: asText(body.notes), createdBy: uidFrom(req), updatedBy: uidFrom(req), isSystem: false,
  });
}

async function updateChartAccount(req) {
  const { ChartAccountModel } = await scoped(req);
  const body = req.body || {};
  const doc = await ChartAccountModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!doc) throw new Error("Chart account not found.");
  ["code", "name", "type", "parentCode", "normalBalance", "status", "notes"].forEach((key) => {
    if (body[key] !== undefined) doc[key] = asText(body[key]);
  });
  if (body.openingBalance !== undefined) doc.openingBalance = toMoney(body.openingBalance);
  doc.updatedBy = uidFrom(req);
  await doc.save();
  return doc;
}

async function deleteChartAccount(req) {
  const { ChartAccountModel, JournalEntryModel } = await scoped(req);
  const doc = await ChartAccountModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!doc) throw new Error("Chart account not found.");
  const used = await JournalEntryModel.countDocuments({ companyId: companyIdFrom(req), "lines.accountCode": doc.code });
  if (used || doc.isSystem) {
    doc.status = "inactive";
    doc.updatedBy = uidFrom(req);
    await doc.save();
    return { inactive: true, account: doc };
  }
  await ChartAccountModel.deleteOne({ _id: doc._id });
  return { deleted: true };
}

async function normalizeJournalLines(req, rawLines = []) {
  const { ChartAccountModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const accounts = await ChartAccountModel.find({ companyId, status: "active" }).lean();
  const byCode = new Map(accounts.map((acc) => [acc.code, acc]));
  const byId = new Map(accounts.map((acc) => [String(acc._id), acc]));
  return rawLines.map((line) => {
    const account = byId.get(asText(line.accountId)) || byCode.get(asText(line.accountCode));
    if (!account) throw new Error(`Invalid chart account ${line.accountCode || line.accountId || ""}`.trim());
    return {
      accountId: account._id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      debit: toMoney(line.debit),
      credit: toMoney(line.credit),
      narration: asText(line.narration),
    };
  }).filter((line) => line.debit > 0 || line.credit > 0);
}

function validateBalancedLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) throw new Error("A journal entry needs at least two lines.");
  const totalDebit = toMoney(sum(lines, "debit"));
  const totalCredit = toMoney(sum(lines, "credit"));
  if (totalDebit <= 0 || totalCredit <= 0 || Math.abs(totalDebit - totalCredit) > 0.009) throw new Error("Debit and credit totals must be equal.");
  return { totalDebit, totalCredit };
}

async function listJournalEntries(req) {
  const { JournalEntryModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  const range = pickDateRange(req); if (range) filter.entryDate = range;
  return JournalEntryModel.find(filter).sort({ entryDate: -1, createdAt: -1 }).limit(1000).lean();
}

async function createJournalEntry(req) {
  await ensureDefaultChartAccounts(req);
  const { JournalEntryModel } = await scoped(req);
  const body = req.body || {};
  const lines = await normalizeJournalLines(req, body.lines || []);
  const totals = validateBalancedLines(lines);
  const shouldPost = asText(body.status || "draft") === "posted";
  const doc = await JournalEntryModel.create({
    companyId: companyIdFrom(req), documentNo: asText(body.documentNo) || makeDocNo("JV"), entryDate: dateOrNow(body.entryDate),
    sourceType: asText(body.sourceType || "manual"), sourceId: asText(body.sourceId), memo: asText(body.memo || body.description),
    status: "draft", totalDebit: totals.totalDebit, totalCredit: totals.totalCredit, lines,
    attachmentUrl: asText(body.attachmentUrl), createdBy: uidFrom(req),
  });
  if (shouldPost) return postJournalEntry({ ...req, params: { id: doc._id } });
  return doc;
}

async function postJournalEntry(req) {
  const { JournalEntryModel } = await scoped(req);
  const doc = await JournalEntryModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!doc) throw new Error("Journal entry not found.");
  if (doc.status === "posted") return doc;
  validateBalancedLines(doc.lines || []);
  doc.status = "posted";
  doc.postedBy = uidFrom(req);
  doc.postedAt = new Date();
  await doc.save();
  return doc;
}

async function reverseJournalEntry(req) {
  const { JournalEntryModel } = await scoped(req);
  const doc = await JournalEntryModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!doc) throw new Error("Journal entry not found.");
  if (doc.status !== "posted") throw new Error("Only posted entries can be reversed.");
  doc.status = "reversed";
  doc.reversedBy = uidFrom(req);
  doc.reversedAt = new Date();
  await doc.save();
  return doc;
}

async function createAccount(req) {
  const { AccountModel, AccountTransactionModel } = await scoped(req);
  const body = req.body || {};
  const accountName = asText(body.accountName || body.name);
  if (!accountName) throw new Error("Account name is required");
  const accountId = asText(body.accountId) || `ACC-${Date.now().toString().slice(-8)}`;
  const openingBalance = toMoney(body.openingBalance || 0);
  const createdBy = userObjectId(req);
  const account = await AccountModel.create({ accountId, accountName, accountType: asText(body.accountType || "cash"), bankName: asText(body.bankName), accountTitle: asText(body.accountTitle || accountName), accountNumber: asText(body.accountNumber), openingBalance, currentBalance: openingBalance, openingDate: body.openingDate ? new Date(body.openingDate) : new Date(), currency: asText(body.currency || "PKR"), status: "active", notes: asText(body.notes), createdBy });
  if (openingBalance > 0 && createdBy) await AccountTransactionModel.create({ accountId: account._id, type: "cash_in", amount: openingBalance, transactionDate: new Date(), referenceType: "opening_balance", referenceId: String(account._id), description: `Opening balance for ${accountName}`, isSystemGenerated: true, createdBy });
  return account;
}

async function createManualTransaction(req) {
  const { AccountModel, AccountTransactionModel } = await scoped(req);
  const body = req.body || {};
  const account = await AccountModel.findById(body.accountId);
  if (!account) throw new Error("Cash/bank account not found.");
  const amount = toMoney(body.amount);
  if (amount <= 0) throw new Error("Transaction amount must be greater than zero.");
  const type = asText(body.type) === "cash_out" ? "cash_out" : "cash_in";
  const createdBy = userObjectId(req) || account.createdBy;
  if (!createdBy) throw new Error("Transaction user could not be resolved.");
  const tx = await AccountTransactionModel.create({ accountId: account._id, type, amount, transactionDate: dateOrNow(body.transactionDate), referenceType: "manual_entry", referenceId: asText(body.referenceId || makeDocNo("TX")), description: asText(body.description || "Manual cashbook entry"), attachmentUrl: asText(body.attachmentUrl), isSystemGenerated: false, createdBy });
  account.currentBalance = toMoney(Number(account.currentBalance || 0) + (type === "cash_in" ? amount : -amount));
  await account.save();
  return tx;
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
  const body = req.body || {}; const amount = Math.min(balance, toMoney(body.amount || balance));
  if (amount <= 0) throw new Error("Receipt amount must be greater than zero.");
  const receipt = await CompanyReceiptModel.create({ companyId: invoice.companyId, documentNo: makeDocNo("DREC"), ownerType: "company", ownerId: invoice.companyId, distributorId: invoice.distributorId, payer: invoice.distributor, paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(), amount, paymentMethod: asText(body.paymentMethod || "cash"), toAccountId: asText(body.toAccountId), status: "posted", allocations: [{ invoiceId: invoice._id, invoiceNo: invoice.documentNo, allocatedAmount: amount }], referenceNo: asText(body.referenceNo), ledgerPosting: { postingState: "posted", postingKey: `DREC:${invoice._id}:${Date.now()}`, postedAt: new Date() }, statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: `Distributor receipt posted against ${invoice.documentNo}` }], createdByUserId: uidFrom(req), notes: asText(body.notes) });
  invoice.allocatedReceiptTotal = toMoney(Number(invoice.allocatedReceiptTotal || 0) + amount);
  invoice.balanceAmount = toMoney(Math.max(0, Number(invoice.invoiceTotal || 0) - Number(invoice.allocatedReceiptTotal || 0)));
  invoice.paymentStatus = invoice.balanceAmount <= 0 ? "paid" : "partial";
  invoice.statusHistory.push({ status: invoice.paymentStatus, changedBy: uidFrom(req), note: `Distributor receipt ${receipt.documentNo} posted` });
  await invoice.save();
  await postAccountTransaction(req, { type: "cash_in", amount, referenceType: "primary_payment", referenceId: receipt._id, description: `Distributor receipt ${receipt.documentNo}`, accountId: body.toAccountId });
  if (invoice.companySalesOrderId) { const order = await CompanySalesOrderModel.findOne({ _id: invoice.companySalesOrderId, companyId: invoice.companyId }).catch(() => null); if (order) { order.paymentStatus = invoice.paymentStatus; await order.save().catch(() => null); } }
  return { invoice, receipt };
}

async function receiveCustomerInvoice(req) {
  const { CustomerInvoiceModel, CustomerReceiptModel, SecondaryOrderModel } = await scoped(req);
  const invoice = await CustomerInvoiceModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!invoice) throw new Error("Customer invoice not found.");
  if (invoice.status !== "posted") throw new Error("Only posted customer invoices can be received.");
  const balance = Number(invoice.balanceAmount || 0);
  if (balance <= 0) throw new Error("Customer invoice is already paid.");
  const body = req.body || {}; const amount = Math.min(balance, toMoney(body.amount || balance));
  if (amount <= 0) throw new Error("Receipt amount must be greater than zero.");
  const receipt = await CustomerReceiptModel.create({ companyId: invoice.companyId, documentNo: makeDocNo("CREC"), ownerType: "distributor", ownerId: invoice.ownerId, distributorId: invoice.distributorId, customer: invoice.customer, paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(), amount, paymentMethod: asText(body.paymentMethod || "cash"), toAccountId: asText(body.toAccountId), status: "posted", allocations: [{ invoiceId: invoice._id, invoiceNo: invoice.documentNo, allocatedAmount: amount }], referenceNo: asText(body.referenceNo), ledgerPosting: { postingState: "posted", postingKey: `CREC:${invoice._id}:${Date.now()}`, postedAt: new Date() }, statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: `Customer receipt posted against ${invoice.documentNo}` }], createdByUserId: uidFrom(req), notes: asText(body.notes) });
  invoice.allocatedReceiptTotal = toMoney(Number(invoice.allocatedReceiptTotal || 0) + amount);
  invoice.balanceAmount = toMoney(Math.max(0, Number(invoice.invoiceTotal || 0) - Number(invoice.allocatedReceiptTotal || 0)));
  invoice.paymentStatus = invoice.balanceAmount <= 0 ? "paid" : "partial";
  invoice.statusHistory.push({ status: invoice.paymentStatus, changedBy: uidFrom(req), note: `Customer receipt ${receipt.documentNo} posted` });
  await invoice.save();
  await postAccountTransaction(req, { type: "cash_in", amount, referenceType: "secondary_payment", referenceId: receipt._id, description: `Customer receipt ${receipt.documentNo}`, accountId: body.toAccountId });
  if (invoice.secondaryOrderId) { const order = await SecondaryOrderModel.findOne({ _id: invoice.secondaryOrderId, companyId: invoice.companyId }).catch(() => null); if (order) { order.paymentStatus = invoice.paymentStatus; await order.save().catch(() => null); } }
  return { invoice, receipt };
}

async function paySupplierInvoice(req) {
  const { SupplierInvoiceModel, SupplierPaymentModel, PurchaseOrderModel } = await scoped(req);
  const invoice = await SupplierInvoiceModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!invoice) throw new Error("Supplier invoice not found.");
  if (invoice.status !== "posted") throw new Error("Only posted supplier invoices can be paid.");
  const balance = Number(invoice.balanceAmount || 0);
  if (balance <= 0) throw new Error("Supplier invoice is already paid.");
  const body = req.body || {}; const amount = Math.min(balance, toMoney(body.amount || balance));
  if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const payment = await SupplierPaymentModel.create({ companyId: invoice.companyId, documentNo: makeDocNo("SPAY"), ownerType: "company", ownerId: invoice.companyId, supplier: invoice.supplier, paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(), amount, paymentMethod: asText(body.paymentMethod || "cash"), fromAccountId: asText(body.fromAccountId), status: "posted", allocations: [{ invoiceId: invoice._id, invoiceNo: invoice.documentNo, allocatedAmount: amount }], referenceNo: asText(body.referenceNo), ledgerPosting: { postingState: "posted", postingKey: `SPAY:${invoice._id}:${Date.now()}`, postedAt: new Date() }, statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: `Supplier payment posted against ${invoice.documentNo}` }], createdByUserId: uidFrom(req), notes: asText(body.notes) });
  invoice.allocatedPaymentTotal = toMoney(Number(invoice.allocatedPaymentTotal || 0) + amount);
  invoice.balanceAmount = toMoney(Math.max(0, Number(invoice.invoiceTotal || 0) - Number(invoice.allocatedPaymentTotal || 0)));
  invoice.paymentStatus = invoice.balanceAmount <= 0 ? "paid" : "partial";
  invoice.statusHistory.push({ status: invoice.paymentStatus, changedBy: uidFrom(req), note: `Supplier payment ${payment.documentNo} posted` });
  await invoice.save();
  await postAccountTransaction(req, { type: "cash_out", amount, referenceType: "supplier_payment", referenceId: payment._id, description: `Supplier payment ${payment.documentNo}`, accountId: body.fromAccountId });
  if (invoice.purchaseOrderId) { const po = await PurchaseOrderModel.findOne({ _id: invoice.purchaseOrderId, companyId: invoice.companyId }).catch(() => null); if (po) { po.paymentStatus = invoice.paymentStatus; await po.save().catch(() => null); } }
  return { invoice, payment };
}

async function trialBalance(req) {
  const [accounts, entries] = await Promise.all([listChartAccounts(req), listJournalEntries({ ...req, query: { ...req.query, status: "posted" } })]);
  const rowMap = new Map(accounts.map((account) => [account.code, { ...account, debit: 0, credit: 0 }]));
  for (const entry of entries.filter((e) => e.status === "posted")) {
    for (const line of entry.lines || []) {
      const row = rowMap.get(line.accountCode) || { code: line.accountCode, name: line.accountName, type: line.accountType, openingBalance: 0, debit: 0, credit: 0 };
      row.debit += Number(line.debit || 0);
      row.credit += Number(line.credit || 0);
      rowMap.set(line.accountCode, row);
    }
  }
  const rows = [...rowMap.values()].map((row) => {
    const opening = Number(row.openingBalance || 0);
    const debit = toMoney(Number(row.debit || 0) + (["asset", "expense"].includes(row.type) ? opening : 0));
    const credit = toMoney(Number(row.credit || 0) + (["liability", "equity", "income"].includes(row.type) ? opening : 0));
    const balance = toMoney(debit - credit);
    return { code: row.code, name: row.name, type: row.type, debit, credit, balance };
  }).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  return { rows, totals: { debit: toMoney(sum(rows, "debit")), credit: toMoney(sum(rows, "credit")), difference: toMoney(sum(rows, "debit") - sum(rows, "credit")) } };
}

async function profitLoss(req) {
  const tb = await trialBalance(req);
  const income = tb.rows.filter((r) => r.type === "income").map((r) => ({ ...r, amount: toMoney(r.credit - r.debit) }));
  const expenses = tb.rows.filter((r) => r.type === "expense").map((r) => ({ ...r, amount: toMoney(r.debit - r.credit) }));
  const totalIncome = toMoney(sum(income, "amount"));
  const totalExpenses = toMoney(sum(expenses, "amount"));
  return { income, expenses, totalIncome, totalExpenses, netProfit: toMoney(totalIncome - totalExpenses) };
}

async function balanceSheet(req) {
  const tb = await trialBalance(req);
  const assets = tb.rows.filter((r) => r.type === "asset").map((r) => ({ ...r, amount: toMoney(r.debit - r.credit) }));
  const liabilities = tb.rows.filter((r) => r.type === "liability").map((r) => ({ ...r, amount: toMoney(r.credit - r.debit) }));
  const equity = tb.rows.filter((r) => r.type === "equity").map((r) => ({ ...r, amount: toMoney(r.credit - r.debit) }));
  return { assets, liabilities, equity, totals: { assets: toMoney(sum(assets, "amount")), liabilities: toMoney(sum(liabilities, "amount")), equity: toMoney(sum(equity, "amount")), liabilitiesAndEquity: toMoney(sum(liabilities, "amount") + sum(equity, "amount")) } };
}

async function aging(req) {
  const [distributorInvoices, customerInvoices, supplierInvoices] = await Promise.all([listDistributorInvoices(req), listCustomerInvoices(req), listSupplierInvoices(req)]);
  const empty = () => ({ current: 0, d31_60: 0, d61_90: 0, over90: 0, total: 0 });
  const add = (target, invoice, amount) => {
    const bucket = bucketByAge(invoice.dueDate || invoice.invoiceDate || invoice.createdAt, amount);
    for (const [key, value] of Object.entries(bucket)) target[key] = toMoney(Number(target[key] || 0) + value);
    target.total = toMoney(Number(target.total || 0) + amount);
  };
  const receivables = empty();
  const payables = empty();
  [...distributorInvoices, ...customerInvoices].forEach((invoice) => { const bal = Number(invoice.balanceAmount || 0); if (bal > 0) add(receivables, invoice, bal); });
  supplierInvoices.forEach((invoice) => { const bal = Number(invoice.balanceAmount || 0); if (bal > 0) add(payables, invoice, bal); });
  return { receivables, payables };
}

async function cashbook(req) {
  const transactions = await listTransactions(req);
  let running = 0;
  const rows = [...transactions].reverse().map((row) => {
    running = toMoney(running + (row.type === "cash_in" ? Number(row.amount || 0) : -Number(row.amount || 0)));
    return { ...row, runningBalance: running };
  }).reverse();
  return { rows, totals: { cashIn: toMoney(sum(transactions.filter((t) => t.type === "cash_in"), "amount")), cashOut: toMoney(sum(transactions.filter((t) => t.type === "cash_out"), "amount")), balance: toMoney(running) } };
}

async function reports(req) {
  const [tb, pl, bs, age, cb] = await Promise.all([trialBalance(req), profitLoss(req), balanceSheet(req), aging(req), cashbook(req)]);
  return { trialBalance: tb, profitLoss: pl, balanceSheet: bs, aging: age, cashbook: cb };
}

async function ledgerSummary(req) {
  const [accounts, transactions, expenses, loans, chartAccounts, journalEntries] = await Promise.all([listAccounts(req), listTransactions(req), listExpenses(req), listLoans(req), listChartAccounts(req), listJournalEntries(req)]);
  return { accounts, transactions, expenses, loans, chartAccounts, journalEntries, kpis: { accountBalance: toMoney(accounts.reduce((total, account) => total + Number(account.currentBalance || account.openingBalance || 0), 0)), cashIn: toMoney(sum(transactions.filter((t) => t.type === "cash_in"), "amount")), cashOut: toMoney(sum(transactions.filter((t) => t.type === "cash_out"), "amount")), pendingExpenses: toMoney(sum(expenses.filter((e) => ["pending", "approved"].includes(e.status)), "amount")), paidExpenses: toMoney(sum(expenses.filter((e) => ["paid", "posted"].includes(e.status)), "amount")), loansReceivable: toMoney(sum(loans.filter((l) => l.loanType === "given" && l.status === "open"), "remainingAmount")), loansPayable: toMoney(sum(loans.filter((l) => l.loanType === "received" && l.status === "open"), "remainingAmount")), chartAccounts: chartAccounts.length, postedJournals: journalEntries.filter((j) => j.status === "posted").length } };
}

async function overview(req) {
  const [distributorInvoices, distributorReceipts, customerInvoices, customerReceipts, supplierInvoices, supplierPayments, accounts, transactions, expenses, loans, chartAccounts, journalEntries, reportData] = await Promise.all([listDistributorInvoices(req), listDistributorReceipts(req), listCustomerInvoices(req), listCustomerReceipts(req), listSupplierInvoices(req), listSupplierPayments(req), listAccounts(req), listTransactions(req), listExpenses(req), listLoans(req), listChartAccounts(req), listJournalEntries(req), reports(req)]);
  return { distributorInvoices, distributorReceipts, customerInvoices, customerReceipts, supplierInvoices, supplierPayments, accounts, transactions, expenses, loans, chartAccounts, journalEntries, reports: reportData, kpis: { primaryReceivable: toMoney(sum(distributorInvoices, "balanceAmount")), primaryInvoiceTotal: toMoney(sum(distributorInvoices, "invoiceTotal")), distributorReceiptTotal: toMoney(sum(distributorReceipts.filter((r) => r.status === "posted"), "amount")), customerReceivable: toMoney(sum(customerInvoices, "balanceAmount")), supplierPayable: toMoney(sum(supplierInvoices, "balanceAmount")), supplierPaymentTotal: toMoney(sum(supplierPayments.filter((p) => p.status === "posted"), "amount")), accountBalance: toMoney(accounts.reduce((total, account) => total + Number(account.currentBalance || account.openingBalance || 0), 0)), openDistributorInvoices: distributorInvoices.filter((i) => Number(i.balanceAmount || 0) > 0).length, openSupplierInvoices: supplierInvoices.filter((i) => Number(i.balanceAmount || 0) > 0).length, cashIn: toMoney(sum(transactions.filter((t) => t.type === "cash_in"), "amount")), cashOut: toMoney(sum(transactions.filter((t) => t.type === "cash_out"), "amount")), pendingExpenses: toMoney(sum(expenses.filter((e) => ["pending", "approved"].includes(e.status)), "amount")), paidExpenses: toMoney(statusTotal(expenses, "paid") + statusTotal(expenses, "posted")), loansReceivable: toMoney(sum(loans.filter((l) => l.loanType === "given" && l.status === "open"), "remainingAmount")), loansPayable: toMoney(sum(loans.filter((l) => l.loanType === "received" && l.status === "open"), "remainingAmount")), chartAccounts: chartAccounts.length, postedJournalEntries: journalEntries.filter((j) => j.status === "posted").length, netProfit: reportData.profitLoss.netProfit, trialBalanceDifference: reportData.trialBalance.totals.difference } };
}

module.exports = {
  overview, ledgerSummary,
  listDistributorInvoices, listDistributorReceipts, receiveDistributorInvoice, receiveCustomerInvoice,
  listCustomerInvoices, listCustomerReceipts, listSupplierInvoices, listSupplierPayments, paySupplierInvoice,
  listAccounts, createAccount, createManualTransaction, listTransactions, listExpenses, listLoans,
  listChartAccounts, createChartAccount, updateChartAccount, deleteChartAccount,
  listJournalEntries, createJournalEntry, postJournalEntry, reverseJournalEntry,
  trialBalance, profitLoss, balanceSheet, aging, cashbook, reports,
};
