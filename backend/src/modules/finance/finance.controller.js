const service = require("./finance.service");

function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }

async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load finance overview", 500); } }
async function distributorInvoices(req, res) { try { return ok(res, { invoices: await service.listDistributorInvoices(req) }); } catch (e) { return fail(res, e, "Unable to load distributor invoices", 500); } }
async function distributorReceipts(req, res) { try { return ok(res, { receipts: await service.listDistributorReceipts(req) }); } catch (e) { return fail(res, e, "Unable to load distributor receipts", 500); } }
async function receiveDistributorInvoice(req, res) { try { return ok(res, await service.receiveDistributorInvoice(req)); } catch (e) { return fail(res, e, "Unable to receive distributor payment"); } }
async function customerInvoices(req, res) { try { return ok(res, { invoices: await service.listCustomerInvoices(req) }); } catch (e) { return fail(res, e, "Unable to load customer invoices", 500); } }
async function customerReceipts(req, res) { try { return ok(res, { receipts: await service.listCustomerReceipts(req) }); } catch (e) { return fail(res, e, "Unable to load customer receipts", 500); } }
async function supplierInvoices(req, res) { try { return ok(res, { invoices: await service.listSupplierInvoices(req) }); } catch (e) { return fail(res, e, "Unable to load supplier invoices", 500); } }
async function supplierPayments(req, res) { try { return ok(res, { payments: await service.listSupplierPayments(req) }); } catch (e) { return fail(res, e, "Unable to load supplier payments", 500); } }
async function paySupplierInvoice(req, res) { try { return ok(res, await service.paySupplierInvoice(req)); } catch (e) { return fail(res, e, "Unable to pay supplier invoice"); } }
async function accounts(req, res) { try { return ok(res, { accounts: await service.listAccounts(req) }); } catch (e) { return fail(res, e, "Unable to load accounts", 500); } }
async function transactions(req, res) { try { return ok(res, { transactions: await service.listTransactions(req) }); } catch (e) { return fail(res, e, "Unable to load account transactions", 500); } }

module.exports = { overview, distributorInvoices, distributorReceipts, receiveDistributorInvoice, customerInvoices, customerReceipts, supplierInvoices, supplierPayments, paySupplierInvoice, accounts, transactions };
