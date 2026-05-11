const service = require("./inventory.service");
function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }
async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load inventory overview", 500); } }
async function stockSummary(req, res) { try { return ok(res, { stock: await service.stockSummary(req) }); } catch (e) { return fail(res, e, "Unable to load stock summary", 500); } }
async function warehouseStockSummary(req, res) { try { return ok(res, { stock: await service.warehouseStockSummary(req) }); } catch (e) { return fail(res, e, "Unable to load warehouse stock summary", 500); } }
async function ledger(req, res) { try { return ok(res, { rows: await service.ledger(req) }); } catch (e) { return fail(res, e, "Unable to load inventory ledger", 500); } }
async function adjustments(req, res) { try { return ok(res, { adjustments: await service.listAdjustments(req) }); } catch (e) { return fail(res, e, "Unable to load stock adjustments", 500); } }
async function createAdjustment(req, res) { try { return ok(res, await service.createAdjustment(req)); } catch (e) { return fail(res, e, "Unable to create stock adjustment"); } }
async function transfers(req, res) { try { return ok(res, { transfers: await service.listTransfers(req) }); } catch (e) { return fail(res, e, "Unable to load stock transfers", 500); } }
async function createTransfer(req, res) { try { return ok(res, await service.createTransfer(req)); } catch (e) { return fail(res, e, "Unable to create stock transfer"); } }
async function completeTransfer(req, res) { try { return ok(res, await service.completeTransfer(req)); } catch (e) { return fail(res, e, "Unable to complete stock transfer"); } }
async function lowStock(req, res) { try { return ok(res, { lowStock: await service.lowStock(req) }); } catch (e) { return fail(res, e, "Unable to load low stock report", 500); } }
async function valuation(req, res) { try { return ok(res, { valuation: await service.valuation(req) }); } catch (e) { return fail(res, e, "Unable to load stock valuation", 500); } }
async function batches(req, res) { try { return ok(res, { batches: await service.batches(req) }); } catch (e) { return fail(res, e, "Unable to load batch stock", 500); } }
async function stockCard(req, res) { try { return ok(res, { stockCard: await service.stockCard(req) }); } catch (e) { return fail(res, e, "Unable to load stock card", 500); } }
module.exports = { overview, stockSummary, warehouseStockSummary, ledger, adjustments, createAdjustment, transfers, createTransfer, completeTransfer, lowStock, valuation, batches, stockCard };
