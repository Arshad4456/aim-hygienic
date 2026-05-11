const PortalModule = require("../models/PortalModule");
const { DEFAULT_PORTAL_MODULES } = require("../workflows/portalModule.seed");
async function ensureDefaultModules() { for (const item of DEFAULT_PORTAL_MODULES) await PortalModule.updateOne({ key: item.key }, { $setOnInsert: item }, { upsert: true }); }
async function listModules(query = {}) { if (!(await PortalModule.countDocuments())) await ensureDefaultModules(); const filter = {}; if (query.status) filter.status = query.status; if (query.mobileEnabled === "true") filter.mobileEnabled = true; if (query.webEnabled === "true") filter.webEnabled = true; return PortalModule.find(filter).sort({ order: 1, name: 1 }).lean(); }
async function upsertModule(payload) { if (!payload.key || !payload.name || !payload.path) throw new Error("Module key, name and path are required"); return PortalModule.findOneAndUpdate({ key: String(payload.key).trim().toLowerCase() }, { ...payload, key: String(payload.key).trim().toLowerCase() }, { upsert: true, new: true, setDefaultsOnInsert: true }); }
module.exports = { ensureDefaultModules, listModules, upsertModule };
