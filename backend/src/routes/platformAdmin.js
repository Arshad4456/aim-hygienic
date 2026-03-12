const express = require("express");
const Company = require("../models/Company");
const CompanySettings = require("../models/CompanySettings");
const HierarchyTemplate = require("../models/HierarchyTemplate");
const RoleTemplate = require("../models/RoleTemplate");
const ModuleTemplate = require("../models/ModuleTemplate");
const { requireSuperAdmin } = require("../middleware/requireSuperAdmin");
const { assignHierarchyToCompany, getCompanyHierarchy } = require("../services/companyHierarchyService");
const {
  assignRolesToCompany,
  getCompanyRoles,
  getAvailableRoleTemplatesForCompany,
} = require("../services/companyRoleService");

const router = express.Router();

router.use(requireSuperAdmin);

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// 1. POST /platform-admin/companies
router.post("/companies", async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, message: "Company name is required" });

    const company = await Company.create({
      name,
      slug: slugify(body.slug || name),
      status: body.status || "active",
      logoUrl: String(body.logoUrl || "").trim(),
      primaryColor: String(body.primaryColor || "").trim(),
      address: String(body.address || "").trim(),
      phone: String(body.phone || "").trim(),
      email: String(body.email || "").trim(),
      createdBy: req.user?.uid,
    });

    const settings = await CompanySettings.create({
      companyId: company._id,
      appName: String(body.appName || name).trim(),
      logoUrl: String(body.logoUrl || "").trim(),
      primaryColor: String(body.primaryColor || "").trim(),
      invoiceHeader: String(body.invoiceHeader || "").trim(),
      invoiceFooter: String(body.invoiceFooter || "").trim(),
      receiptHeader: String(body.receiptHeader || "").trim(),
      receiptFooter: String(body.receiptFooter || "").trim(),
      modules: body.modules && typeof body.modules === "object" ? body.modules : {},
    });

    return res.status(201).json({ ok: true, company, settings });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Company slug already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create company" });
  }
});

// 2. GET /platform-admin/companies
router.get("/companies", async (_req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, companies });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load companies" });
  }
});

// 3. GET /platform-admin/companies/:id
router.get("/companies/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ ok: false, message: "Company not found" });

    const settings = await CompanySettings.findOne({ companyId: company._id }).lean();
    return res.json({ ok: true, company: { ...company, settings } });
  } catch (_error) {
    return res.status(400).json({ ok: false, message: "Invalid company id" });
  }
});

// 4. PUT /platform-admin/companies/:id
router.put("/companies/:id", async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {
      name: body.name,
      slug: body.slug ? slugify(body.slug) : undefined,
      status: body.status,
      logoUrl: body.logoUrl,
      primaryColor: body.primaryColor,
      address: body.address,
      phone: body.phone,
      email: body.email,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    const company = await Company.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!company) return res.status(404).json({ ok: false, message: "Company not found" });
    return res.json({ ok: true, company });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Company slug already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update company" });
  }
});

// 5. POST /platform-admin/hierarchy-templates
router.post("/hierarchy-templates", async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await HierarchyTemplate.create({
      name: body.name,
      code: body.code,
      description: body.description,
      levels: Array.isArray(body.levels) ? body.levels : [],
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return res.status(201).json({ ok: true, hierarchyTemplate: doc });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Hierarchy template code already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create hierarchy template" });
  }
});

// 6. GET /platform-admin/hierarchy-templates
router.get("/hierarchy-templates", async (_req, res) => {
  try {
    const hierarchyTemplates = await HierarchyTemplate.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, hierarchyTemplates });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load hierarchy templates" });
  }
});

// 7. POST /platform-admin/role-templates
router.post("/role-templates", async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await RoleTemplate.create({
      name: body.name,
      code: body.code,
      description: body.description,
      applicableHierarchyCodes: Array.isArray(body.applicableHierarchyCodes) ? body.applicableHierarchyCodes : [],
      isMandatory: body.isMandatory !== undefined ? Boolean(body.isMandatory) : false,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return res.status(201).json({ ok: true, roleTemplate: doc });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Role template code already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create role template" });
  }
});

// 8. GET /platform-admin/role-templates
router.get("/role-templates", async (_req, res) => {
  try {
    const roleTemplates = await RoleTemplate.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, roleTemplates });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load role templates" });
  }
});

// 9. POST /platform-admin/module-templates
router.post("/module-templates", async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await ModuleTemplate.create({
      name: body.name,
      code: body.code,
      description: body.description,
      category: body.category,
      types: Array.isArray(body.types) ? body.types : [],
      sections: Array.isArray(body.sections) ? body.sections : [],
      supportedActions: Array.isArray(body.supportedActions) ? body.supportedActions : [],
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return res.status(201).json({ ok: true, moduleTemplate: doc });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Module template code already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create module template" });
  }
});

// 10. GET /platform-admin/module-templates
router.get("/module-templates", async (_req, res) => {
  try {
    const moduleTemplates = await ModuleTemplate.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, moduleTemplates });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load module templates" });
  }
});


// 11. POST /platform-admin/companies/:companyId/hierarchy
router.post("/companies/:companyId/hierarchy", async (req, res) => {
  try {
    const { hierarchyTemplateId } = req.body || {};
    if (!hierarchyTemplateId) {
      return res.status(400).json({ success: false, message: "hierarchyTemplateId is required" });
    }

    const { company, hierarchyConfig } = await assignHierarchyToCompany(
      req.params.companyId,
      hierarchyTemplateId,
      req.user?.uid
    );

    return res.json({
      success: true,
      company: {
        _id: company._id,
        name: company.name,
        activeHierarchyCode: company.activeHierarchyCode,
        activeHierarchyConfigId: company.activeHierarchyConfigId,
      },
      hierarchyConfig: {
        _id: hierarchyConfig._id,
        companyId: hierarchyConfig.companyId,
        hierarchyTemplateId: hierarchyConfig.hierarchyTemplateId,
        hierarchyCode: hierarchyConfig.hierarchyCode,
        hierarchyName: hierarchyConfig.hierarchyName,
        levels: hierarchyConfig.levels,
        isActive: hierarchyConfig.isActive,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to assign hierarchy" });
  }
});

// 12. GET /platform-admin/companies/:companyId/hierarchy
router.get("/companies/:companyId/hierarchy", async (req, res) => {
  try {
    const hierarchyConfig = await getCompanyHierarchy(req.params.companyId);

    return res.json({
      success: true,
      hierarchyConfig: {
        _id: hierarchyConfig._id,
        companyId: hierarchyConfig.companyId,
        hierarchyTemplateId: hierarchyConfig.hierarchyTemplateId,
        hierarchyCode: hierarchyConfig.hierarchyCode,
        hierarchyName: hierarchyConfig.hierarchyName,
        levels: hierarchyConfig.levels,
        isActive: hierarchyConfig.isActive,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load hierarchy config" });
  }
});


// 13. POST /platform-admin/companies/:companyId/roles
router.post("/companies/:companyId/roles", async (req, res) => {
  try {
    const roleTemplateIds = req.body?.roleTemplateIds;
    if (!Array.isArray(roleTemplateIds)) {
      return res.status(400).json({ success: false, message: "roleTemplateIds must be an array" });
    }

    const { company, roles } = await assignRolesToCompany(req.params.companyId, roleTemplateIds, req.user?.uid);

    return res.json({
      success: true,
      company: {
        _id: company._id,
        name: company.name,
        activeHierarchyCode: company.activeHierarchyCode,
        activeRoleCodes: company.activeRoleCodes || [],
        hasRoleConfiguration: Boolean(company.hasRoleConfiguration),
      },
      roles: roles.map((role) => ({
        _id: role._id,
        companyId: role.companyId,
        roleTemplateId: role.roleTemplateId,
        roleCode: role.roleCode,
        roleName: role.roleName,
        hierarchyCode: role.hierarchyCode,
        isMandatory: role.isMandatory,
        isActive: role.isActive,
      })),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to assign company roles" });
  }
});

// 14. GET /platform-admin/companies/:companyId/roles
router.get("/companies/:companyId/roles", async (req, res) => {
  try {
    const roles = await getCompanyRoles(req.params.companyId);

    return res.json({
      success: true,
      roles: roles.map((role) => ({
        _id: role._id,
        companyId: role.companyId,
        roleTemplateId: role.roleTemplateId,
        roleCode: role.roleCode,
        roleName: role.roleName,
        hierarchyCode: role.hierarchyCode,
        isMandatory: role.isMandatory,
        isActive: role.isActive,
      })),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load company roles" });
  }
});

// 15. GET /platform-admin/companies/:companyId/available-role-templates
router.get("/companies/:companyId/available-role-templates", async (req, res) => {
  try {
    const roleTemplates = await getAvailableRoleTemplatesForCompany(req.params.companyId);
    return res.json({ success: true, roleTemplates });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load available role templates" });
  }
});

module.exports = router;
