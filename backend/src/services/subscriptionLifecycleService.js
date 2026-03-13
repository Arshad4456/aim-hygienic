const Company = require("../models/Company");
const Subscription = require("../models/Subscription");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getLifecycleStatusFromSubscriptionStatus(status) {
  const normalized = normalize(status);
  if (normalized === "active") return "active";
  if (normalized === "trial") return "trial";
  if (normalized === "suspended") return "suspended";
  if (normalized === "expired") return "expired";
  return "inactive";
}

function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  const now = new Date();
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const status = normalize(subscription.status);

  if (!endDate || Number.isNaN(endDate.getTime())) return false;
  if (endDate < now) return false;

  return status === "active" || status === "trial";
}

async function getCurrentCompanySubscription(companyId) {
  const now = new Date();
  const current = await Subscription.findOne({
    companyId,
    status: { $in: ["active", "trial", "suspended"] },
  })
    .sort({ endDate: -1, createdAt: -1 })
    .populate("planId")
    .lean();

  if (!current) {
    const fallback = await Subscription.findOne({ companyId }).sort({ endDate: -1, createdAt: -1 }).populate("planId").lean();
    return fallback || null;
  }

  if (new Date(current.endDate) < now && normalize(current.status) !== "expired") {
    await Subscription.findByIdAndUpdate(current._id, { $set: { status: "expired" } });
    return Subscription.findById(current._id).populate("planId").lean();
  }

  return current;
}

async function syncCompanyLifecycleWithSubscription(companyId) {
  const company = await Company.findById(companyId).lean();
  if (!company) return null;

  const subscription = await getCurrentCompanySubscription(companyId);
  let lifecycleStatus = normalize(company.lifecycleStatus) || "inactive";
  const updates = {};

  if (!subscription) {
    if (!["suspended", "inactive"].includes(lifecycleStatus)) {
      lifecycleStatus = "inactive";
      updates.lifecycleStatus = lifecycleStatus;
    }
  } else {
    const expiredByDate = new Date(subscription.endDate) < new Date();
    if (expiredByDate && normalize(subscription.status) !== "expired") {
      await Subscription.findByIdAndUpdate(subscription._id, { $set: { status: "expired" } });
      subscription.status = "expired";
    }

    const nextLifecycle = getLifecycleStatusFromSubscriptionStatus(subscription.status);
    if (nextLifecycle !== lifecycleStatus) {
      lifecycleStatus = nextLifecycle;
      updates.lifecycleStatus = lifecycleStatus;
    }

    updates.subscriptionId = subscription._id;

    if (lifecycleStatus === "active") updates.activatedAt = company.activatedAt || new Date();
    if (lifecycleStatus === "suspended") updates.suspendedAt = new Date();
    if (lifecycleStatus === "expired") updates.expiredAt = new Date();
  }

  if (Object.keys(updates).length) {
    await Company.findByIdAndUpdate(companyId, { $set: updates });
  }

  return {
    lifecycleStatus,
    subscription,
    companyId,
  };
}

module.exports = {
  getCurrentCompanySubscription,
  syncCompanyLifecycleWithSubscription,
  isSubscriptionActive,
  getLifecycleStatusFromSubscriptionStatus,
};