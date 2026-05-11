const service = require("../services/manufacturing.service");
function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }
async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load manufacturing overview", 500); } }
async function products(req, res) { try { return ok(res, { products: await service.listProducts(req) }); } catch (e) { return fail(res, e, "Unable to load products", 500); } }
async function warehouses(req, res) { try { return ok(res, { warehouses: await service.listWarehouses(req) }); } catch (e) { return fail(res, e, "Unable to load warehouses", 500); } }
async function boms(req, res) { try { return ok(res, { boms: await service.listBoms(req) }); } catch (e) { return fail(res, e, "Unable to load BOMs", 500); } }
async function createBom(req, res) { try { return ok(res, await service.createBom(req)); } catch (e) { return fail(res, e, "Unable to create BOM"); } }
async function productionOrders(req, res) { try { return ok(res, { productionOrders: await service.listProductionOrders(req) }); } catch (e) { return fail(res, e, "Unable to load production orders", 500); } }
async function createProductionOrder(req, res) { try { return ok(res, await service.createProductionOrder(req)); } catch (e) { return fail(res, e, "Unable to create production order"); } }
async function issueMaterials(req, res) { try { return ok(res, await service.issueMaterials(req)); } catch (e) { return fail(res, e, "Unable to issue materials"); } }
async function receiveFinishedGoods(req, res) { try { return ok(res, await service.receiveFinishedGoods(req)); } catch (e) { return fail(res, e, "Unable to receive finished goods"); } }
async function createQualityCheck(req, res) { try { return ok(res, await service.createQualityCheck(req)); } catch (e) { return fail(res, e, "Unable to record quality check"); } }
async function qualityChecks(req, res) { try { return ok(res, { qualityChecks: await service.listQualityChecks(req) }); } catch (e) { return fail(res, e, "Unable to load quality checks", 500); } }
async function maintenance(req, res) { try { return ok(res, { maintenance: await service.listMaintenance(req) }); } catch (e) { return fail(res, e, "Unable to load maintenance", 500); } }
async function createMaintenance(req, res) { try { return ok(res, await service.createMaintenance(req)); } catch (e) { return fail(res, e, "Unable to create maintenance record"); } }
async function printDocument(req, res) { try { return ok(res, await service.printDocument(req)); } catch (e) { return fail(res, e, "Unable to load print document", 404); } }
module.exports = { overview, products, warehouses, boms, createBom, productionOrders, createProductionOrder, issueMaterials, receiveFinishedGoods, createQualityCheck, qualityChecks, maintenance, createMaintenance, printDocument };
