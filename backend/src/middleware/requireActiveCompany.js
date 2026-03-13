const User = require("../models/User");
const Company = require("../models/Company");
const { syncCompanyLifecycleWithSubscription } = require("../services/subscriptionLifecycleService");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isSuperAdminContext(reqUser, dbUser) {
  const tokenRole = normalize(reqUser?.role);
  const dbRole = normalize(dbUser?.role);
  return Boolean(reqUser?.isSuperAdmin) || Boolean(dbUser?.isSuperAdmin) || tokenRole === "super admin" || tokenRole === "superadmin" || dbRole === "super admin" || dbRole === "superadmin";
}

module.exports = async function requireActiveCompany(req, res, next) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const authUser = await User.findById(req.user.uid).lean();
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Authenticated user not found." });
    }

    if (isSuperAdminContext(req.user, authUser)) {
      return next();
    }

    const rawCompanyId = String(authUser.companyId || "").trim();
    if (!rawCompanyId) {
      return res.status(403).json({ success: false, message: "Company access is currently suspended or expired." });
    }

    const company = await Company.findOne({ $or: [{ _id: rawCompanyId }, { companyId: rawCompanyId }, { slug: normalize(rawCompanyId) }] }).lean();
    if (!company) {
      return res.status(403).json({ success: false, message: "Company access is currently suspended or expired." });
    }

    const synced = await syncCompanyLifecycleWithSubscription(company._id);
    const lifecycleStatus = normalize(synced?.lifecycleStatus || company.lifecycleStatus);
    if (lifecycleStatus === "active" || lifecycleStatus === "trial") {
      return next();
    }

    return res.status(403).json({ success: false, message: "Company access is currently suspended or expired." });
  } catch (_error) {
    return res.status(403).json({ success: false, message: "Company access is currently suspended or expired." });
  }
};
