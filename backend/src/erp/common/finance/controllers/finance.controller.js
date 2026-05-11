const service = require("../services/finance.service");

function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }

async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load finance overview", 500); } }
async function ledgerSummary(req, res) { try { return ok(res, await service.ledgerSummary(req)); } catch (e) { return fail(res, e, "Unable to load ledger summary", 500); } }
async function distributorInvoices(req, res) { try { return ok(res, { invoices: await service.listDistributorInvoices(req) }); } catch (e) { return fail(res, e, "Unable to load distributor invoices", 500); } }
async function distributorReceipts(req, res) { try { return ok(res, { receipts: await service.listDistributorReceipts(req) }); } catch (e) { return fail(res, e, "Unable to load distributor receipts", 500); } }
async function receiveDistributorInvoice(req, res) { try { return ok(res, await service.receiveDistributorInvoice(req)); } catch (e) { return fail(res, e, "Unable to receive distributor payment"); } }
async function receiveCustomerInvoice(req, res) { try { return ok(res, await service.receiveCustomerInvoice(req)); } catch (e) { return fail(res, e, "Unable to receive customer payment"); } }
async function customerInvoices(req, res) { try { return ok(res, { invoices: await service.listCustomerInvoices(req) }); } catch (e) { return fail(res, e, "Unable to load customer invoices", 500); } }
async function customerReceipts(req, res) { try { return ok(res, { receipts: await service.listCustomerReceipts(req) }); } catch (e) { return fail(res, e, "Unable to load customer receipts", 500); } }
async function supplierInvoices(req, res) { try { return ok(res, { invoices: await service.listSupplierInvoices(req) }); } catch (e) { return fail(res, e, "Unable to load supplier invoices", 500); } }
async function supplierPayments(req, res) { try { return ok(res, { payments: await service.listSupplierPayments(req) }); } catch (e) { return fail(res, e, "Unable to load supplier payments", 500); } }
async function paySupplierInvoice(req, res) { try { return ok(res, await service.paySupplierInvoice(req)); } catch (e) { return fail(res, e, "Unable to pay supplier invoice"); } }
async function accounts(req, res) { try { return ok(res, { accounts: await service.listAccounts(req) }); } catch (e) { return fail(res, e, "Unable to load accounts", 500); } }
async function createAccount(req, res) { try { return ok(res, { account: await service.createAccount(req) }); } catch (e) { return fail(res, e, "Unable to create account"); } }
async function transactions(req, res) { try { return ok(res, { transactions: await service.listTransactions(req) }); } catch (e) { return fail(res, e, "Unable to load account transactions", 500); } }
async function createTransaction(req, res) { try { return ok(res, { transaction: await service.createManualTransaction(req) }); } catch (e) { return fail(res, e, "Unable to create cashbook transaction"); } }
async function expenses(req, res) { try { return ok(res, { expenses: await service.listExpenses(req) }); } catch (e) { return fail(res, e, "Unable to load expenses", 500); } }
async function loans(req, res) { try { return ok(res, { loans: await service.listLoans(req) }); } catch (e) { return fail(res, e, "Unable to load loans", 500); } }
async function chartAccounts(req, res) { try { return ok(res, { accounts: await service.listChartAccounts(req) }); } catch (e) { return fail(res, e, "Unable to load chart of accounts", 500); } }
async function createChartAccount(req, res) { try { return ok(res, { account: await service.createChartAccount(req) }); } catch (e) { return fail(res, e, "Unable to create chart account"); } }
async function updateChartAccount(req, res) { try { return ok(res, { account: await service.updateChartAccount(req) }); } catch (e) { return fail(res, e, "Unable to update chart account"); } }
async function deleteChartAccount(req, res) { try { return ok(res, await service.deleteChartAccount(req)); } catch (e) { return fail(res, e, "Unable to delete chart account"); } }
async function journalEntries(req, res) { try { return ok(res, { entries: await service.listJournalEntries(req) }); } catch (e) { return fail(res, e, "Unable to load journal entries", 500); } }
async function createJournalEntry(req, res) { try { return ok(res, { entry: await service.createJournalEntry(req) }); } catch (e) { return fail(res, e, "Unable to create journal entry"); } }
async function postJournalEntry(req, res) { try { return ok(res, { entry: await service.postJournalEntry(req) }); } catch (e) { return fail(res, e, "Unable to post journal entry"); } }
async function reverseJournalEntry(req, res) { try { return ok(res, { entry: await service.reverseJournalEntry(req) }); } catch (e) { return fail(res, e, "Unable to reverse journal entry"); } }
async function trialBalance(req, res) { try { return ok(res, { trialBalance: await service.trialBalance(req) }); } catch (e) { return fail(res, e, "Unable to prepare trial balance", 500); } }
async function profitLoss(req, res) { try { return ok(res, { profitLoss: await service.profitLoss(req) }); } catch (e) { return fail(res, e, "Unable to prepare profit and loss", 500); } }
async function balanceSheet(req, res) { try { return ok(res, { balanceSheet: await service.balanceSheet(req) }); } catch (e) { return fail(res, e, "Unable to prepare balance sheet", 500); } }
async function aging(req, res) { try { return ok(res, { aging: await service.aging(req) }); } catch (e) { return fail(res, e, "Unable to prepare aging report", 500); } }
async function cashbook(req, res) { try { return ok(res, { cashbook: await service.cashbook(req) }); } catch (e) { return fail(res, e, "Unable to prepare cashbook", 500); } }
async function reports(req, res) { try { return ok(res, { reports: await service.reports(req) }); } catch (e) { return fail(res, e, "Unable to load finance reports", 500); } }

module.exports = {
  overview, ledgerSummary, distributorInvoices, distributorReceipts, receiveDistributorInvoice, receiveCustomerInvoice,
  customerInvoices, customerReceipts, supplierInvoices, supplierPayments, paySupplierInvoice,
  accounts, createAccount, transactions, createTransaction, expenses, loans,
  chartAccounts, createChartAccount, updateChartAccount, deleteChartAccount,
  journalEntries, createJournalEntry, postJournalEntry, reverseJournalEntry,
  trialBalance, profitLoss, balanceSheet, aging, cashbook, reports,
};
