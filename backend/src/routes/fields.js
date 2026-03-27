const express = require("express");
const Field = require("../models/Field");
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
    const doc = await Field.create({
      fieldId: String(body.fieldId || "").trim(),
      name: String(body.name || "").trim(),
      companyId,
      companyName,
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      territoryId: String(body.territoryId || "").trim(),
      territoryName: String(body.territoryName || "").trim(),
      status: String(body.status || "active").trim(),
      createdBy: req.user?.uid,
    });
    await syncMasterToTenant({ companyId, companyName, collectionName: "fields", doc });
    return res.status(201).json({ ok: true, field: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Field ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create field" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (!isSystemLevelAdmin(req.user?.role)) {
      let items = await listTenantMasterByCompany(req.user?.companyId, "fields");
      if (!items.length) {
        items = await Field.find({ companyId: String(req.user?.companyId || "").trim() }).sort({ createdAt: -1 }).lean();
      }
      if (req.query.warehouseId) items = items.filter((f) => String(f.warehouseId || "") === String(req.query.warehouseId));
      if (req.query.regionId) items = items.filter((f) => String(f.regionId || "") === String(req.query.regionId));
      if (req.query.zoneId) items = items.filter((f) => String(f.zoneId || "") === String(req.query.zoneId));
      if (req.query.territoryId) items = items.filter((f) => String(f.territoryId || "") === String(req.query.territoryId));
      const search = String(req.query.search || "").trim().toLowerCase();
      if (search) items = items.filter((f) => [f.fieldId, f.name, f.warehouseName, f.regionName, f.zoneName, f.territoryName].filter(Boolean).join(" ").toLowerCase().includes(search));
      return res.json({ ok: true, fields: items });
    }
    if (req.query.companyId) query.companyId = String(req.query.companyId);
    if (req.query.warehouseId) query.warehouseId = String(req.query.warehouseId);
    if (req.query.regionId) query.regionId = String(req.query.regionId);
    if (req.query.zoneId) query.zoneId = String(req.query.zoneId);
    if (req.query.territoryId) query.territoryId = String(req.query.territoryId);

    const search = String(req.query.search || "").trim();
    if (search) {
      const rx = new RegExp(search, "i");
      query.$or = [{ fieldId: rx }, { name: rx }, { warehouseName: rx }, { regionName: rx }, { zoneName: rx }, { territoryName: rx }];
    }

    const paging = getPagination(req.query);
    if (!paging.hasPaging) {
      const items = await Field.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, fields: items });
    }

    const [items, total] = await Promise.all([
      Field.find(query).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
      Field.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      fields: items,
      pagination: {
        page: paging.page,
        limit: paging.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / paging.limit)),
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load fields" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Field.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, field: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Field.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const body = req.body || {};
    const isSystemAdmin = isSystemLevelAdmin(req.user?.role);
    const companyId = isSystemAdmin ? String(body.companyId || "").trim() : String(req.user?.companyId || "").trim();
    const companyName = isSystemAdmin ? String(body.companyName || "").trim() : String(req.user?.companyName || "").trim();
    const updated = await Field.findByIdAndUpdate(
      req.params.id,
      {
        fieldId: String(body.fieldId || "").trim(),
        name: String(body.name || "").trim(),
        companyId,
        companyName,
        warehouseId: String(body.warehouseId || "").trim(),
        warehouseName: String(body.warehouseName || "").trim(),
        regionId: String(body.regionId || "").trim(),
        regionName: String(body.regionName || "").trim(),
        zoneId: String(body.zoneId || "").trim(),
        zoneName: String(body.zoneName || "").trim(),
        territoryId: String(body.territoryId || "").trim(),
        territoryName: String(body.territoryName || "").trim(),
        status: String(body.status || "active").trim(),
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    if (String(existing.companyId || "").trim() && String(existing.companyId || "").trim() !== String(updated.companyId || "").trim()) {
      await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "fields", id: existing._id });
    }
    await syncMasterToTenant({ companyId: updated.companyId, companyName: updated.companyName, collectionName: "fields", doc: updated });
    return res.json({ ok: true, field: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Field ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update field" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Field.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const deleted = await Field.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "fields", id: existing._id });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;