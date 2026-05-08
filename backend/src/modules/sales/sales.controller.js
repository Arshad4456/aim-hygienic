const salesService = require("./sales.service");

function ok(res, data) { return res.json({ ok: true, ...data }); }
function created(res, data) { return res.status(201).json({ ok: true, ...data }); }
function fail(res, error, status = 400) { return res.status(status).json({ ok: false, message: error.message || "Request failed" }); }


async function quotations(req, res) { try { return ok(res, { quotations: await salesService.listSalesQuotations(req) }); } catch (e) { return fail(res, e, 500); } }
async function createQuotation(req, res) { try { return created(res, { quotation: await salesService.createSalesQuotation(req) }); } catch (e) { return fail(res, e); } }
async function approveQuotation(req, res) { try { return ok(res, { quotation: await salesService.approveSalesQuotation(req) }); } catch (e) { return fail(res, e); } }
async function convertQuotation(req, res) { try { return ok(res, await salesService.convertSalesQuotation(req)); } catch (e) { return fail(res, e); } }
async function companyReceipts(req, res) { try { return ok(res, { receipts: await salesService.listCompanyReceipts(req) }); } catch (e) { return fail(res, e, 500); } }
async function payDistributorInvoice(req, res) { try { return ok(res, await salesService.payDistributorInvoice(req)); } catch (e) { return fail(res, e); } }
async function attachDispatchPod(req, res) { try { return ok(res, await salesService.attachDispatchPod(req)); } catch (e) { return fail(res, e); } }
async function attachSecondaryPod(req, res) { try { return ok(res, { order: await salesService.attachSecondaryPod(req) }); } catch (e) { return fail(res, e); } }
async function distributorStatement(req, res) { try { return ok(res, { statement: await salesService.distributorStatement(req) }); } catch (e) { return fail(res, e, 500); } }
async function distributionOverview(req, res) { try { return ok(res, { overview: await salesService.distributionOverview(req) }); } catch (e) { return fail(res, e, 500); } }
async function printDocument(req, res) { try { return ok(res, await salesService.printDocumentData(req)); } catch (e) { return fail(res, e, 404); } }

async function overview(req, res) { try { return ok(res, { overview: await salesService.overview(req) }); } catch (e) { return fail(res, e, 500); } }
async function distributors(req, res) { try { return ok(res, { distributors: await salesService.listDistributors(req) }); } catch (e) { return fail(res, e, 500); } }
async function products(req, res) { try { return ok(res, { products: await salesService.listProducts(req) }); } catch (e) { return fail(res, e, 500); } }
async function warehouses(req, res) { try { return ok(res, { warehouses: await salesService.listWarehouses(req) }); } catch (e) { return fail(res, e, 500); } }
async function primaryOrders(req, res) { try { return ok(res, { orders: await salesService.listPrimaryOrders(req) }); } catch (e) { return fail(res, e, 500); } }
async function createPrimaryOrder(req, res) { try { return created(res, { order: await salesService.createPrimaryOrder(req) }); } catch (e) { return fail(res, e); } }
async function approvePrimaryOrder(req, res) { try { return ok(res, { order: await salesService.approvePrimaryOrder(req) }); } catch (e) { return fail(res, e); } }
async function createDispatch(req, res) { try { return ok(res, await salesService.createDispatchFromOrder(req)); } catch (e) { return fail(res, e); } }
async function dispatches(req, res) { try { return ok(res, { dispatches: await salesService.listDispatches(req) }); } catch (e) { return fail(res, e, 500); } }
async function postDispatch(req, res) { try { return ok(res, await salesService.postDispatch(req)); } catch (e) { return fail(res, e); } }
async function invoices(req, res) { try { return ok(res, { invoices: await salesService.listInvoices(req) }); } catch (e) { return fail(res, e, 500); } }
async function distributorReceipts(req, res) { try { return ok(res, { receipts: await salesService.listDistributorReceipts(req) }); } catch (e) { return fail(res, e, 500); } }
async function postDistributorReceipt(req, res) { try { return ok(res, await salesService.postDistributorReceipt(req)); } catch (e) { return fail(res, e); } }

async function secondaryOverview(req, res) { try { return ok(res, { overview: await salesService.secondaryOverview(req) }); } catch (e) { return fail(res, e, 500); } }
async function customers(req, res) { try { return ok(res, { customers: await salesService.listCustomers(req) }); } catch (e) { return fail(res, e, 500); } }
async function distributorProducts(req, res) { try { return ok(res, { products: await salesService.listDistributorProducts(req) }); } catch (e) { return fail(res, e, 500); } }
async function secondaryOrders(req, res) { try { return ok(res, { orders: await salesService.listSecondaryOrders(req) }); } catch (e) { return fail(res, e, 500); } }
async function createSecondaryOrder(req, res) { try { return created(res, { order: await salesService.createSecondaryOrder(req) }); } catch (e) { return fail(res, e); } }
async function approveSecondaryOrder(req, res) { try { return ok(res, { order: await salesService.approveSecondaryOrder(req) }); } catch (e) { return fail(res, e); } }
async function fulfillSecondaryOrder(req, res) { try { return ok(res, await salesService.fulfillSecondaryOrder(req)); } catch (e) { return fail(res, e); } }
async function customerInvoices(req, res) { try { return ok(res, { invoices: await salesService.listCustomerInvoices(req) }); } catch (e) { return fail(res, e, 500); } }
async function customerReceipts(req, res) { try { return ok(res, { receipts: await salesService.listCustomerReceipts(req) }); } catch (e) { return fail(res, e, 500); } }
async function payCustomerInvoice(req, res) { try { return ok(res, await salesService.payCustomerInvoice(req)); } catch (e) { return fail(res, e); } }

module.exports = { overview, quotations, createQuotation, approveQuotation, convertQuotation, distributors, products, warehouses, primaryOrders, createPrimaryOrder, approvePrimaryOrder, createDispatch, dispatches, postDispatch, attachDispatchPod, invoices, companyReceipts, payDistributorInvoice, distributorReceipts, postDistributorReceipt, secondaryOverview, customers, distributorProducts, secondaryOrders, createSecondaryOrder, approveSecondaryOrder, fulfillSecondaryOrder, attachSecondaryPod, customerInvoices, customerReceipts, payCustomerInvoice, distributorStatement, distributionOverview, printDocument };
