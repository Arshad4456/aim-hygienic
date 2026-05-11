const service = require("./notifications.service");

function ok(res, data) { return res.json({ ok: true, ...data }); }
function fail(res, error, status = 400) { return res.status(status).json({ ok: false, message: error.message || "Request failed" }); }

async function overview(req, res) {
  try { return ok(res, { overview: await service.overview(req) }); }
  catch (error) { return fail(res, error, 500); }
}

async function list(req, res) {
  try { return ok(res, { notifications: await service.list(req) }); }
  catch (error) { return fail(res, error, 500); }
}

async function create(req, res) {
  try { return res.status(201).json({ ok: true, notification: await service.create(req, req.body || {}) }); }
  catch (error) { return fail(res, error, 400); }
}

async function trigger(req, res) {
  try { return res.status(201).json({ ok: true, notification: await service.trigger(req, req.body || {}) }); }
  catch (error) { return fail(res, error, 400); }
}

async function markRead(req, res) {
  try { return ok(res, { notification: await service.markRead(req, req.params.id) }); }
  catch (error) { return fail(res, error, /not found/i.test(error.message) ? 404 : 400); }
}

async function markAllRead(req, res) {
  try { return ok(res, { result: await service.markAllRead(req) }); }
  catch (error) { return fail(res, error, 400); }
}

async function remove(req, res) {
  try { return ok(res, { deleted: await service.remove(req, req.params.id) }); }
  catch (error) { return fail(res, error, /not found/i.test(error.message) ? 404 : 400); }
}

module.exports = { overview, list, create, trigger, markRead, markAllRead, remove };
