const express = require("express");
const Company = require("../models/Company");
const CompanySettings = require("../models/CompanySettings");
const HierarchyTemplate = require("../models/HierarchyTemplate");
const RoleTemplate = require("../models/RoleTemplate");
const ModuleTemplate = require("../models/ModuleTemplate");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const DocumentTemplatePreset = require("../models/DocumentTemplatePreset");
const {
  createCompanyDocumentTemplate,
  listCompanyDocumentTemplates,
  getCompanyDocumentTemplate,
  updateCompanyDocumentTemplate,
  applyPresetToCompany,
} = require("../services/companyDocumentTemplateService");
const { requireSuperAdmin } = require("../middleware/requireSuperAdmin");
const { assignHierarchyToCompany, getCompanyHierarchy } = require("../services/companyHierarchyService");
const {
  assignRolesToCompany,
  getCompanyRoles,
  getAvailableRoleTemplatesForCompany,
} = require("../services/companyRoleService");
const {
  generateDashboardsForCompany,
  getCompanyDashboards,
  getCompanyDashboardByRole,
} = require("../services/companyDashboardService");
const {
  assignModulesToRoleDashboard,
  getRoleDashboardModules,
} = require("../services/companyRoleModuleService");
const {
  assignPermissionsToRoleModule,
  getRoleModulePermissions,
} = require("../services/companyRoleModulePermissionService");
const { getRuntimeDashboardDefinition } = require("../services/runtimeDashboardService");

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
      subtypes: Array.isArray(body.subtypes) ? body.subtypes : [],
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

// 10b. GET /platform-admin/module-templates/:id
router.get("/module-templates/:id", async (req, res) => {
  try {
    const moduleTemplate = await ModuleTemplate.findById(req.params.id).lean();
    if (!moduleTemplate) return res.status(404).json({ success: false, message: "Module template not found" });
    return res.json({ success: true, moduleTemplate });
  } catch (_error) {
    return res.status(400).json({ success: false, message: "Invalid module template id" });
  }
});

// 10c. GET /platform-admin/module-templates/:moduleCode/actions
router.get("/module-templates/:moduleCode/actions", async (req, res) => {
  try {
    const moduleTemplate = await ModuleTemplate.findOne({ code: String(req.params.moduleCode || "").trim().toLowerCase() }).lean();
    if (!moduleTemplate) return res.status(404).json({ success: false, message: "Module template not found" });

    return res.json({
      success: true,
      module: {
        code: moduleTemplate.code,
        name: moduleTemplate.name,
        supportedActions: moduleTemplate.supportedActions || [],
        sections: moduleTemplate.sections || [],
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to load module actions" });
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


// 16. POST /platform-admin/companies/:companyId/generate-dashboards
router.post("/companies/:companyId/generate-dashboards", async (req, res) => {
  try {
    const { company, dashboards } = await generateDashboardsForCompany(req.params.companyId, req.user?.uid);

    return res.json({
      success: true,
      company: {
        _id: company._id,
        name: company.name,
        hasDashboardConfiguration: Boolean(company.hasDashboardConfiguration),
      },
      dashboards: dashboards.map((dashboard) => ({
        _id: dashboard._id,
        companyId: dashboard.companyId,
        companyRoleConfigId: dashboard.companyRoleConfigId,
        roleCode: dashboard.roleCode,
        roleName: dashboard.roleName,
        dashboardTitle: dashboard.dashboardTitle,
        dashboardCode: dashboard.dashboardCode,
        shellConfig: dashboard.shellConfig,
        sidebarItems: dashboard.sidebarItems,
        sharedFeatures: dashboard.sharedFeatures,
        isActive: dashboard.isActive,
      })),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to generate dashboards" });
  }
});

// 17. GET /platform-admin/companies/:companyId/dashboards
router.get("/companies/:companyId/dashboards", async (req, res) => {
  try {
    const dashboards = await getCompanyDashboards(req.params.companyId);

    return res.json({
      success: true,
      dashboards: dashboards.map((dashboard) => ({
        _id: dashboard._id,
        companyId: dashboard.companyId,
        roleCode: dashboard.roleCode,
        roleName: dashboard.roleName,
        dashboardTitle: dashboard.dashboardTitle,
        dashboardCode: dashboard.dashboardCode,
        shellConfig: dashboard.shellConfig,
        sidebarItems: dashboard.sidebarItems,
        sharedFeatures: dashboard.sharedFeatures,
      })),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load company dashboards" });
  }
});

// 18. GET /platform-admin/companies/:companyId/dashboards/:roleCode
router.get("/companies/:companyId/dashboards/:roleCode", async (req, res) => {
  try {
    const dashboard = await getCompanyDashboardByRole(req.params.companyId, req.params.roleCode);

    return res.json({
      success: true,
      dashboard: {
        _id: dashboard._id,
        companyId: dashboard.companyId,
        roleCode: dashboard.roleCode,
        roleName: dashboard.roleName,
        dashboardTitle: dashboard.dashboardTitle,
        dashboardCode: dashboard.dashboardCode,
        shellConfig: dashboard.shellConfig,
        sidebarItems: dashboard.sidebarItems,
        sharedFeatures: dashboard.sharedFeatures,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load company dashboard" });
  }
});


// 19. POST /platform-admin/companies/:companyId/dashboards/:roleCode/modules
router.post("/companies/:companyId/dashboards/:roleCode/modules", async (req, res) => {
  try {
    const modules = req.body?.modules;
    if (!Array.isArray(modules)) {
      return res.status(400).json({ success: false, message: "modules must be an array" });
    }

    const { dashboard, modules: assignedModules } = await assignModulesToRoleDashboard(
      req.params.companyId,
      req.params.roleCode,
      modules,
      req.user?.uid
    );

    return res.json({
      success: true,
      dashboard: {
        _id: dashboard._id,
        roleCode: dashboard.roleCode,
        roleName: dashboard.roleName,
        sidebarItems: dashboard.sidebarItems,
      },
      modules: assignedModules.map((moduleItem) => ({
        _id: moduleItem._id,
        companyId: moduleItem.companyId,
        companyRoleConfigId: moduleItem.companyRoleConfigId,
        companyDashboardConfigId: moduleItem.companyDashboardConfigId,
        moduleTemplateId: moduleItem.moduleTemplateId,
        moduleCode: moduleItem.moduleCode,
        moduleName: moduleItem.moduleName,
        moduleType: moduleItem.moduleType,
        selectedSubtypes: moduleItem.selectedSubtypes,
        selectedSections: moduleItem.selectedSections,
        sidebarLabel: moduleItem.sidebarLabel,
        sidebarPath: moduleItem.sidebarPath,
        sidebarOrder: moduleItem.sidebarOrder,
        isActive: moduleItem.isActive,
      })),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to assign modules to dashboard" });
  }
});

// 20. GET /platform-admin/companies/:companyId/dashboards/:roleCode/modules
router.get("/companies/:companyId/dashboards/:roleCode/modules", async (req, res) => {
  try {
    const modules = await getRoleDashboardModules(req.params.companyId, req.params.roleCode);

    return res.json({
      success: true,
      modules: modules.map((moduleItem) => ({
        _id: moduleItem._id,
        moduleCode: moduleItem.moduleCode,
        moduleName: moduleItem.moduleName,
        moduleType: moduleItem.moduleType,
        selectedSubtypes: moduleItem.selectedSubtypes,
        selectedSections: moduleItem.selectedSections,
        sidebarLabel: moduleItem.sidebarLabel,
        sidebarPath: moduleItem.sidebarPath,
        sidebarOrder: moduleItem.sidebarOrder,
        isActive: moduleItem.isActive,
      })),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load dashboard modules" });
  }
});

// 21. GET /platform-admin/companies/:companyId/available-modules
router.get("/companies/:companyId/available-modules", async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).lean();
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const moduleTemplates = await ModuleTemplate.find({ isActive: true }).sort({ name: 1 }).lean();
    return res.json({ success: true, moduleTemplates });
  } catch (_error) {
    return res.status(400).json({ success: false, message: "Invalid company id" });
  }
});


// 22. POST /platform-admin/companies/:companyId/dashboards/:roleCode/modules/:moduleCode/permissions
router.post("/companies/:companyId/dashboards/:roleCode/modules/:moduleCode/permissions", async (req, res) => {
  try {
    const permission = await assignPermissionsToRoleModule(
      req.params.companyId,
      req.params.roleCode,
      req.params.moduleCode,
      req.body || {},
      req.user?.uid
    );

    return res.json({
      success: true,
      permission: {
        _id: permission._id,
        companyId: permission.companyId,
        companyRoleConfigId: permission.companyRoleConfigId,
        companyDashboardConfigId: permission.companyDashboardConfigId,
        companyRoleModuleConfigId: permission.companyRoleModuleConfigId,
        moduleCode: permission.moduleCode,
        roleCode: permission.roleCode,
        allowedActions: permission.allowedActions,
        sectionPermissions: permission.sectionPermissions,
        isActive: permission.isActive,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to assign module permissions" });
  }
});

// 23. GET /platform-admin/companies/:companyId/dashboards/:roleCode/modules/:moduleCode/permissions
router.get("/companies/:companyId/dashboards/:roleCode/modules/:moduleCode/permissions", async (req, res) => {
  try {
    const permission = await getRoleModulePermissions(req.params.companyId, req.params.roleCode, req.params.moduleCode);

    return res.json({
      success: true,
      permission: {
        _id: permission._id,
        moduleCode: permission.moduleCode,
        roleCode: permission.roleCode,
        allowedActions: permission.allowedActions,
        sectionPermissions: permission.sectionPermissions,
        isActive: permission.isActive,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load module permissions" });
  }
});


// 24. GET /platform-admin/companies/:companyId/dashboards/:roleCode/runtime
router.get("/companies/:companyId/dashboards/:roleCode/runtime", async (req, res) => {
  try {
    const dashboard = await getRuntimeDashboardDefinition(req.params.companyId, req.params.roleCode);
    return res.json({ success: true, dashboard });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load runtime dashboard definition" });
  }
});

// 25. GET /platform-admin/companies/:companyId/runtime-dashboards
router.get("/companies/:companyId/runtime-dashboards", async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).lean();
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const roleConfigs = await CompanyRoleConfig.find({ companyId: company._id, isActive: true }).sort({ roleName: 1 }).lean();
    const dashboards = [];
    for (const roleConfig of roleConfigs) {
      const dashboard = await getRuntimeDashboardDefinition(String(company._id), roleConfig.roleCode);
      dashboards.push(dashboard);
    }

    return res.json({ success: true, dashboards });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load runtime dashboards" });
  }
});


// 26. POST /platform-admin/companies/:companyId/document-templates
router.post("/companies/:companyId/document-templates", async (req, res) => {
  try {
    const template = await createCompanyDocumentTemplate(req.params.companyId, req.body || {}, req.user?.uid);
    return res.status(201).json({ success: true, template });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to create company document template" });
  }
});

// 27. GET /platform-admin/companies/:companyId/document-templates
router.get("/companies/:companyId/document-templates", async (req, res) => {
  try {
    const templates = await listCompanyDocumentTemplates(req.params.companyId, { documentType: req.query.documentType });
    return res.json({ success: true, templates });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load company document templates" });
  }
});

// 28. GET /platform-admin/companies/:companyId/document-templates/:templateId
router.get("/companies/:companyId/document-templates/:templateId", async (req, res) => {
  try {
    const template = await getCompanyDocumentTemplate(req.params.companyId, req.params.templateId);
    return res.json({ success: true, template });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load company document template" });
  }
});

// 29. PUT /platform-admin/companies/:companyId/document-templates/:templateId
router.put("/companies/:companyId/document-templates/:templateId", async (req, res) => {
  try {
    const template = await updateCompanyDocumentTemplate(req.params.companyId, req.params.templateId, req.body || {});
    return res.json({ success: true, template });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to update company document template" });
  }
});

// 30. POST /platform-admin/companies/:companyId/document-templates/apply-preset
router.post("/companies/:companyId/document-templates/apply-preset", async (req, res) => {
  try {
    const template = await applyPresetToCompany(req.params.companyId, req.body?.presetId, req.body?.isDefault, req.user?.uid);
    return res.status(201).json({ success: true, template });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to apply preset to company" });
  }
});

// 31. POST /platform-admin/document-template-presets
router.post("/document-template-presets", async (req, res) => {
  try {
    const body = req.body || {};
    const documentType = String(body.documentType || "").trim().toLowerCase();
    const templateCode = String(body.templateCode || "").trim().toLowerCase();
    const templateName = String(body.templateName || "").trim();

    if (!["invoice", "receipt"].includes(documentType)) {
      return res.status(400).json({ success: false, message: "documentType must be invoice or receipt" });
    }

    if (!templateCode || !templateName) {
      return res.status(400).json({ success: false, message: "templateCode and templateName are required" });
    }

    const preset = await DocumentTemplatePreset.create({
      documentType,
      templateCode,
      templateName,
      description: String(body.description || "").trim(),
      layoutVariant: String(body.layoutVariant || "standard").trim(),
      styleConfig: body.styleConfig && typeof body.styleConfig === "object" && !Array.isArray(body.styleConfig) ? body.styleConfig : {},
      headerConfig: body.headerConfig && typeof body.headerConfig === "object" && !Array.isArray(body.headerConfig) ? body.headerConfig : {},
      footerConfig: body.footerConfig && typeof body.footerConfig === "object" && !Array.isArray(body.footerConfig) ? body.footerConfig : {},
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return res.status(201).json({ success: true, preset });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "templateCode already exists" });
    }
    return res.status(500).json({ success: false, message: error.message || "Failed to create document template preset" });
  }
});

// 32. GET /platform-admin/document-template-presets
router.get("/document-template-presets", async (req, res) => {
  try {
    const query = {};
    if (req.query.documentType) {
      const dt = String(req.query.documentType).trim().toLowerCase();
      if (!["invoice", "receipt"].includes(dt)) {
        return res.status(400).json({ success: false, message: "documentType must be invoice or receipt" });
      }
      query.documentType = dt;
    }

    const presets = await DocumentTemplatePreset.find(query).sort({ documentType: 1, createdAt: -1 }).lean();
    return res.json({ success: true, presets });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to load document template presets" });
  }
});

// 33. GET /platform-admin/document-template-presets/:presetId
router.get("/document-template-presets/:presetId", async (req, res) => {
  try {
    const preset = await DocumentTemplatePreset.findById(req.params.presetId).lean();
    if (!preset) return res.status(404).json({ success: false, message: "Preset not found" });
    return res.json({ success: true, preset });
  } catch (_error) {
    return res.status(400).json({ success: false, message: "Invalid preset id" });
  }
});

// 34. PUT /platform-admin/document-template-presets/:presetId
router.put("/document-template-presets/:presetId", async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {
      documentType: body.documentType !== undefined ? String(body.documentType || "").trim().toLowerCase() : undefined,
      templateCode: body.templateCode !== undefined ? String(body.templateCode || "").trim().toLowerCase() : undefined,
      templateName: body.templateName !== undefined ? String(body.templateName || "").trim() : undefined,
      description: body.description !== undefined ? String(body.description || "").trim() : undefined,
      layoutVariant: body.layoutVariant !== undefined ? String(body.layoutVariant || "").trim() : undefined,
      styleConfig: body.styleConfig,
      headerConfig: body.headerConfig,
      footerConfig: body.footerConfig,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    };

    if (updates.documentType !== undefined && !["invoice", "receipt"].includes(updates.documentType)) {
      return res.status(400).json({ success: false, message: "documentType must be invoice or receipt" });
    }

    if (updates.styleConfig !== undefined && (typeof updates.styleConfig !== "object" || Array.isArray(updates.styleConfig) || !updates.styleConfig)) {
      return res.status(400).json({ success: false, message: "styleConfig must be an object" });
    }

    if (updates.headerConfig !== undefined && (typeof updates.headerConfig !== "object" || Array.isArray(updates.headerConfig) || !updates.headerConfig)) {
      return res.status(400).json({ success: false, message: "headerConfig must be an object" });
    }

    if (updates.footerConfig !== undefined && (typeof updates.footerConfig !== "object" || Array.isArray(updates.footerConfig) || !updates.footerConfig)) {
      return res.status(400).json({ success: false, message: "footerConfig must be an object" });
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    const preset = await DocumentTemplatePreset.findByIdAndUpdate(req.params.presetId, updates, {
      new: true,
      runValidators: true,
    });

    if (!preset) return res.status(404).json({ success: false, message: "Preset not found" });
    return res.json({ success: true, preset });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "templateCode already exists" });
    }
    return res.status(500).json({ success: false, message: "Failed to update document template preset" });
  }
});

module.exports = router;
