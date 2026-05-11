const service = require("../services/settings.service");

async function getSettings(req, res) {
  try {
    const settings = await service.getSettings(req.user || {}, req.query || {});
    return res.json({ ok: true, settings });
  } catch (error) {
    const status = /forbidden/i.test(error.message || "") ? 403 : 400;
    return res.status(status).json({ ok: false, message: error.message || "Failed to load settings" });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await service.updateSettings(req.user || {}, req.query || {}, req.body || {});
    return res.json({ ok: true, settings, message: "Settings saved" });
  } catch (error) {
    const status = /forbidden/i.test(error.message || "") ? 403 : 400;
    return res.status(status).json({ ok: false, message: error.message || "Failed to save settings" });
  }
}

async function updateSection(req, res) {
  try {
    const settings = await service.updateSection(req.user || {}, req.query || {}, req.params.section, req.body || {});
    return res.json({ ok: true, settings, message: "Settings section saved" });
  } catch (error) {
    const status = /forbidden/i.test(error.message || "") ? 403 : 400;
    return res.status(status).json({ ok: false, message: error.message || "Failed to save settings section" });
  }
}

module.exports = { getSettings, updateSettings, updateSection };
