const service = require("../services/territory.service");

async function overview(req, res) {
  try {
    const data = await service.getTerritoryOverview(req.user || {}, req.query || {});
    res.json({ ok: true, ...data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Unable to load territory overview" });
  }
}

async function hierarchy(req, res) {
  try {
    const data = await service.getTerritoryHierarchy(req.user || {}, req.query || {});
    res.json({ ok: true, ...data });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || "Unable to load territory hierarchy" });
  }
}

module.exports = { overview, hierarchy };
