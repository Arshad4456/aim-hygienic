const express = require("express");
const CompanyBranch = require("../models/CompanyBranch");
const { requireAuth, requireRole } = require("../utils/auth");

const router = express.Router();

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function resolveCompanyId(req) {
  const role = normalizeRole(req.user?.role);
  if (["admin", "system admin", "super admin"].includes(role)) return String(req.query.companyId || req.body?.companyId || "").trim();
  return String(req.user?.companyId || "").trim();
}

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, message: "companyId is required" });
    const branches = await CompanyBranch.find({ companyId }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, branches });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load company branches" });
  }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, message: "companyId is required" });
    const body = req.body || {};
    const branchCode = String(body.branchCode || "").trim();
    const name = String(body.name || "").trim();
    if (!branchCode || !name) return res.status(400).json({ ok: false, message: "branchCode and name are required" });
    const branch = await CompanyBranch.create({
      companyId,
      branchCode,
      name,
      type: body.type || "branch",
      address: body.address || "",
      city: body.city || "",
      regionId: body.regionId || "",
      zoneId: body.zoneId || "",
      warehouseId: body.warehouseId || "",
      managerId: body.managerId || "",
      phone: body.phone || "",
      email: body.email || "",
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, branch });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ ok: false, message: "Branch code already exists for this company" });
    return res.status(500).json({ ok: false, message: "Failed to create company branch" });
  }
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, message: "companyId is required" });
    const body = req.body || {};
    const branch = await CompanyBranch.findOneAndUpdate(
      { _id: req.params.id, companyId },
      {
        ...body,
        companyId,
        updatedBy: req.user?.uid,
      },
      { new: true, runValidators: true }
    );
    if (!branch) return res.status(404).json({ ok: false, message: "Branch not found" });
    return res.json({ ok: true, branch });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update company branch" });
  }
});

module.exports = router;
