const salesService = require("./sales.service");

function ok(res, data) { return res.json({ ok: true, ...data }); }
function created(res, data) { return res.status(201).json({ ok: true, ...data }); }
function fail(res, error, status = 400) { return res.status(status).json({ ok: false, message: error.message || "Request failed" }); }

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

module.exports = { overview, distributors, products, warehouses, primaryOrders, createPrimaryOrder, approvePrimaryOrder, createDispatch, dispatches, postDispatch, invoices, distributorReceipts, postDistributorReceipt };
