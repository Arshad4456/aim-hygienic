const Company = require("../../companies/models/Company");
const User = require("../../users/models/User");
const Role = require("../../roles/models/Role");
const PortalModule = require("../../portal-modules/models/PortalModule");
const ErpTemplate = require("../../erp-types/models/erpTemplate.model");
const SubscriptionPlan = require("../../subscriptions/models/subscriptionPlan.model");
const CompanySubscription = require("../../subscriptions/models/companySubscription.model");
const ModuleAccessConfig = require("../../access/models/ModuleAccessConfig");
const { ensureDefaultTemplates } = require("../../erp-types/services/erpTemplate.service");
const { ensureDefaultModules, listModules, upsertModule } = require("../../portal-modules/services/portalModule.service");
const { seedDefaultRoles } = require("../../roles/services/role.service");
const { ERP_MODULE_SETS } = require("../../permissions/utils/permission.constants");
const { ensureDefaultSubscriptionPlans, upsertCompanySubscription } = require("../../subscriptions/services/subscription.service");
const { hashPassword } = require("../../auth/utils/passwordHash");
const { ensureDatabaseExists, toTenantDatabaseName } = require("../../tenancy/utils/tenantDatabases");
const { createUserInTenant } = require("../../tenancy/utils/tenantUsers");
const { APP_BRAND } = require("../../../../config/brand");
const { buildCompanyAccessContext } = require("../../access/permissions/companyAccessGuard");

function text(value) { return String(value || "").trim(); }
function lower(value) { return text(value).toLowerCase(); }
function normalizeCompanyId(company) { return text(company?.companyId || company?._id); }
function normalizeList(value) { if (Array.isArray(value)) return value.filter(Boolean).map((item) => text(item)).filter(Boolean); if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean); return []; }
function withWildcardModules(modules = []) { const keys = normalizeList(modules); return keys.includes("*") ? ["*"] : keys; }
function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function sanitizeUser(user = {}) { const plain = typeof user.toObject === "function" ? user.toObject() : { ...(user || {}) }; delete plain.passwordHash; delete plain.password; return plain; }
function slugify(value, fallback = "client") { return text(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback; }
function planKeyFrom(payload = {}) { return lower(payload.planKey || payload.key || payload.name).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }

async function seedSaasDefaults() {
  await ensureDefaultTemplates();
  await ensureDefaultModules();
  await ensureDefaultSubscriptionPlans();
  const [templateCount, moduleCount, planCount] = await Promise.all([
    ErpTemplate.countDocuments(),
    PortalModule.countDocuments(),
    SubscriptionPlan.countDocuments(),
  ]);
  return { templateCount, moduleCount, planCount };
}

async function getOverview() {
  await seedSaasDefaults();
  const [companies, users, roles, modules, templates, plans, subscriptions, moduleAccessConfigs] = await Promise.all([
    Company.find({}).select("companyId name email phone1 phone2 mainOfficeAddress status erpTemplateKey businessType enabledModules subscription systemAdminNotes createdAt updatedAt activatedAt suspendedAt suspensionReason").lean(),
    User.find({}).select("companyId role roleKey portalType status mobileAccess createdAt").lean(),
    Role.countDocuments({}),
    PortalModule.find({}).select("key name category path status webEnabled mobileEnabled allowedErpTemplates actions order description").sort({ order: 1 }).lean(),
    ErpTemplate.find({}).select("key name status modules enabledModules").lean(),
    SubscriptionPlan.find({}).select("key name description status monthlyPrice userLimit branchLimit warehouseLimit moduleLimit mobileUserLimit allowedModules").sort({ monthlyPrice: 1, name: 1 }).lean(),
    CompanySubscription.find({}).select("companyId planKey status userLimit branchLimit warehouseLimit moduleLimit mobileUserLimit allowedModules expiresAt startsAt notes updatedAt").lean(),
    ModuleAccessConfig.find({}).select("companyId modules updatedAt").lean(),
  ]);

  const subscriptionByCompany = new Map(subscriptions.map((item) => [String(item.companyId), item]));
  const moduleAccessByCompany = new Map(moduleAccessConfigs.map((item) => [String(item.companyId), item]));
  const usersByCompany = users.reduce((acc, user) => { const key = String(user.companyId || "unassigned"); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const mobileUsersByCompany = users.reduce((acc, user) => { if (!user.mobileAccess) return acc; const key = String(user.companyId || "unassigned"); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const activeModuleCount = modules.filter((m) => m.status !== "inactive" && m.webEnabled !== false).length;

  const companiesWithUsage = await Promise.all(companies.map(async (company) => {
    const companyId = normalizeCompanyId(company);
    const fallbackSubscription = subscriptionByCompany.get(companyId) || company.subscription || {};
    const context = await buildCompanyAccessContext(companyId).catch(() => null);
    const subscription = context?.subscription || fallbackSubscription;
    const usage = context?.usage || { users: number(usersByCompany[companyId], 0), mobileUsers: number(mobileUsersByCompany[companyId], 0), branches: 0, warehouses: 0, modules: 0 };
    const limits = context?.limits || {};
    const allowedModules = context?.allowedModules || withWildcardModules(subscription.allowedModules?.length ? subscription.allowedModules : company.enabledModules || []);
    return {
      _id: company._id,
      companyId,
      name: company.name,
      email: company.email,
      phone1: company.phone1,
      phone2: company.phone2,
      mainOfficeAddress: company.mainOfficeAddress,
      status: company.status || subscription.status || "active",
      erpTemplateKey: context?.erpTemplateKey || company.erpTemplateKey || company.businessType || "distribution_erp",
      planKey: subscription.planKey || company.subscription?.planKey || "starter",
      subscriptionStatus: subscription.status || company.subscription?.status || "active",
      userCount: usage.users || 0,
      activeUserCount: usage.activeUsers || usage.users || 0,
      userLimit: number(limits.users ?? subscription.userLimit ?? company.subscription?.userLimit, 0),
      branchCount: usage.branches || 0,
      branchLimit: number(limits.branches ?? subscription.branchLimit ?? company.subscription?.branchLimit, 0),
      warehouseCount: usage.warehouses || 0,
      warehouseLimit: number(limits.warehouses ?? subscription.warehouseLimit ?? company.subscription?.warehouseLimit, 0),
      mobileUserCount: usage.mobileUsers || 0,
      mobileUserLimit: number(limits.mobileUsers ?? subscription.mobileUserLimit ?? company.subscription?.mobileUserLimit, 0),
      moduleCount: usage.modules || (allowedModules.includes("*") ? activeModuleCount : allowedModules.length),
      moduleLimit: number(limits.modules ?? subscription.moduleLimit ?? company.subscription?.moduleLimit, 0),
      allowedModules,
      moduleAccess: moduleAccessByCompany.get(companyId) || null,
      systemAdminNotes: company.systemAdminNotes || subscription.notes || "",
      expiresAt: subscription.expiresAt,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      activatedAt: company.activatedAt,
      suspendedAt: company.suspendedAt,
      suspensionReason: company.suspensionReason,
    };
  }));

  const byTemplate = companiesWithUsage.reduce((acc, company) => { const key = company.erpTemplateKey || "unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const byStatus = companiesWithUsage.reduce((acc, company) => { const key = company.status || "active"; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const expiringSoon = companiesWithUsage.filter((company) => company.expiresAt && new Date(company.expiresAt).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 15).length;

  return {
    stats: {
      companies: companies.length,
      activeCompanies: companiesWithUsage.filter((c) => c.status === "active").length,
      suspendedCompanies: companiesWithUsage.filter((c) => ["suspended", "inactive"].includes(c.status)).length,
      trialCompanies: companiesWithUsage.filter((c) => c.status === "trial").length,
      expiringSoon,
      users: users.length,
      mobileUsers: users.filter((u) => u.mobileAccess).length,
      roles,
      modules: modules.length,
      activeModules: activeModuleCount,
      mobileModules: modules.filter((m) => m.mobileEnabled).length,
      templates: templates.length,
      plans: plans.length,
    },
    companies: companiesWithUsage.sort((a, b) => String(a.name).localeCompare(String(b.name))),
    modules,
    templates,
    plans,
    byTemplate,
    byStatus,
  };
}

async function listCompanies() { const overview = await getOverview(); return overview.companies; }

async function createClientCompany(payload = {}, actor = {}) {
  await seedSaasDefaults();
  const companyId = text(payload.companyId || payload.code).toUpperCase().replace(/[^A-Z0-9_-]+/g, "");
  const name = text(payload.name || payload.companyName);
  if (!companyId) throw new Error("Company ID is required");
  if (!name) throw new Error("Company name is required");
  const exists = await Company.findOne({ companyId }).lean();
  if (exists) throw new Error("Company ID already exists");
  const planKey = planKeyFrom(payload.subscription || payload) || "starter";
  const plan = await SubscriptionPlan.findOne({ key: planKey }).lean();
  const enabledModules = withWildcardModules(payload.enabledModules || payload.allowedModules || plan?.allowedModules || []);
  const status = text(payload.status || payload.subscription?.status || "trial") || "trial";
  const erpTemplateKey = text(payload.erpTemplateKey || payload.businessType || "distribution_erp");
  const slug = slugify(payload.slug || companyId || name);

  const subscriptionMirror = {
    planKey,
    status,
    userLimit: number(payload.userLimit ?? payload.subscription?.userLimit ?? plan?.userLimit, 25),
    branchLimit: number(payload.branchLimit ?? payload.subscription?.branchLimit ?? plan?.branchLimit, 1),
    warehouseLimit: number(payload.warehouseLimit ?? payload.subscription?.warehouseLimit ?? plan?.warehouseLimit, 1),
    moduleLimit: number(payload.moduleLimit ?? payload.subscription?.moduleLimit ?? plan?.moduleLimit, 10),
    mobileUserLimit: number(payload.mobileUserLimit ?? payload.subscription?.mobileUserLimit ?? plan?.mobileUserLimit, 5),
    allowedModules: enabledModules,
    expiresAt: payload.expiresAt || payload.subscription?.expiresAt || undefined,
  };

  const company = await Company.create({
    companyId,
    slug,
    name,
    phone1: text(payload.phone1 || payload.phone || payload.mobile),
    phone2: text(payload.phone2 || payload.whatsapp),
    email: lower(payload.email),
    mainOfficeAddress: text(payload.mainOfficeAddress || payload.address),
    erpTemplateKey,
    businessType: erpTemplateKey,
    enabledModules,
    status,
    systemName: APP_BRAND.name,
    subscription: subscriptionMirror,
    systemAdminNotes: text(payload.systemAdminNotes || payload.notes),
    activatedAt: status === "active" ? new Date() : undefined,
    createdBy: actor.uid || actor._id,
  });

  await upsertCompanySubscription(companyId, { ...subscriptionMirror, notes: text(payload.systemAdminNotes || payload.notes) }, actor.uid || actor._id || null);
  await ModuleAccessConfig.findOneAndUpdate({ companyId }, { companyId, modules: enabledModules, updatedBy: actor.uid || actor._id || null }, { upsert: true, new: true });
  await seedDefaultRoles({ companyId, erpTemplateKey }).catch(() => null);

  await Promise.all([
    ensureDatabaseExists("system-admin").catch(() => null),
    ensureDatabaseExists(toTenantDatabaseName(name, companyId)).catch(() => null),
  ]);

  if (payload.adminFullName && (payload.adminMobile || payload.adminEmail || payload.adminUsername) && payload.adminPassword) {
    await createCompanyAdminUser(company, payload, actor).catch(() => null);
  }

  return company.toObject();
}

async function updateCompanyControl(companyId, payload = {}, userId = null) {
  if (!companyId) throw new Error("companyId is required");
  const update = {};
  if (payload.name) update.name = text(payload.name);
  if (payload.email !== undefined) update.email = lower(payload.email);
  if (payload.phone1 !== undefined) update.phone1 = text(payload.phone1);
  if (payload.phone2 !== undefined) update.phone2 = text(payload.phone2);
  if (payload.mainOfficeAddress !== undefined) update.mainOfficeAddress = text(payload.mainOfficeAddress);
  if (payload.status) {
    update.status = text(payload.status);
    if (update.status === "active") update.activatedAt = new Date();
    if (update.status === "suspended") update.suspendedAt = new Date();
  }
  if (payload.suspensionReason !== undefined) update.suspensionReason = text(payload.suspensionReason);
  if (payload.erpTemplateKey) { update.erpTemplateKey = text(payload.erpTemplateKey); update.businessType = update.erpTemplateKey; }
  if (payload.enabledModules !== undefined) update.enabledModules = withWildcardModules(payload.enabledModules);
  if (payload.allowedModules !== undefined && payload.enabledModules === undefined) update.enabledModules = withWildcardModules(payload.allowedModules);
  if (payload.systemAdminNotes !== undefined) update.systemAdminNotes = text(payload.systemAdminNotes);

  const company = await Company.findOneAndUpdate({ companyId }, { $set: update }, { new: true, runValidators: true });
  if (!company) throw new Error("Company not found");

  const subscriptionPayload = { ...(payload.subscription || {}) };
  ["planKey", "status", "userLimit", "branchLimit", "warehouseLimit", "moduleLimit", "mobileUserLimit", "allowedModules", "expiresAt", "notes"].forEach((key) => {
    if (payload[key] !== undefined && subscriptionPayload[key] === undefined) subscriptionPayload[key] = payload[key];
  });
  if (Object.keys(subscriptionPayload).length) {
    const subscription = await upsertCompanySubscription(companyId, subscriptionPayload, userId);
    const subscriptionMirror = {
      planKey: subscription.planKey,
      status: subscription.status,
      userLimit: subscription.userLimit,
      branchLimit: subscription.branchLimit,
      warehouseLimit: subscription.warehouseLimit,
      moduleLimit: subscription.moduleLimit,
      mobileUserLimit: subscription.mobileUserLimit,
      allowedModules: subscription.allowedModules,
      expiresAt: subscription.expiresAt,
    };
    await Company.updateOne({ companyId }, { $set: { subscription: subscriptionMirror, enabledModules: subscription.allowedModules || company.enabledModules || [] } });
    await ModuleAccessConfig.findOneAndUpdate({ companyId }, { companyId, modules: subscription.allowedModules || [], updatedBy: userId }, { upsert: true, new: true });
  } else if (update.enabledModules) {
    await ModuleAccessConfig.findOneAndUpdate({ companyId }, { companyId, modules: update.enabledModules, updatedBy: userId }, { upsert: true, new: true });
  }

  return Company.findOne({ companyId }).lean();
}

async function upsertPlan(payload = {}, userId = null) {
  const key = planKeyFrom(payload);
  if (!key) throw new Error("Plan key is required");
  const doc = {
    key,
    name: text(payload.name || key),
    description: text(payload.description),
    monthlyPrice: number(payload.monthlyPrice, 0),
    userLimit: number(payload.userLimit, 25),
    branchLimit: number(payload.branchLimit, 1),
    warehouseLimit: number(payload.warehouseLimit, 1),
    moduleLimit: number(payload.moduleLimit, 10),
    mobileUserLimit: number(payload.mobileUserLimit, 5),
    allowedModules: withWildcardModules(payload.allowedModules || []),
    status: payload.status === "inactive" ? "inactive" : "active",
    updatedBy: userId,
  };
  return SubscriptionPlan.findOneAndUpdate({ key }, doc, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
}

async function updateModuleControl(moduleKey, payload = {}, userId = null) {
  const key = lower(moduleKey || payload.key).replace(/[^a-z0-9_-]+/g, "-");
  if (!key) throw new Error("Module key is required");
  const existing = await PortalModule.findOne({ key }).lean();
  const doc = {
    key,
    name: text(payload.name || existing?.name || key),
    category: text(payload.category || existing?.category || "Core"),
    description: text(payload.description || existing?.description),
    path: text(payload.path || existing?.path || `/portals/${key}`),
    icon: text(payload.icon || existing?.icon || "LayoutDashboard"),
    order: number(payload.order ?? existing?.order, 1000),
    actions: normalizeList(payload.actions || existing?.actions || ["view"]),
    webEnabled: payload.webEnabled === undefined ? existing?.webEnabled !== false : Boolean(payload.webEnabled),
    mobileEnabled: payload.mobileEnabled === undefined ? Boolean(existing?.mobileEnabled) : Boolean(payload.mobileEnabled),
    allowedErpTemplates: normalizeList(payload.allowedErpTemplates || existing?.allowedErpTemplates || ["distribution_erp"]),
    status: payload.status === "inactive" ? "inactive" : "active",
    updatedBy: userId,
  };
  return upsertModule(doc);
}

async function getCompanyLimits(companyId) {
  if (!companyId) throw new Error("companyId is required");
  const context = await buildCompanyAccessContext(companyId);
  const modules = await listModules({ status: "active" });
  return {
    company: context.company,
    subscription: context.subscription,
    usage: context.usage,
    limits: context.limits,
    percent: context.percent,
    moduleAccess: context.moduleAccess,
    availableModules: modules,
    allowedModules: context.allowedModules,
  };
}

async function createSystemAdminUser(payload = {}, actor = {}) {
  const fullName = text(payload.fullName || payload.name);
  const username = lower(payload.username || payload.mobile || payload.email);
  const mobile = text(payload.mobile || payload.mobileNumber);
  const email = lower(payload.email);
  const password = text(payload.password || payload.initialPassword);
  if (!fullName) throw new Error("System admin full name is required");
  if (!username && !mobile) throw new Error("Username or mobile is required");
  if (!password || password.length < 4) throw new Error("Initial password must be at least 4 characters");
  await seedSaasDefaults();
  let role = await Role.findOne({ companyId: "", key: "super_admin" });
  if (!role) role = await Role.create({ companyId: "", erpTemplateKey: "distribution_erp", name: "Super Admin", key: "super_admin", description: "Rawyan ERP SaaS owner role with full system access", portalType: "system_admin", permissions: { "*": { actions: ["*"], scope: "all" } }, enabledModules: ["*"], landingPath: "/portals/system-admin", mobileAccess: false, mobileModules: [], isSystemRole: true, status: "active", createdBy: actor.uid || actor._id || "bootstrap" });
  const duplicateFilters = [];
  if (username) duplicateFilters.push({ username });
  if (mobile) duplicateFilters.push({ mobile }, { mobileNumber: mobile });
  if (email) duplicateFilters.push({ email });
  if (duplicateFilters.length) { const exists = await User.findOne({ $or: duplicateFilters }).lean(); if (exists) throw new Error("A system user with this username/mobile/email already exists"); }
  const user = await User.create({ fullName, username: username || mobile, mobile, mobileNumber: mobile, email, passwordHash: await hashPassword(password), role: "System Admin", roleId: role._id, roleKey: "super_admin", portalType: "system_admin", landingPath: "/portals/system-admin", permissions: { "*": { actions: ["*"], scope: "all" } }, enabledModules: ["*"], mobileAccess: false, status: "active", userId: text(payload.userId || `SYS-${Date.now().toString().slice(-8)}`), erpTemplateKey: "distribution_erp" });
  return sanitizeUser(user);
}

async function createCompanyAdminUser(company = {}, payload = {}, actor = {}) {
  const fullName = text(payload.adminFullName);
  const username = lower(payload.adminUsername || payload.adminMobile || payload.adminEmail);
  const mobile = text(payload.adminMobile);
  const email = lower(payload.adminEmail);
  const password = text(payload.adminPassword);
  if (!fullName || !password || (!username && !mobile)) return null;
  const companyId = text(company.companyId);
  const erpTemplateKey = text(company.erpTemplateKey || company.businessType || "distribution_erp");
  const moduleKeys = ERP_MODULE_SETS[erpTemplateKey] || ERP_MODULE_SETS.distribution_erp || [];
  const adminActions = ["view", "create", "edit", "delete", "approve", "reject", "export", "print", "assign", "track"];
  const permissions = moduleKeys.reduce((acc, key) => {
    acc[key] = { actions: adminActions, scope: "company" };
    return acc;
  }, {});
  const document = {
    fullName,
    username: username || mobile,
    mobile,
    mobileNumber: mobile,
    email,
    passwordHash: await hashPassword(password),
    role: "Company Admin",
    roleKey: "company_admin",
    portalType: "company_admin",
    landingPath: "/portals",
    permissions,
    enabledModules: moduleKeys,
    mobileAccess: true,
    mobileModules: moduleKeys.filter((key) => !["finance", "settings", "system-admin"].includes(key)),
    status: "active",
    userId: `CADMIN-${Date.now().toString().slice(-8)}`,
    companyId,
    companyName: text(company.name),
    erpTemplateKey,
  };
  const created = await createUserInTenant(document);
  return sanitizeUser(created);
}

async function bootstrapSystemAdmin(payload = {}) {
  const existingCount = await User.countDocuments({ $or: [{ role: { $in: ["Admin", "admin", "System Admin", "Super Admin"] } }, { portalType: "system_admin" }, { roleKey: "super_admin" }] });
  const configuredKey = text(process.env.SYSTEM_ADMIN_BOOTSTRAP_KEY);
  const providedKey = text(payload.bootstrapKey || payload.key);
  if (existingCount > 0 && (!configuredKey || configuredKey !== providedKey)) throw new Error("System admin already exists. Use System Admin portal to create another one.");
  if (configuredKey && configuredKey !== providedKey) throw new Error("Invalid bootstrap key");
  return createSystemAdminUser(payload, { uid: "bootstrap" });
}

module.exports = {
  seedSaasDefaults,
  getOverview,
  listCompanies,
  createClientCompany,
  updateCompanyControl,
  upsertPlan,
  updateModuleControl,
  getCompanyLimits,
  createSystemAdminUser,
  bootstrapSystemAdmin,
};
