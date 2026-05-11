const service = require("../services/portalModule.service");
async function list(req, res) { try { res.json({ ok: true, modules: await service.listModules(req.query || {}) }); } catch (e) { res.status(500).json({ ok: false, message: e.message || "Unable to list portal modules" }); } }
async function seed(req, res) { try { await service.ensureDefaultModules(); res.json({ ok: true, modules: await service.listModules(req.query || {}) }); } catch (e) { res.status(500).json({ ok: false, message: e.message || "Unable to seed portal modules" }); } }
async function upsert(req, res) { try { res.json({ ok: true, module: await service.upsertModule(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, message: e.message || "Unable to save portal module" }); } }
module.exports = { list, seed, upsert };
