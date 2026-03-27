const express = require("express");
const Area = require("../models/Area");
const { requireAuth } = require("../utils/auth");
const { syncMasterToTenant, removeMasterFromTenant, listTenantMasterByCompany } = require("../utils/tenantMasters");

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
    const doc = await Area.create({
      areaId: String(body.areaId || "").trim(),
      name: String(body.name || "").trim(),
      companyId,
      companyName,
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      status: String(body.status || "active").trim(),
      createdBy: req.user?.uid,
    });
    await syncMasterToTenant({ companyId, companyName, collectionName: "areas", doc });
    return res.status(201).json({ ok: true, area: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Territory ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create territory" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (!isSystemLevelAdmin(req.user?.role)) {
      let items = await listTenantMasterByCompany(req.user?.companyId, "areas");
      if (!items.length) {
        items = await Area.find({ companyId: String(req.user?.companyId || "").trim() }).sort({ createdAt: -1 }).lean();
      }
      if (req.query.warehouseId) items = items.filter((a) => String(a.warehouseId || "") === String(req.query.warehouseId));
      if (req.query.regionId) items = items.filter((a) => String(a.regionId || "") === String(req.query.regionId));
      if (req.query.zoneId) items = items.filter((a) => String(a.zoneId || "") === String(req.query.zoneId));
      const search = String(req.query.search || "").trim().toLowerCase();
      if (search) items = items.filter((a) => [a.areaId, a.name, a.warehouseName, a.regionName, a.zoneName].filter(Boolean).join(" ").toLowerCase().includes(search));
      return res.json({ ok: true, areas: items });
    }
    if (req.query.companyId) query.companyId = String(req.query.companyId);
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);

    const search = String(req.query.search || "").trim();
    if (search) {
      const rx = new RegExp(search, "i");
      query.$or = [{ areaId: rx }, { name: rx }, { warehouseName: rx }, { regionName: rx }, { zoneName: rx }];
    }

    const paging = getPagination(req.query);
    if (!paging.hasPaging) {
      const items = await Area.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, areas: items });
    }

    const [items, total] = await Promise.all([
      Area.find(query).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
      Area.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      areas: items,
      pagination: {
        page: paging.page,
        limit: paging.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / paging.limit)),
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load territories" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Area.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, area: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Area.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const body = req.body || {};
    const isSystemAdmin = isSystemLevelAdmin(req.user?.role);
    const companyId = isSystemAdmin ? String(body.companyId || "").trim() : String(req.user?.companyId || "").trim();
    const companyName = isSystemAdmin ? String(body.companyName || "").trim() : String(req.user?.companyName || "").trim();
    const updated = await Area.findByIdAndUpdate(
      req.params.id,
      {
        areaId: String(body.areaId || "").trim(),
        name: String(body.name || "").trim(),
        companyId,
        companyName,
        warehouseId: String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        zoneId: String(body.zoneId || "").trim(),
        zoneName: String(body.zoneName || "").trim(),
        status: String(body.status || "active").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    if (String(existing.companyId || "").trim() && String(existing.companyId || "").trim() !== String(updated.companyId || "").trim()) {
      await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "areas", id: existing._id });
    }
    await syncMasterToTenant({ companyId: updated.companyId, companyName: updated.companyName, collectionName: "areas", doc: updated });
    return res.json({ ok: true, area: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Territory ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update territory" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Area.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const deleted = await Area.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "areas", id: existing._id });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
