const express = require("express");
const ModuleAccessConfig = require("../models/ModuleAccessConfig");
const { requireAuth } = require("../utils/auth");
const { DEFAULT_MODULE_RULES, mergeModuleAccessRules, normalizeRole } = require("../utils/moduleAccess");

const router = express.Router();

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}


function canManageModuleAccess(role) {
  return isSystemLevelAdmin(role);
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

router.get("/", requireAuth, async (req, res) => {
  try {
    const scope = resolveCompanyScope(req);
    if (!scope.companyId) return res.json({ ok: true, companyId: "", companyName: "", rules: DEFAULT_MODULE_RULES });
    const config = await ModuleAccessConfig.findOne({ companyId: scope.companyId }).lean();
    return res.json({
      ok: true,
      companyId: scope.companyId,
      companyName: scope.companyName || config?.companyName || "",
      rules: mergeModuleAccessRules(config?.rules || []),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load module access configuration" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  if (!canManageModuleAccess(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Only admin or system admin can update module control" });
  }
  try {
    const scope = resolveCompanyScope(req);
    if (!scope.companyId) return res.status(400).json({ ok: false, message: "Company is required" });
    const requestedRules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    const merged = mergeModuleAccessRules(requestedRules.map((rule) => ({
      ...rule,
      key: String(rule.key || "").trim(),
      allowedRoles: Array.isArray(rule.allowedRoles) ? rule.allowedRoles.map((value) => normalizeRole(value)).filter(Boolean) : [],
      locked: Boolean(rule.locked),
    })));

    const config = await ModuleAccessConfig.findOneAndUpdate(
      { companyId: scope.companyId },
      {
        $set: {
          companyId: scope.companyId,
          companyName: scope.companyName,
          rules: merged,
          updatedBy: req.user?.uid,
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return res.json({ ok: true, config: { companyId: config.companyId, companyName: config.companyName, rules: mergeModuleAccessRules(config.rules || []) } });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to save module access configuration" });
  }
});

module.exports = router;
