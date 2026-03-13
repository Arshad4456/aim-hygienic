const mongoose = require("mongoose");
const Company = require("../models/Company");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Warehouse = require("../models/Warehouse");
const Vehicle = require("../models/Vehicle");
const SalesOrder = require("../models/SalesOrder");
const Receipt = require("../models/Receipt");
const PrimaryPayment = require("../models/PrimaryPayment");
const SecondaryPayment = require("../models/SecondaryPayment");
const Expense = require("../models/Expense");
const Loan = require("../models/Loan");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");
const CompanyRoleModuleConfig = require("../models/CompanyRoleModuleConfig");
const CompanyDocumentTemplate = require("../models/CompanyDocumentTemplate");
const CompanyOnboardingState = require("../models/CompanyOnboardingState");
const CompanyUsageSnapshot = require("../models/CompanyUsageSnapshot");
const { getCurrentCompanySubscription } = require("./subscriptionLifecycleService");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function ensureCompany(companyId) {
  const conditions = [];
  const raw = String(companyId || "").trim();
  if (!raw) {
    const error = new Error("companyId is required");
    error.status = 400;
    throw error;
  }

  if (mongoose.Types.ObjectId.isValid(raw)) conditions.push({ _id: raw });
  conditions.push({ companyId: raw }, { slug: normalize(raw) });

  const company = await Company.findOne({ $or: conditions }).lean();
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }
  return company;
}

function buildLimitWarnings({ userCount, warehouseCount, vehicleCount, plan }) {
  const maxUsers = Number(plan?.maxUsers || 0);
  const maxWarehouses = Number(plan?.maxWarehouses || 0);
  const maxVehicles = Number(plan?.maxVehicles || 0);

  const usersExceeded = maxUsers > 0 && userCount > maxUsers;
  const warehousesExceeded = maxWarehouses > 0 && warehouseCount > maxWarehouses;
  const vehiclesExceeded = maxVehicles > 0 && vehicleCount > maxVehicles;

  const warnings = [];
  if (usersExceeded) warnings.push("User limit exceeded");
  if (warehousesExceeded) warnings.push("Warehouse limit exceeded");
  if (vehiclesExceeded) warnings.push("Vehicle limit exceeded");

  return {
    usersExceeded,
    warehousesExceeded,
    vehiclesExceeded,
    hasAnyLimitIssue: warnings.length > 0,
    warnings,
    limits: {
      maxUsers,
      maxWarehouses,
      maxVehicles,
    },
  };
}

async function resolveCompanyUsers(company) {
  const idStr = String(company._id);
  const companyIdStr = String(company.companyId || "").trim();
  const filters = [{ companyId: idStr }];
  if (companyIdStr) filters.push({ companyId: companyIdStr });
  return User.find({ $or: filters }).select("_id status").lean();
}

async function countVehicleByCompanyUsers(userIds) {
  if (!userIds.length) return 0;
  return Vehicle.countDocuments({ createdBy: { $in: userIds } });
}

async function getCompanyUsageSummary(companyId) {
  const company = await ensureCompany(companyId);
  const [subscription, onboardingState, users] = await Promise.all([
    getCurrentCompanySubscription(company._id),
    CompanyOnboardingState.findOne({ companyId: company._id }).lean(),
    resolveCompanyUsers(company),
  ]);

  const userIds = users.map((user) => user._id);
  const activeUserCount = users.filter((user) => normalize(user.status) === "active").length;

  const [
    warehouseCount,
    vehicleCount,
    activeRoleCount,
    activeDashboardCount,
    assignedModuleCount,
    documentTemplateCount,
    orderCount,
    receiptCount,
    primaryPaymentCount,
    secondaryPaymentCount,
    expenseCount,
    loanCount,
  ] = await Promise.all([
    Warehouse.countDocuments({ companyId: { $in: [String(company._id), String(company.companyId || "")].filter(Boolean) } }),
    countVehicleByCompanyUsers(userIds),
    CompanyRoleConfig.countDocuments({ companyId: company._id, isActive: true }),
    CompanyDashboardConfig.countDocuments({ companyId: company._id, isActive: true }),
    CompanyRoleModuleConfig.countDocuments({ companyId: company._id, isActive: true }),
    CompanyDocumentTemplate.countDocuments({ companyId: company._id, isActive: true }),
    userIds.length ? SalesOrder.countDocuments({ createdBy: { $in: userIds } }) : 0,
    userIds.length ? Receipt.countDocuments({ $or: [{ payerUserId: { $in: userIds } }, { createdByUserId: { $in: userIds } }] }) : 0,
    userIds.length ? PrimaryPayment.countDocuments({ $or: [{ createdBy: { $in: userIds } }, { distributorId: { $in: userIds } }] }) : 0,
    userIds.length ? SecondaryPayment.countDocuments({ $or: [{ createdBy: { $in: userIds } }, { distributorId: { $in: userIds } }] }) : 0,
    userIds.length ? Expense.countDocuments({ $or: [{ createdBy: { $in: userIds } }, { distributorId: { $in: userIds } }] }) : 0,
    userIds.length ? Loan.countDocuments({ createdBy: { $in: userIds } }) : 0,
  ]);

  const paymentCount = primaryPaymentCount + secondaryPaymentCount;
  const plan = subscription?.planId || null;
  const limitSummary = buildLimitWarnings({ userCount: users.length, warehouseCount, vehicleCount, plan });

  return {
    company: {
      _id: company._id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      lifecycleStatus: company.lifecycleStatus,
      onboardingStatus: company.onboardingStatus,
    },
    subscription: {
      subscriptionId: subscription?._id || null,
      status: subscription?.status || "pending",
      paymentStatus: subscription?.paymentStatus || "pending",
      billingCycle: subscription?.billingCycle || null,
      startDate: subscription?.startDate || null,
      endDate: subscription?.endDate || null,
      planId: plan?._id || null,
      planCode: plan?.code || null,
      planName: plan?.name || null,
      maxUsers: Number(plan?.maxUsers || 0),
      maxWarehouses: Number(plan?.maxWarehouses || 0),
      maxVehicles: Number(plan?.maxVehicles || 0),
    },
    onboarding: {
      completed: Boolean(onboardingState?.steps?.setupCompleted),
      state: onboardingState || null,
    },
    counts: {
      userCount: users.length,
      activeUserCount,
      warehouseCount,
      vehicleCount,
      activeRoleCount,
      activeDashboardCount,
      assignedModuleCount,
      documentTemplateCount,
      orderCount,
      receiptCount,
      paymentCount,
      expenseCount,
      loanCount,
      storageUsageBytes: 0,
    },
    limits: limitSummary,
    metadata: {
      storageUsageBytes: 0,
      storageNotes: "Placeholder until object-storage metering is integrated",
    },
  };
}

async function createCompanyUsageSnapshot(companyId) {
  const summary = await getCompanyUsageSummary(companyId);
  const snapshot = await CompanyUsageSnapshot.create({
    companyId: summary.company._id,
    snapshotDate: new Date(),
    userCount: summary.counts.userCount,
    activeUserCount: summary.counts.activeUserCount,
    warehouseCount: summary.counts.warehouseCount,
    vehicleCount: summary.counts.vehicleCount,
    activeRoleCount: summary.counts.activeRoleCount,
    activeDashboardCount: summary.counts.activeDashboardCount,
    assignedModuleCount: summary.counts.assignedModuleCount,
    orderCount: summary.counts.orderCount,
    receiptCount: summary.counts.receiptCount,
    paymentCount: summary.counts.paymentCount,
    expenseCount: summary.counts.expenseCount,
    loanCount: summary.counts.loanCount,
    storageUsageBytes: summary.counts.storageUsageBytes,
    documentTemplateCount: summary.counts.documentTemplateCount,
    onboardingCompleted: summary.onboarding.completed,
    lifecycleStatus: summary.company.lifecycleStatus || "inactive",
    subscriptionStatus: summary.subscription.status || "pending",
    planCode: summary.subscription.planCode || null,
    metadata: {
      limits: summary.limits,
      planName: summary.subscription.planName,
      billingCycle: summary.subscription.billingCycle,
    },
  });

  return snapshot.toObject();
}

async function getCompanyUsageAgainstPlan(companyId) {
  const summary = await getCompanyUsageSummary(companyId);
  return {
    company: summary.company,
    subscription: summary.subscription,
    usage: {
      users: summary.counts.userCount,
      warehouses: summary.counts.warehouseCount,
      vehicles: summary.counts.vehicleCount,
    },
    limits: summary.limits,
  };
}

async function getCompanyUsageList(filters = {}) {
  const query = {};
  const lifecycleStatus = normalize(filters.lifecycleStatus);
  if (lifecycleStatus) query.lifecycleStatus = lifecycleStatus;

  const search = String(filters.search || "").trim();
  if (search) query.name = { $regex: search, $options: "i" };

  const companies = await Company.find(query).sort({ createdAt: -1 }).lean();
  const summaries = [];

  for (const company of companies) {
    const summary = await getCompanyUsageSummary(company._id);
    summaries.push(summary);
  }

  const onboardingFilterRaw = String(filters.onboardingCompleted || "").trim().toLowerCase();
  const onboardingFilter = onboardingFilterRaw === "true" ? true : onboardingFilterRaw === "false" ? false : null;
  const planCodeFilter = normalize(filters.planCode);

  return summaries.filter((item) => {
    if (onboardingFilter !== null && item.onboarding.completed !== onboardingFilter) return false;
    if (planCodeFilter && normalize(item.subscription.planCode) !== planCodeFilter) return false;
    return true;
  });
}

async function getModuleAdoptionSummary() {
  const rows = await CompanyRoleModuleConfig.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: { moduleCode: "$moduleCode", companyId: "$companyId" } } },
    { $group: { _id: "$_id.moduleCode", companyCount: { $sum: 1 } } },
    { $project: { _id: 0, moduleCode: "$_id", companyCount: 1 } },
    { $sort: { companyCount: -1, moduleCode: 1 } },
  ]);

  return rows;
}

async function getOnboardingStatusSummary() {
  const [totalCompanies, started, completed] = await Promise.all([
    Company.countDocuments({}),
    CompanyOnboardingState.countDocuments({}),
    CompanyOnboardingState.countDocuments({ "steps.setupCompleted": true }),
  ]);

  return {
    totalCompanies,
    started,
    completed,
    incomplete: Math.max(started - completed, 0),
  };
}

async function getPlatformOverviewSummary() {
  const [
    totalCompanies,
    activeCompanies,
    trialCompanies,
    suspendedCompanies,
    expiredCompanies,
    completedOnboardingCompanies,
    totalUsersAcrossPlatform,
    totalOrdersAcrossPlatform,
    totalReceiptsAcrossPlatform,
    totalVehiclesAcrossPlatform,
    totalWarehousesAcrossPlatform,
  ] = await Promise.all([
    Company.countDocuments({}),
    Company.countDocuments({ lifecycleStatus: "active" }),
    Company.countDocuments({ lifecycleStatus: "trial" }),
    Company.countDocuments({ lifecycleStatus: "suspended" }),
    Company.countDocuments({ lifecycleStatus: "expired" }),
    CompanyOnboardingState.countDocuments({ "steps.setupCompleted": true }),
    User.countDocuments({}),
    SalesOrder.countDocuments({}),
    Receipt.countDocuments({}),
    Vehicle.countDocuments({}),
    Warehouse.countDocuments({}),
  ]);

  const incompleteOnboardingCompanies = Math.max(totalCompanies - completedOnboardingCompanies, 0);

  return {
    totalCompanies,
    activeCompanies,
    trialCompanies,
    suspendedCompanies,
    expiredCompanies,
    completedOnboardingCompanies,
    incompleteOnboardingCompanies,
    totalUsersAcrossPlatform,
    totalOrdersAcrossPlatform,
    totalReceiptsAcrossPlatform,
    totalVehiclesAcrossPlatform,
    totalWarehousesAcrossPlatform,
  };
}

async function getCompanySnapshotHistory(companyId, limit = 20) {
  const company = await ensureCompany(companyId);
  return CompanyUsageSnapshot.find({ companyId: company._id }).sort({ snapshotDate: -1 }).limit(Math.max(1, Math.min(Number(limit) || 20, 200))).lean();
}

module.exports = {
  getCompanyUsageSummary,
  createCompanyUsageSnapshot,
  getPlatformOverviewSummary,
  getCompanyUsageList,
  getCompanyUsageAgainstPlan,
  getModuleAdoptionSummary,
  getOnboardingStatusSummary,
  getCompanySnapshotHistory,
};