const Company = require("../../models/Company");

function buildAuditContext(req) {
  return {
    actorUserId: req.user?.uid || req.user?._id,
    actorName: String(req.user?.username || req.user?.name || "").trim(),
    actorRole: String(req.user?.role || "").trim(),
    ipAddress: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim(),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function fireAndForgetAudit(promise) {
  Promise.resolve(promise).catch(() => undefined);
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

module.exports = { buildAuditContext, fireAndForgetAudit, ensureCompanyOrThrow, slugify };
