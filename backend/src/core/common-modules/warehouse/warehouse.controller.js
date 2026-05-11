const service = require("./warehouse.service");
function ok(res, payload = {}) { return res.json({ ok: true, ...payload }); }
function fail(res, error, fallback = "Request failed", status = 400) { return res.status(status).json({ ok: false, message: error.message || fallback }); }
async function overview(req, res) { try { return ok(res, await service.overview(req)); } catch (e) { return fail(res, e, "Unable to load warehouse overview", 500); } }
module.exports = { overview };
