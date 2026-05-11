const express = require("express");
const ModuleAccessConfig = require("../models/ModuleAccessConfig");
const { requireAuth } = require("../../auth/utils/auth");
const { DEFAULT_MODULE_RULES, mergeModuleAccessRules, normalizeRole } = require("../utils/moduleAccess");

const router = express.Router();

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function resolveCompanyScope(req) {
  if (isSystemLevelAdmin(req.user?.role)) {
    return {
      companyId: String(req.query.companyId || req.body?.companyId || req.user?.companyId || "").trim(),
      companyName: String(req.query.companyName || req.body?.companyName || req.user?.companyName || "").trim(),
    };
  }
  return {
    companyId: String(req.user?.companyId || "").trim(),
    companyName: String(req.user?.companyName || "").trim(),
  };
}

function sanitizeRules(rules = []) {
  const defaultByKey = new Map(DEFAULT_MODULE_RULES.map((rule) => [rule.key, rule]));
  return (Array.isArray(rules) ? rules : [])
    .map((rule) => {
      const key = String(rule?.key || "").trim();
      const fallback = defaultByKey.get(key);
      if (!key || !fallback) return null;
      return {
        key,
        moduleKey: String(rule?.moduleKey || fallback.moduleKey || "").trim() || fallback.moduleKey,
        title: String(rule?.title || fallback.title || "").trim() || fallback.title,
        description: String(rule?.description || fallback.description || "").trim() || fallback.description,
        allowedRoles: Array.isArray(rule?.allowedRoles)
          ? Array.from(new Set(rule.allowedRoles.map((value) => normalizeRole(value)).filter(Boolean)))
          : [...fallback.allowedRoles],
        locked: typeof rule?.locked === "boolean" ? rule.locked : Boolean(fallback.locked),
      };
    })
    .filter(Boolean);
}

function toObjectIdOrUndefined(value) {
  const normalized = String(value || "").trim();
  return /^[a-f0-9]{24}$/i.test(normalized) ? normalized : undefined;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const scope = resolveCompanyScope(req);
    if (!scope.companyId) {
      return res.json({ ok: true, companyId: "", companyName: "", rules: DEFAULT_MODULE_RULES });
    }
    const config = await ModuleAccessConfig.findOne({ companyId: scope.companyId }).lean();
    return res.json({
      ok: true,
      companyId: scope.companyId,
      companyName: scope.companyName || config?.companyName || "",
      rules: mergeModuleAccessRules(config?.rules || []),
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load module access configuration" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    if (!isSystemLevelAdmin(req.user?.role)) {
      return res.status(403).json({ ok: false, message: "Only Admin or System Admin can save module access control" });
    }

    const scope = resolveCompanyScope(req);
    if (!scope.companyId) return res.status(400).json({ ok: false, message: "Company is required" });

    const merged = mergeModuleAccessRules(sanitizeRules(req.body?.rules || []));
    const updatePayload = {
      companyId: scope.companyId,
      companyName: scope.companyName,
      rules: merged,
    };
    const updatedBy = toObjectIdOrUndefined(req.user?.uid);
    if (updatedBy) updatePayload.updatedBy = updatedBy;

    const config = await ModuleAccessConfig.findOneAndUpdate(
      { companyId: scope.companyId },
      { $set: updatePayload },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      ok: true,
      config: {
        companyId: config.companyId,
        companyName: config.companyName,
        rules: mergeModuleAccessRules(config.rules || []),
        updatedAt: config.updatedAt,
      },
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to save module access configuration" });
  }
});

module.exports = router;
