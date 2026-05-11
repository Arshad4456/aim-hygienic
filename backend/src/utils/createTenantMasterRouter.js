const express = require("express");
const { requireAuth } = require("./auth");
const { requireCompanyModule } = require("../core/access/companyAccessGuard");
const { createMasterInTenant, updateMasterInTenant, deleteMasterFromTenant, findTenantMasterById, listTenantMasterByCompany } = require("./tenantMasters");
const { listAllTenantTargets } = require("./tenantModels");

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

function matchesSearch(row, searchKeys, search) {
  if (!search) return true;
  const haystack = searchKeys.map((key) => String(row?.[key] || "")).join(" ").toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function applyArrayFilters(items, filterKeys, req) {
  return items.filter((row) => {
    return filterKeys.every((key) => {
      if (!req.query[key]) return true;
      return String(row?.[key] || "") === String(req.query[key] || "");
    });
  });
}

module.exports = function createTenantMasterRouter({
  baseModel,
  collectionName,
  singular,
  plural,
  payloadBuilder,
  filterKeys = [],
  searchKeys = [],
  duplicateMessage,
  moduleKey = "",
}) {
  const router = express.Router();
  if (moduleKey) router.use(requireAuth, requireCompanyModule(moduleKey));

  async function listAllTenantDocs() {
    const items = [];
    const targets = await listAllTenantTargets();
    for (const target of targets) {
      const rows = await listTenantMasterByCompany(target.companyId, collectionName);
      if (rows?.length) items.push(...rows);
    }
    return items;
  }

  async function findScopedDoc(id, req, explicitScope = {}) {
    const companyId = explicitScope.companyId || req.user?.companyId || req.query.companyId || "";
    const companyName = explicitScope.companyName || req.user?.companyName || req.query.companyName || "";
    if (String(companyId || "").trim()) {
      const tenant = await findTenantMasterById(companyId, collectionName, id, companyName);
      if (tenant) return { doc: tenant, isTenant: true, companyId, companyName };
    }
    if (isSystemLevelAdmin(req.user?.role)) {
      const targets = await listAllTenantTargets();
      for (const target of targets) {
        const tenant = await findTenantMasterById(target.companyId, collectionName, id, target.companyName);
        if (tenant) return { doc: tenant, isTenant: true, companyId: target.companyId, companyName: target.companyName };
      }
    }
    const legacy = await baseModel.findById(id).lean();
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
        collectionName,
        payload: { ...payloadBuilder(body, req), createdBy: req.user?.uid },
      });
      return res.status(201).json({ ok: true, [singular]: doc });
    } catch (e) {
      return res.status(500).json({ ok: false, message: e?.code === 11000 ? duplicateMessage : `Failed to create ${singular}` });
    }
  });

  router.get("/", requireAuth, async (req, res) => {
    try {
      let items = [];
      if (!isSystemLevelAdmin(req.user?.role)) {
        items = await listTenantMasterByCompany(req.user?.companyId, collectionName);
      } else if (req.query.companyId) {
        items = await listTenantMasterByCompany(req.query.companyId, collectionName);
      } else {
        items = await listAllTenantDocs();
      }
      items = applyArrayFilters(items, filterKeys, req);
      const search = String(req.query.search || "").trim();
      if (search) items = items.filter((row) => matchesSearch(row, searchKeys, search));
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return res.json({ ok: true, [plural]: items });
    } catch (e) {
      return res.status(500).json({ ok: false, message: `Failed to load ${plural}` });
    }
  });

  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const scoped = await findScopedDoc(req.params.id, req);
      if (!scoped.doc) return res.status(404).json({ ok: false, message: "Not found" });
      return res.json({ ok: true, [singular]: scoped.doc });
    } catch (e) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }
  });

  router.put("/:id", requireAuth, async (req, res) => {
    try {
      const scoped = await findScopedDoc(req.params.id, req, resolveCompanyScope(req, req.body || {}));
      const existing = scoped.doc;
      if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
      if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
      const body = req.body || {};
      const scope = resolveCompanyScope(req, body);
      const payload = payloadBuilder(body, req);
      const nextCompanyId = scope.companyId || existing.companyId;
      const nextCompanyName = scope.companyName || existing.companyName;
      let updated;
      if (scoped.isTenant && nextCompanyId === scoped.companyId) {
        updated = await updateMasterInTenant({ companyId: scoped.companyId, companyName: scoped.companyName, collectionName, id: req.params.id, payload });
      } else {
        updated = await createMasterInTenant({ companyId: nextCompanyId, companyName: nextCompanyName, collectionName, payload: { _id: existing._id, ...existing, ...payload } });
        if (scoped.isTenant) await deleteMasterFromTenant({ companyId: scoped.companyId, companyName: scoped.companyName, collectionName, id: existing._id });
        else await baseModel.findByIdAndDelete(existing._id);
      }
      return res.json({ ok: true, [singular]: updated });
    } catch (e) {
      return res.status(500).json({ ok: false, message: e?.code === 11000 ? duplicateMessage : `Failed to update ${singular}` });
    }
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    try {
      const scoped = await findScopedDoc(req.params.id, req);
      const existing = scoped.doc;
      if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
      if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
      if (scoped.isTenant) await deleteMasterFromTenant({ companyId: scoped.companyId, companyName: scoped.companyName, collectionName, id: existing._id });
      else await baseModel.findByIdAndDelete(existing._id);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }
  });

  return router;
};
