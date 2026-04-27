const Company = require("../../models/Company");
const User = require("../../models/User");
const Role = require("../../models/Role");
const PortalModule = require("../../models/PortalModule");
const ErpTemplate = require("../erp-templates/erpTemplate.model");
const SubscriptionPlan = require("../subscriptions/subscriptionPlan.model");
const CompanySubscription = require("../subscriptions/companySubscription.model");
const ModuleAccessConfig = require("../../models/ModuleAccessConfig");
const { ensureDefaultTemplates } = require("../erp-templates/erpTemplate.service");
const { ensureDefaultModules, listModules } = require("../portal-modules/portalModule.service");
const { ensureDefaultSubscriptionPlans, upsertCompanySubscription } = require("../subscriptions/subscription.service");

function normalizeCompanyId(company) {
  return String(company?.companyId || company?._id || "").trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function withWildcardModules(modules = []) {
  const keys = normalizeList(modules);
  return keys.includes("*") ? ["*"] : keys;
}

async function seedSaasDefaults() {
  await ensureDefaultTemplates();
  await ensureDefaultModules();
  await ensureDefaultSubscriptionPlans();

  const templateCount = await ErpTemplate.countDocuments();
  const moduleCount = await PortalModule.countDocuments();
  const planCount = await SubscriptionPlan.countDocuments();

  return { templateCount, moduleCount, planCount };
}

async function getOverview() {
  await seedSaasDefaults();

  const [
    companies,
    users,
    roles,
    modules,
    templates,
    plans,
    subscriptions,
  ] = await Promise.all([
    Company.find({}).select("companyId name status erpTemplateKey businessType enabledModules subscription createdAt updatedAt").lean(),
    User.find({}).select("companyId role portalType status mobileAccess").lean(),
    Role.countDocuments({}),
    PortalModule.find({}).select("key status webEnabled mobileEnabled category").lean(),
    ErpTemplate.find({}).select("key name status").lean(),
    SubscriptionPlan.find({}).select("key name status userLimit moduleLimit mobileUserLimit").lean(),
    CompanySubscription.find({}).select("companyId planKey status userLimit moduleLimit mobileUserLimit allowedModules expiresAt").lean(),
  ]);

  const subscriptionByCompany = new Map(subscriptions.map((item) => [String(item.companyId), item]));
  const usersByCompany = users.reduce((acc, user) => {
    const key = String(user.companyId || "unassigned");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const companiesWithUsage = companies.map((company) => {
    const companyId = normalizeCompanyId(company);
    const subscription = subscriptionByCompany.get(companyId) || company.subscription || {};
    const userLimit = Number(subscription.userLimit || company.subscription?.userLimit || 0);
    const userCount = Number(usersByCompany[companyId] || 0);
    const allowedModules = withWildcardModules(subscription.allowedModules || company.enabledModules || []);
    return {
      _id: company._id,
      companyId,
      name: company.name,
      status: company.status || company.subscription?.status || "active",
      erpTemplateKey: company.erpTemplateKey || company.businessType || "distribution_erp",
      planKey: subscription.planKey || company.subscription?.planKey || "starter",
      subscriptionStatus: subscription.status || company.subscription?.status || "active",
      userCount,
      userLimit,
      moduleCount: allowedModules.includes("*") ? modules.filter((m) => m.status !== "inactive").length : allowedModules.length,
      moduleLimit: Number(subscription.moduleLimit || company.subscription?.moduleLimit || 0),
      mobileUserLimit: Number(subscription.mobileUserLimit || company.subscription?.mobileUserLimit || 0),
      allowedModules,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  });

  const byTemplate = companiesWithUsage.reduce((acc, company) => {
    const key = company.erpTemplateKey || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byStatus = companiesWithUsage.reduce((acc, company) => {
    const key = company.status || "active";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    stats: {
      companies: companies.length,
      activeCompanies: companiesWithUsage.filter((c) => c.status === "active").length,
      suspendedCompanies: companiesWithUsage.filter((c) => ["suspended", "inactive"].includes(c.status)).length,
      users: users.length,
      mobileUsers: users.filter((u) => u.mobileAccess).length,
      roles,
      modules: modules.length,
      activeModules: modules.filter((m) => m.status !== "inactive" && m.webEnabled !== false).length,
      mobileModules: modules.filter((m) => m.mobileEnabled).length,
      templates: templates.length,
      plans: plans.length,
    },
    companies: companiesWithUsage.sort((a, b) => String(a.name).localeCompare(String(b.name))),
    templates,
    plans,
    byTemplate,
    byStatus,
  };
}

async function listCompanies() {
  const overview = await getOverview();
  return overview.companies;
}

async function updateCompanyControl(companyId, payload = {}, userId = null) {
  if (!companyId) throw new Error("companyId is required");
  const update = {};

  if (payload.name) update.name = String(payload.name).trim();
  if (payload.status) update.status = String(payload.status).trim();
  if (payload.erpTemplateKey) {
    update.erpTemplateKey = String(payload.erpTemplateKey).trim();
    update.businessType = update.erpTemplateKey;
  }
  if (payload.enabledModules !== undefined) update.enabledModules = withWildcardModules(payload.enabledModules);
  if (payload.systemAdminNotes !== undefined) update.systemAdminNotes = String(payload.systemAdminNotes || "");

  const company = await Company.findOneAndUpdate(
    { companyId },
    { $set: update },
    { new: true }
  );
  if (!company) throw new Error("Company not found");

  if (payload.subscription) {
    const subscription = await upsertCompanySubscription(companyId, payload.subscription, userId);
    const subscriptionMirror = {
      planKey: subscription.planKey,
      status: subscription.status,
      userLimit: subscription.userLimit,
      branchLimit: subscription.branchLimit,
      warehouseLimit: subscription.warehouseLimit,
      moduleLimit: subscription.moduleLimit,
      mobileUserLimit: subscription.mobileUserLimit,
    };
    await Company.updateOne({ companyId }, { $set: { subscription: subscriptionMirror } });
  }

  return Company.findOne({ companyId }).lean();
}

async function upsertPlan(payload = {}, userId = null) {
  const key = String(payload.key || payload.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!key) throw new Error("Plan key is required");
  const doc = {
    key,
    name: String(payload.name || key).trim(),
    description: String(payload.description || "").trim(),
    monthlyPrice: Number(payload.monthlyPrice || 0),
    userLimit: Number(payload.userLimit || 25),
    branchLimit: Number(payload.branchLimit || 1),
    warehouseLimit: Number(payload.warehouseLimit || 1),
    moduleLimit: Number(payload.moduleLimit || 10),
    mobileUserLimit: Number(payload.mobileUserLimit || 5),
    allowedModules: withWildcardModules(payload.allowedModules || []),
    status: payload.status || "active",
    updatedBy: userId,
  };
  return SubscriptionPlan.findOneAndUpdate({ key }, doc, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function getCompanyLimits(companyId) {
  if (!companyId) throw new Error("companyId is required");
  const [company, subscription, userCount, mobileUserCount, moduleAccess, modules] = await Promise.all([
    Company.findOne({ companyId }).lean(),
    CompanySubscription.findOne({ companyId }).lean(),
    User.countDocuments({ companyId }),
    User.countDocuments({ companyId, mobileAccess: true }),
    ModuleAccessConfig.findOne({ companyId }).lean(),
    listModules({ status: "active" }),
  ]);
  if (!company) throw new Error("Company not found");
  const effectiveSubscription = subscription || company.subscription || {};
  const allowedModules = withWildcardModules(effectiveSubscription.allowedModules || company.enabledModules || []);
  return {
    company,
    subscription: effectiveSubscription,
    usage: {
      users: userCount,
      mobileUsers: mobileUserCount,
      modules: allowedModules.includes("*") ? modules.length : allowedModules.length,
    },
    limits: {
      users: Number(effectiveSubscription.userLimit || 0),
      mobileUsers: Number(effectiveSubscription.mobileUserLimit || 0),
      modules: Number(effectiveSubscription.moduleLimit || 0),
      branches: Number(effectiveSubscription.branchLimit || 0),
      warehouses: Number(effectiveSubscription.warehouseLimit || 0),
    },
    moduleAccess,
    availableModules: modules,
    allowedModules,
  };
}

module.exports = {
  seedSaasDefaults,
  getOverview,
  listCompanies,
  updateCompanyControl,
  upsertPlan,
  getCompanyLimits,
};
