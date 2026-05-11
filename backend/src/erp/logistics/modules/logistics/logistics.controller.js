const service = require("./logistics.service");

function ok(res, data) { return res.json({ ok: true, ...data }); }
function fail(res, error, status = 400) { return res.status(status).json({ ok: false, message: error.message || "Request failed" }); }

async function overview(req, res) {
  try { return ok(res, { overview: await service.overview(req) }); }
  catch (error) { return fail(res, error, 500); }
}

module.exports = { overview };
