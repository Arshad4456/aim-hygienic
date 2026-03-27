const express = require("express");
const Warehouse = require("../models/Warehouse");
const { requireAuth } = require("../utils/auth");
const { syncMasterToTenant, removeMasterFromTenant, listTenantMasterByCompany } = require("../utils/tenantMasters");

const router = express.Router();
function normalizeRole(role) { return String(role || "").trim().toLowerCase(); }
function isSystemLevelAdmin(role) { const r = normalizeRole(role); return r === "admin" || r === "system admin"; }

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const role = req.user?.role;
    const isSystemAdmin = isSystemLevelAdmin(role);
    const scopedCompanyId = String(req.user?.companyId || "").trim();
    const scopedCompanyName = String(req.user?.companyName || "").trim();
    const companyId = isSystemAdmin ? String(body.companyId || "").trim() : scopedCompanyId;
    const companyName = isSystemAdmin ? String(body.companyName || "").trim() : scopedCompanyName;
    if (!companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });
    const doc = await Warehouse.create({
      warehouseId: String(body.warehouseId || "").trim(),
      name: String(body.name || "").trim(),
      mobileNumber: String(body.mobileNumber || "").trim(),
      phoneNumber: String(body.phoneNumber || "").trim(),
      phone: String(body.phoneNumber || body.phone || "").trim(),
      address: String(body.address || "").trim(),
      capacity: Number(body.capacity || 0),
      status: String(body.status || "active").trim(),
      companyId,
      companyName,
      createdBy: req.user?.uid,
    });
    await syncMasterToTenant({ companyId, companyName, collectionName: "warehouses", doc });
    return res.status(201).json({ ok: true, warehouse: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Warehouse ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create warehouse" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (!isSystemLevelAdmin(req.user?.role)) {
      let items = await listTenantMasterByCompany(req.user?.companyId, "warehouses");
      if (!items.length) {
        items = await Warehouse.find({ companyId: String(req.user?.companyId || "").trim() }).sort({ createdAt: -1 }).lean();
      }
      return res.json({ ok: true, warehouses: items });
    }
    if (req.query.companyId) {
      query.companyId = String(req.query.companyId);
    }
    const items = await Warehouse.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, warehouses: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load warehouses" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Warehouse.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, warehouse: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Warehouse.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const body = req.body || {};
    const isSystemAdmin = isSystemLevelAdmin(req.user?.role);
    const companyId = isSystemAdmin ? String(body.companyId || "").trim() : String(req.user?.companyId || "").trim();
    const companyName = isSystemAdmin ? String(body.companyName || "").trim() : String(req.user?.companyName || "").trim();
    const updated = await Warehouse.findByIdAndUpdate(
      req.params.id,
      {
        warehouseId: String(body.warehouseId || "").trim(),
        name: String(body.name || "").trim(),
        mobileNumber: String(body.mobileNumber || "").trim(),
        phoneNumber: String(body.phoneNumber || "").trim(),
        phone: String(body.phoneNumber || body.phone || "").trim(),
        address: String(body.address || "").trim(),
        capacity: Number(body.capacity || 0),
        status: String(body.status || "active").trim(),
        companyId,
        companyName,
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    if (String(existing.companyId || "").trim() && String(existing.companyId || "").trim() !== String(updated.companyId || "").trim()) {
      await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "warehouses", id: existing._id });
    }
    await syncMasterToTenant({ companyId: updated.companyId, companyName: updated.companyName, collectionName: "warehouses", doc: updated });
    return res.json({ ok: true, warehouse: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Warehouse ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update warehouse" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await Warehouse.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const deleted = await Warehouse.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    await removeMasterFromTenant({ companyId: existing.companyId, companyName: existing.companyName, collectionName: "warehouses", id: existing._id });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;