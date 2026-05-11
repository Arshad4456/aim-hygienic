const SubscriptionPlan = require("../models/subscriptionPlan.model");
const CompanySubscription = require("../models/companySubscription.model");
const { DEFAULT_SUBSCRIPTION_PLANS } = require("../utils/subscription.constants");

async function ensureDefaultSubscriptionPlans() {
  for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
    await SubscriptionPlan.updateOne({ key: plan.key }, { $setOnInsert: plan }, { upsert: true });
  }
}

async function listPlans() {
  await ensureDefaultSubscriptionPlans();
  return SubscriptionPlan.find({ status: "active" }).sort({ monthlyPrice: 1, userLimit: 1 }).lean();
}

async function upsertCompanySubscription(companyId, payload = {}, userId = null) {
  if (!companyId) throw new Error("companyId is required");
  const planKey = String(payload.planKey || "starter").trim().toLowerCase();
  const plan = await SubscriptionPlan.findOne({ key: planKey }).lean();
  const limits = plan || {};
  const update = {
    companyId,
    planKey,
    status: payload.status || "active",
    expiresAt: payload.expiresAt || undefined,
    userLimit: payload.userLimit ?? limits.userLimit ?? 25,
    branchLimit: payload.branchLimit ?? limits.branchLimit ?? 1,
    warehouseLimit: payload.warehouseLimit ?? limits.warehouseLimit ?? 1,
    moduleLimit: payload.moduleLimit ?? limits.moduleLimit ?? 10,
    mobileUserLimit: payload.mobileUserLimit ?? limits.mobileUserLimit ?? 5,
    allowedModules: payload.allowedModules || limits.allowedModules || [],
    notes: payload.notes || "",
    updatedBy: userId,
  };
  return CompanySubscription.findOneAndUpdate(
    { companyId },
    { $set: update, $setOnInsert: { createdBy: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
}

module.exports = { ensureDefaultSubscriptionPlans, listPlans, upsertCompanySubscription };
