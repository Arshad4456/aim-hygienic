const service = require("./companyControl.service");
async function overview(req, res) {
  try {
    return res.json({ ok: true, ...(await service.getControlCenter(req.user || {})) });
  } catch (error) {
    const message = error.message || "Unable to load company control center";
    return res.status(/required|access|context/i.test(message) ? 403 : 500).json({ ok: false, message });
  }
}
module.exports = { overview };
