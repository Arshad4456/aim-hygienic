const service = require("./erpTemplate.service");
async function list(req, res) { const templates = await service.listTemplates(); res.json({ ok: true, templates }); }
async function detail(req, res) { const template = await service.getTemplate(req.params.key); if (!template) return res.status(404).json({ ok: false, message: "ERP template not found" }); res.json({ ok: true, template }); }
async function upsert(req, res) { try { const template = await service.upsertTemplate(req.body || {}); res.status(201).json({ ok: true, template }); } catch (error) { res.status(400).json({ ok: false, message: error.message }); } }
module.exports = { list, detail, upsert };
