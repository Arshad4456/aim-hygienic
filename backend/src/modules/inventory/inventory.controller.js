const service = require("./inventory.service");
function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }
async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load inventory overview", 500); } }
async function stockSummary(req, res) { try { return ok(res, { stock: await service.stockSummary(req) }); } catch (e) { return fail(res, e, "Unable to load stock summary", 500); } }
async function ledger(req, res) { try { return ok(res, { rows: await service.ledger(req) }); } catch (e) { return fail(res, e, "Unable to load inventory ledger", 500); } }
module.exports = { overview, stockSummary, ledger };
