function ok(res, payload) { return res.json({ ok: true, ...payload }); }
function fail(res, error, status = 400) { return res.status(status).json({ ok: false, message: error.message || 'Operation failed' }); }
const service = require('./operations.service');
async function overview(req, res) { try { return ok(res, { overview: await service.overview(req) }); } catch (error) { return fail(res, error, 500); } }
async function customerPortal(req, res) { try { return ok(res, { portal: await service.customerPortal(req) }); } catch (error) { return fail(res, error, 500); } }
module.exports = { overview, customerPortal };
