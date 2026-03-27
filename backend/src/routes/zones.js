const express = require("express");
const Zone = require("../models/Zone");
const { requireAuth } = require("../utils/auth");

const router = express.Router();
function normalizeRole(role) { return String(role || "").trim().toLowerCase(); }
function isSystemLevelAdmin(role) { const r = normalizeRole(role); return r === "admin" || r === "system admin"; }

function getPagination(query) {
  const hasPaging = query.page || query.limit;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
  return { hasPaging, page, limit, skip: (page - 1) * limit };
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const isSystemAdmin = isSystemLevelAdmin(req.user?.role);
    const companyId = isSystemAdmin ? String(body.companyId || "").trim() : String(req.user?.companyId || "").trim();
    const companyName = isSystemAdmin ? String(body.companyName || "").trim() : String(req.user?.companyName || "").trim();
    if (!companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });
    const doc = await Zone.create({
      zoneId: String(body.zoneId || "").trim(),
      name: String(body.name || "").trim(),
      companyId,
      companyName,
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      status: String(body.status || "active").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, zone: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Zone ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create zone" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (!isSystemLevelAdmin(req.user?.role)) query.companyId = String(req.user?.companyId || "").trim();
    else if (req.query.companyId) query.companyId = String(req.query.companyId);
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    if (req.query.regionId) query.regionId = String(req.query.regionId);

    const search = String(req.query.search || "").trim();
    if (search) {
      const rx = new RegExp(search, "i");
      query.$or = [{ zoneId: rx }, { name: rx }, { warehouseName: rx }, { regionName: rx }];
    }

    const paging = getPagination(req.query);
    if (!paging.hasPaging) {
      const items = await Zone.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, zones: items });
    }

    const [items, total] = await Promise.all([
      Zone.find(query).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
      Zone.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      zones: items,
      pagination: {
        page: paging.page,
        limit: paging.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / paging.limit)),
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load zones" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Zone.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, zone: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Zone.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const body = req.body || {};
    const isSystemAdmin = isSystemLevelAdmin(req.user?.role);
    const companyId = isSystemAdmin ? String(body.companyId || "").trim() : String(req.user?.companyId || "").trim();
    const companyName = isSystemAdmin ? String(body.companyName || "").trim() : String(req.user?.companyName || "").trim();
    const updated = await Zone.findByIdAndUpdate(
      req.params.id,
      {
        zoneId: String(body.zoneId || "").trim(),
        name: String(body.name || "").trim(),
        companyId,
        companyName,
        warehouseId: String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        status: String(body.status || "active").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, zone: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Zone ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update zone" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Zone.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const deleted = await Zone.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;