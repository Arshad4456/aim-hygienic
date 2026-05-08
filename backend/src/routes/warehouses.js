const express = require("express");
const Warehouse = require("../models/Warehouse");
const { requireAuth } = require("../utils/auth");
const { createMasterInTenant, updateMasterInTenant, deleteMasterFromTenant, findTenantMasterById, listTenantMasterByCompany } = require("../utils/tenantMasters");
const { listAllTenantTargets } = require("../utils/tenantModels");

const router = express.Router();
function normalizeRole(role) { return String(role || "").trim().toLowerCase(); }
function isSystemLevelAdmin(role) { const r = normalizeRole(role); return r === "admin" || r === "system admin"; }

function resolveCompanyScope(req, body = {}) {
  if (isSystemLevelAdmin(req.user?.role)) {
    return {
      companyId: String(body.companyId || req.query.companyId || "").trim(),
      companyName: String(body.companyName || req.query.companyName || "").trim(),
    };
  }
  return {
    companyId: String(req.user?.companyId || "").trim(),
    companyName: String(req.user?.companyName || "").trim(),
  };
}

async function listAllTenantWarehouses() {
  const items = [];
  const targets = await listAllTenantTargets();
  for (const target of targets) {
    const rows = await listTenantMasterByCompany(target.companyId, "warehouses");
    if (rows?.length) items.push(...rows);
  }
  return items;
}

async function findScopedWarehouse(id, req, explicitScope = {}) {
  const companyId = explicitScope.companyId || req.user?.companyId || req.query.companyId || "";
  const companyName = explicitScope.companyName || req.user?.companyName || req.query.companyName || "";
  if (String(companyId || "").trim()) {
    const tenant = await findTenantMasterById(companyId, "warehouses", id, companyName);
    if (tenant) return { doc: tenant, isTenant: true, companyId, companyName };
  }
  if (isSystemLevelAdmin(req.user?.role)) {
    const targets = await listAllTenantTargets();
    for (const target of targets) {
      const tenant = await findTenantMasterById(target.companyId, "warehouses", id, target.companyName);
      if (tenant) return { doc: tenant, isTenant: true, companyId: target.companyId, companyName: target.companyName };
    }
  }
  const legacy = await Warehouse.findById(id).lean();
  if (legacy) return { doc: legacy, isTenant: false, companyId: legacy.companyId, companyName: legacy.companyName };
  return { doc: null, isTenant: false, companyId: "", companyName: "" };
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const scope = resolveCompanyScope(req, body);
    if (!scope.companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });
    const doc = await createMasterInTenant({
      companyId: scope.companyId,
      companyName: scope.companyName,
      collectionName: "warehouses",
      payload: {
        warehouseId: String(body.warehouseId || "").trim(),
        name: String(body.name || "").trim(),
        companyName: scope.companyName || String(body.companyName || "").trim(),
        mobileNumber: String(body.mobileNumber || "").trim(),
        phoneNumber: String(body.phoneNumber || "").trim(),
        phone: String(body.phoneNumber || body.phone || "").trim(),
        address: String(body.address || "").trim(),
        city: String(body.city || "").trim(),
        managerName: String(body.managerName || "").trim(),
        capacity: Number(body.capacity || 0),
        status: String(body.status || "active").trim(),
        createdBy: req.user?.uid,
      },
    });
    return res.status(201).json({ ok: true, warehouse: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.code === 11000 ? "Warehouse ID already exists" : "Failed to create warehouse" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    if (!isSystemLevelAdmin(req.user?.role)) {
      const items = await listTenantMasterByCompany(req.user?.companyId, "warehouses");
      return res.json({ ok: true, warehouses: items });
    }
    const items = req.query.companyId ? await listTenantMasterByCompany(req.query.companyId, "warehouses") : await listAllTenantWarehouses();
    return res.json({ ok: true, warehouses: items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load warehouses" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const scoped = await findScopedWarehouse(req.params.id, req);
    if (!scoped.doc) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, warehouse: scoped.doc });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const scoped = await findScopedWarehouse(req.params.id, req, resolveCompanyScope(req, req.body || {}));
    const existing = scoped.doc;
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    const body = req.body || {};
    const scope = resolveCompanyScope(req, body);
    const payload = {
      warehouseId: String(body.warehouseId || "").trim(),
      name: String(body.name || "").trim(),
      companyName: scope.companyName || String(body.companyName || existing.companyName || "").trim(),
      mobileNumber: String(body.mobileNumber || "").trim(),
      phoneNumber: String(body.phoneNumber || "").trim(),
      phone: String(body.phoneNumber || body.phone || "").trim(),
      address: String(body.address || "").trim(),
      city: String(body.city || "").trim(),
      managerName: String(body.managerName || "").trim(),
      capacity: Number(body.capacity || 0),
      status: String(body.status || "active").trim(),
    };
    const nextCompanyId = scope.companyId || existing.companyId;
    const nextCompanyName = scope.companyName || existing.companyName;
    let updated;
    if (scoped.isTenant && nextCompanyId === scoped.companyId) {
      updated = await updateMasterInTenant({ companyId: scoped.companyId, companyName: scoped.companyName, collectionName: "warehouses", id: req.params.id, payload });
    } else {
      updated = await createMasterInTenant({ companyId: nextCompanyId, companyName: nextCompanyName, collectionName: "warehouses", payload: { _id: existing._id, ...existing, ...payload } });
      if (scoped.isTenant) await deleteMasterFromTenant({ companyId: scoped.companyId, companyName: scoped.companyName, collectionName: "warehouses", id: existing._id });
      else await Warehouse.findByIdAndDelete(existing._id);
    }
    return res.json({ ok: true, warehouse: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.code === 11000 ? "Warehouse ID already exists" : "Failed to update warehouse" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const scoped = await findScopedWarehouse(req.params.id, req);
    const existing = scoped.doc;
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    if (scoped.isTenant) await deleteMasterFromTenant({ companyId: scoped.companyId, companyName: scoped.companyName, collectionName: "warehouses", id: existing._id });
    else await Warehouse.findByIdAndDelete(existing._id);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
