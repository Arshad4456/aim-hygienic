const express = require("express");
const Company = require("../models/Company");
const CompanySettings = require("../models/CompanySettings");
const HierarchyTemplate = require("../models/HierarchyTemplate");
const RoleTemplate = require("../models/RoleTemplate");
const ModuleTemplate = require("../models/ModuleTemplate");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const DocumentTemplatePreset = require("../models/DocumentTemplatePreset");
const CompanyOnboardingState = require("../models/CompanyOnboardingState");
const CompanyHierarchyConfig = require("../models/CompanyHierarchyConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");
const CompanyRoleModuleConfig = require("../models/CompanyRoleModuleConfig");
const CompanyRoleModulePermission = require("../models/CompanyRoleModulePermission");
const CompanyDocumentTemplate = require("../models/CompanyDocumentTemplate");
const CompanySetupTemplate = require("../models/CompanySetupTemplate");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
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
const {
  createSetupTemplateFromCompany,
  applySetupTemplateToCompany,
  cloneCompanyConfiguration,
} = require("../services/companySetupTemplateService");
const {
  getCurrentCompanySubscription,
  getLifecycleStatusFromSubscriptionStatus,
} = require("../services/subscriptionLifecycleService");

const router = express.Router();

router.use(requireSuperAdmin);



const ONBOARDING_STEP_KEYS = [
  "companyCreated",
  "settingsConfigured",
  "hierarchyAssigned",
  "rolesAssigned",
  "dashboardsGenerated",
  "modulesAssigned",
  "permissionsConfigured",
  "documentTemplatesConfigured",
  "setupCompleted",
];

const REQUIRED_COMPLETION_KEYS = ONBOARDING_STEP_KEYS.filter((key) => key !== "setupCompleted");

function summarizeOnboardingState(state) {
  const steps = state?.steps || {};
  const completedCount = REQUIRED_COMPLETION_KEYS.filter((key) => steps[key]).length;
  const pending = REQUIRED_COMPLETION_KEYS.filter((key) => !steps[key]);

  return {
    totalRequired: REQUIRED_COMPLETION_KEYS.length,
    completedCount,
    pendingCount: pending.length,
    pendingSteps: pending,
    isComplete: Boolean(steps.setupCompleted),
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getMaxAllowedStepFromState(state) {
  const steps = state?.steps || {};
  if (!steps.settingsConfigured) return 2;
  if (!steps.hierarchyAssigned) return 3;
  if (!steps.rolesAssigned) return 4;
  if (!steps.dashboardsGenerated) return 5;
  if (!steps.modulesAssigned) return 6;
  if (!steps.permissionsConfigured) return 7;
  if (!steps.documentTemplatesConfigured) return 8;
  return 9;
}

async function ensureCompanyOrThrow(companyId) {
  const company = await Company.findById(companyId).lean();
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }
  return company;
}

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


// 4.1 GET /platform-admin/companies/:id/settings
router.get("/companies/:id/settings", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ ok: false, message: "Company not found" });

    const settings = await CompanySettings.findOne({ companyId: req.params.id }).lean();
    if (!settings) return res.status(404).json({ ok: false, message: "Company settings not found" });

    return res.json({ ok: true, settings });
  } catch (_error) {
    return res.status(400).json({ ok: false, message: "Invalid company id" });
  }
});

// 4.2 PUT /platform-admin/companies/:id/settings
router.put("/companies/:id/settings", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ ok: false, message: "Company not found" });

    const body = req.body || {};
    const updates = {
      appName: body.appName !== undefined ? String(body.appName || "").trim() : undefined,
      logoUrl: body.logoUrl !== undefined ? String(body.logoUrl || "").trim() : undefined,
      primaryColor: body.primaryColor !== undefined ? String(body.primaryColor || "").trim() : undefined,
      invoiceHeader: body.invoiceHeader !== undefined ? String(body.invoiceHeader || "").trim() : undefined,
      invoiceFooter: body.invoiceFooter !== undefined ? String(body.invoiceFooter || "").trim() : undefined,
      receiptHeader: body.receiptHeader !== undefined ? String(body.receiptHeader || "").trim() : undefined,
      receiptFooter: body.receiptFooter !== undefined ? String(body.receiptFooter || "").trim() : undefined,
      modules: body.modules !== undefined ? (isObject(body.modules) ? body.modules : {}) : undefined,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    const settings = await CompanySettings.findOneAndUpdate(
      { companyId: req.params.id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await Company.findByIdAndUpdate(req.params.id, {
      $set: {
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        onboardingStatus: "in_progress",
      },
    });

    return res.json({ ok: true, settings });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to update company settings" });
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


// 35. POST /platform-admin/companies/:companyId/onboarding/start
router.post("/companies/:companyId/onboarding/start", async (req, res) => {
  try {
    const company = await ensureCompanyOrThrow(req.params.companyId);

    const onboardingState = await CompanyOnboardingState.findOneAndUpdate(
      { companyId: company._id },
      {
        $setOnInsert: {
          companyId: company._id,
          startedBy: req.user?.uid,
        },
        $set: {
          currentStep: 1,
          "steps.companyCreated": true,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    await Company.findByIdAndUpdate(company._id, { $set: { onboardingStatus: "in_progress" } });

    return res.json({ success: true, onboardingState, summary: summarizeOnboardingState(onboardingState) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to initialize onboarding" });
  }
});

// 36. GET /platform-admin/companies/:companyId/onboarding
router.get("/companies/:companyId/onboarding", async (req, res) => {
  try {
    const company = await ensureCompanyOrThrow(req.params.companyId);

    const onboardingState = await CompanyOnboardingState.findOne({ companyId: company._id }).lean();
    if (!onboardingState) {
      return res.status(404).json({ success: false, message: "Onboarding not started for this company" });
    }

    return res.json({ success: true, onboardingState, summary: summarizeOnboardingState(onboardingState) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load onboarding state" });
  }
});

// 37. PUT /platform-admin/companies/:companyId/onboarding/step
router.put("/companies/:companyId/onboarding/step", async (req, res) => {
  try {
    const company = await ensureCompanyOrThrow(req.params.companyId);

    const state = await CompanyOnboardingState.findOne({ companyId: company._id });
    if (!state) return res.status(404).json({ success: false, message: "Onboarding not started for this company" });

    const stepKey = String(req.body?.stepKey || "").trim();
    const requestedStep = Number(req.body?.currentStep || state.currentStep || 1);

    if (!ONBOARDING_STEP_KEYS.includes(stepKey)) {
      return res.status(400).json({ success: false, message: "Invalid stepKey" });
    }

    const maxAllowed = getMaxAllowedStepFromState(state);
    if (requestedStep > maxAllowed + 1) {
      return res.status(400).json({ success: false, message: "Cannot skip required previous steps" });
    }

    state.steps[stepKey] = true;
    state.currentStep = Math.min(9, Math.max(1, requestedStep));

    await state.save();

    await Company.findByIdAndUpdate(company._id, { $set: { onboardingStatus: "in_progress" } });

    const doc = state.toObject();
    return res.json({ success: true, onboardingState: doc, summary: summarizeOnboardingState(doc) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to update onboarding step" });
  }
});

// 38. POST /platform-admin/companies/:companyId/onboarding/complete
router.post("/companies/:companyId/onboarding/complete", async (req, res) => {
  try {
    const company = await ensureCompanyOrThrow(req.params.companyId);

    const state = await CompanyOnboardingState.findOne({ companyId: company._id });
    if (!state) return res.status(404).json({ success: false, message: "Onboarding not started for this company" });

    const missing = REQUIRED_COMPLETION_KEYS.filter((key) => !state.steps?.[key]);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Cannot complete onboarding. Pending steps: ${missing.join(", ")}` });
    }

    state.steps.setupCompleted = true;
    state.currentStep = 9;
    state.completedBy = req.user?.uid || null;
    state.completedAt = new Date();
    await state.save();

    await Company.findByIdAndUpdate(company._id, {
      $set: {
        onboardingStatus: "completed",
        setupCompletedAt: new Date(),
      },
    });

    const doc = state.toObject();
    return res.json({ success: true, onboardingState: doc, summary: summarizeOnboardingState(doc) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to complete onboarding" });
  }
});

// 39. GET /platform-admin/companies/:companyId/onboarding-summary
router.get("/companies/:companyId/onboarding-summary", async (req, res) => {
  try {
    const company = await ensureCompanyOrThrow(req.params.companyId);

    const [settings, hierarchy, roles, dashboards, modules, permissions, documents, onboardingState] = await Promise.all([
      CompanySettings.findOne({ companyId: company._id }).lean(),
      CompanyHierarchyConfig.findOne({ companyId: company._id, isActive: true }).lean(),
      CompanyRoleConfig.find({ companyId: company._id, isActive: true }).sort({ roleName: 1 }).lean(),
      CompanyDashboardConfig.find({ companyId: company._id, isActive: true }).sort({ roleCode: 1 }).lean(),
      CompanyRoleModuleConfig.find({ companyId: company._id, isActive: true }).sort({ roleCode: 1, sidebarOrder: 1 }).lean(),
      CompanyRoleModulePermission.find({ companyId: company._id, isActive: true }).sort({ roleCode: 1, moduleCode: 1 }).lean(),
      CompanyDocumentTemplate.find({ companyId: company._id, isActive: true }).sort({ documentType: 1, isDefault: -1, createdAt: -1 }).lean(),
      CompanyOnboardingState.findOne({ companyId: company._id }).lean(),
    ]);

    return res.json({
      success: true,
      summary: {
        company,
        settings,
        hierarchy,
        roles,
        dashboards,
        modules,
        permissions,
        documents,
        onboardingState,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load onboarding summary" });
  }
});


// 40. POST /platform-admin/companies/:companyId/save-as-template
router.post("/companies/:companyId/save-as-template", async (req, res) => {
  try {
    const template = await createSetupTemplateFromCompany(req.params.companyId, req.body || {}, req.user?.uid);
    return res.status(201).json({
      success: true,
      template: {
        _id: template._id,
        name: template.name,
        code: template.code,
        description: template.description,
        category: template.category,
        sourceCompanyId: template.sourceCompanyId,
        isActive: template.isActive,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to save company setup as template" });
  }
});

// 41. GET /platform-admin/setup-templates
router.get("/setup-templates", async (_req, res) => {
  try {
    const templates = await CompanySetupTemplate.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, templates });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to load setup templates" });
  }
});

// 42. GET /platform-admin/setup-templates/:templateId
router.get("/setup-templates/:templateId", async (req, res) => {
  try {
    const template = await CompanySetupTemplate.findById(req.params.templateId).lean();
    if (!template) return res.status(404).json({ success: false, message: "Setup template not found" });
    return res.json({ success: true, template });
  } catch (_error) {
    return res.status(400).json({ success: false, message: "Invalid template id" });
  }
});

// 43. POST /platform-admin/companies/:companyId/apply-setup-template
router.post("/companies/:companyId/apply-setup-template", async (req, res) => {
  try {
    const result = await applySetupTemplateToCompany(
      req.params.companyId,
      req.body?.templateId,
      {
        overwriteExisting: req.body?.overwriteExisting,
        cloneBranding: req.body?.cloneBranding,
        cloneDocuments: req.body?.cloneDocuments,
      },
      req.user?.uid
    );

    return res.json({ success: true, company: result.company, applied: result.applied });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to apply setup template" });
  }
});

// 44. POST /platform-admin/companies/:targetCompanyId/clone-from-company
router.post("/companies/:targetCompanyId/clone-from-company", async (req, res) => {
  try {
    const result = await cloneCompanyConfiguration(
      req.body?.sourceCompanyId,
      req.params.targetCompanyId,
      {
        overwriteExisting: req.body?.overwriteExisting,
        cloneBranding: req.body?.cloneBranding !== false,
        cloneDocuments: req.body?.cloneDocuments !== false,
      },
      req.user?.uid
    );

    return res.json({
      success: true,
      sourceCompanyId: result.sourceCompanyId,
      targetCompanyId: result.targetCompanyId,
      applied: result.applied,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to clone company configuration" });
  }
});


function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeIncludedList(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => normalizeCode(item)).filter(Boolean)));
}

// 45. POST /platform-admin/plans
router.post("/plans", async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const code = normalizeCode(body.code);
    if (!name || !code) return res.status(400).json({ success: false, message: "name and code are required" });

    const plan = await Plan.create({
      name,
      code,
      description: String(body.description || "").trim(),
      billingType: body.billingType,
      monthlyPrice: Number(body.monthlyPrice || 0),
      yearlyPrice: Number(body.yearlyPrice || 0),
      maxUsers: Number(body.maxUsers || 0),
      maxWarehouses: Number(body.maxWarehouses || 0),
      maxVehicles: Number(body.maxVehicles || 0),
      includedModules: normalizeIncludedList(body.includedModules),
      includedFeatures: normalizeIncludedList(body.includedFeatures),
      status: body.status || "active",
      isDefault: Boolean(body.isDefault),
    });

    return res.status(201).json({ success: true, plan });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Plan code already exists" });
    return res.status(400).json({ success: false, message: error.message || "Failed to create plan" });
  }
});

// 46. GET /platform-admin/plans
router.get("/plans", async (_req, res) => {
  try {
    const plans = await Plan.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, plans });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to load plans" });
  }
});

// 47. GET /platform-admin/plans/:planId
router.get("/plans/:planId", async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.planId).lean();
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.json({ success: true, plan });
  } catch (_error) {
    return res.status(400).json({ success: false, message: "Invalid plan id" });
  }
});

// 48. PUT /platform-admin/plans/:planId
router.put("/plans/:planId", async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {
      ...(body.name !== undefined ? { name: String(body.name || "").trim() } : {}),
      ...(body.code !== undefined ? { code: normalizeCode(body.code) } : {}),
      ...(body.description !== undefined ? { description: String(body.description || "").trim() } : {}),
      ...(body.billingType !== undefined ? { billingType: body.billingType } : {}),
      ...(body.monthlyPrice !== undefined ? { monthlyPrice: Number(body.monthlyPrice || 0) } : {}),
      ...(body.yearlyPrice !== undefined ? { yearlyPrice: Number(body.yearlyPrice || 0) } : {}),
      ...(body.maxUsers !== undefined ? { maxUsers: Number(body.maxUsers || 0) } : {}),
      ...(body.maxWarehouses !== undefined ? { maxWarehouses: Number(body.maxWarehouses || 0) } : {}),
      ...(body.maxVehicles !== undefined ? { maxVehicles: Number(body.maxVehicles || 0) } : {}),
      ...(body.includedModules !== undefined ? { includedModules: normalizeIncludedList(body.includedModules) } : {}),
      ...(body.includedFeatures !== undefined ? { includedFeatures: normalizeIncludedList(body.includedFeatures) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.isDefault !== undefined ? { isDefault: Boolean(body.isDefault) } : {}),
    };

    const plan = await Plan.findByIdAndUpdate(req.params.planId, { $set: updates }, { new: true, runValidators: true }).lean();
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.json({ success: true, plan });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Plan code already exists" });
    return res.status(400).json({ success: false, message: error.message || "Failed to update plan" });
  }
});

function buildCompanyLifecycleUpdate(status) {
  const normalized = normalizeCode(status);
  const now = new Date();
  const next = { lifecycleStatus: getLifecycleStatusFromSubscriptionStatus(normalized) };
  if (next.lifecycleStatus === "active") next.activatedAt = now;
  if (next.lifecycleStatus === "suspended") next.suspendedAt = now;
  if (next.lifecycleStatus === "expired") next.expiredAt = now;
  return next;
}

// 49. POST /platform-admin/companies/:companyId/subscription
router.post("/companies/:companyId/subscription", async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).lean();
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const body = req.body || {};
    const plan = await Plan.findById(body.planId).lean();
    if (!plan || plan.status !== "active") {
      return res.status(400).json({ success: false, message: "Active plan is required" });
    }

    if (!body.startDate || !body.endDate) return res.status(400).json({ success: false, message: "startDate and endDate are required" });

    await Subscription.updateMany(
      { companyId: company._id, status: { $in: ["active", "trial", "suspended"] } },
      { $set: { status: "cancelled" } }
    );

    const subscription = await Subscription.create({
      companyId: company._id,
      planId: plan._id,
      billingCycle: body.billingCycle,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status,
      paymentStatus: body.paymentStatus || "pending",
      notes: String(body.notes || "").trim(),
      createdBy: req.user?.uid || undefined,
    });

    const companyUpdates = {
      subscriptionId: subscription._id,
      ...buildCompanyLifecycleUpdate(subscription.status),
    };

    const updatedCompany = await Company.findByIdAndUpdate(company._id, { $set: companyUpdates }, { new: true }).lean();
    const populatedSubscription = await Subscription.findById(subscription._id).populate("planId").lean();
    return res.status(201).json({ success: true, company: updatedCompany, subscription: populatedSubscription });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to assign subscription" });
  }
});

// 50. GET /platform-admin/companies/:companyId/subscription
router.get("/companies/:companyId/subscription", async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).lean();
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const subscription = await getCurrentCompanySubscription(company._id);
    return res.json({ success: true, companyId: company._id, lifecycleStatus: company.lifecycleStatus, subscription });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to load subscription" });
  }
});

async function updateCompanyAndSubscriptionLifecycle(companyId, lifecycleStatus, subscriptionStatus) {
  const now = new Date();
  const companyUpdates = { lifecycleStatus };
  if (lifecycleStatus === "active") companyUpdates.activatedAt = now;
  if (lifecycleStatus === "suspended") companyUpdates.suspendedAt = now;
  if (lifecycleStatus === "expired") companyUpdates.expiredAt = now;

  const company = await Company.findByIdAndUpdate(companyId, { $set: companyUpdates }, { new: true }).lean();
  if (!company) return null;

  if (company.subscriptionId) {
    await Subscription.findByIdAndUpdate(company.subscriptionId, { $set: { status: subscriptionStatus } });
  }

  const subscription = company.subscriptionId ? await Subscription.findById(company.subscriptionId).populate("planId").lean() : null;
  return { company, subscription };
}

// 51. POST /platform-admin/companies/:companyId/activate
router.post("/companies/:companyId/activate", async (req, res) => {
  try {
    const result = await updateCompanyAndSubscriptionLifecycle(req.params.companyId, "active", "active");
    if (!result) return res.status(404).json({ success: false, message: "Company not found" });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to activate company" });
  }
});

// 52. POST /platform-admin/companies/:companyId/suspend
router.post("/companies/:companyId/suspend", async (req, res) => {
  try {
    const result = await updateCompanyAndSubscriptionLifecycle(req.params.companyId, "suspended", "suspended");
    if (!result) return res.status(404).json({ success: false, message: "Company not found" });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to suspend company" });
  }
});

// 53. POST /platform-admin/companies/:companyId/mark-expired
router.post("/companies/:companyId/mark-expired", async (req, res) => {
  try {
    const result = await updateCompanyAndSubscriptionLifecycle(req.params.companyId, "expired", "expired");
    if (!result) return res.status(404).json({ success: false, message: "Company not found" });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to mark company expired" });
  }
});

// 54. POST /platform-admin/companies/:companyId/reactivate
router.post("/companies/:companyId/reactivate", async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).lean();
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const subscription = company.subscriptionId ? await Subscription.findById(company.subscriptionId).lean() : null;
    if (!subscription) return res.status(400).json({ success: false, message: "Company has no subscription to reactivate" });
    if (new Date(subscription.endDate) < new Date()) {
      return res.status(400).json({ success: false, message: "Subscription has expired; assign/renew subscription before reactivation" });
    }

    const nextStatus = subscription.status === "trial" ? "trial" : "active";
    await Subscription.findByIdAndUpdate(subscription._id, { $set: { status: nextStatus } });
    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      { $set: { lifecycleStatus: nextStatus, activatedAt: new Date() } },
      { new: true }
    ).lean();

    const updatedSubscription = await Subscription.findById(subscription._id).populate("planId").lean();
    return res.json({ success: true, company: updatedCompany, subscription: updatedSubscription });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to reactivate company" });
  }
});


module.exports = router;
