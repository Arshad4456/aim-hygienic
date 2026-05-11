const service = require("./retail-pos.service");
function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }
async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load POS overview", 500); } }
async function sessions(req, res) { try { return ok(res, { sessions: await service.listSessions(req) }); } catch (e) { return fail(res, e, "Unable to load sessions", 500); } }
async function openSession(req, res) { try { return ok(res, await service.openSession(req)); } catch (e) { return fail(res, e, "Unable to open POS session"); } }
async function closeSession(req, res) { try { return ok(res, await service.closeSession(req)); } catch (e) { return fail(res, e, "Unable to close POS session"); } }
async function products(req, res) { try { return ok(res, { products: await service.listProducts(req) }); } catch (e) { return fail(res, e, "Unable to load POS products", 500); } }
async function customers(req, res) { try { return ok(res, { customers: await service.listCustomers(req) }); } catch (e) { return fail(res, e, "Unable to load customers", 500); } }
async function sales(req, res) { try { return ok(res, { sales: await service.listSales(req) }); } catch (e) { return fail(res, e, "Unable to load POS sales", 500); } }
async function createSale(req, res) { try { return ok(res, await service.createSale(req)); } catch (e) { return fail(res, e, "Unable to post POS sale"); } }
async function returnSale(req, res) { try { return ok(res, await service.returnSale(req)); } catch (e) { return fail(res, e, "Unable to return POS sale"); } }
async function printDocument(req, res) { try { return ok(res, await service.printDocument(req)); } catch (e) { return fail(res, e, "Unable to load print document", 404); } }
module.exports = { overview, sessions, openSession, closeSession, products, customers, sales, createSale, returnSale, printDocument };
