const PlatformAuditLog = require("../models/PlatformAuditLog");

function toSafeId(value) {
  if (!value) return "unknown";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
}

async function createAuditLog(payload = {}) {
  if (!payload.actorUserId || !payload.actionType || !payload.targetType || !payload.targetId || !payload.summary) {
    return null;
  }

  return PlatformAuditLog.create({
    companyId: payload.companyId || null,
    actorUserId: payload.actorUserId,
    actorName: String(payload.actorName || "").trim(),
    actorRole: String(payload.actorRole || "").trim(),
    actionType: String(payload.actionType || "").trim(),
    targetType: String(payload.targetType || "").trim(),
    targetId: toSafeId(payload.targetId),
    summary: String(payload.summary || "").trim(),
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    ipAddress: String(payload.ipAddress || "").trim(),
    userAgent: String(payload.userAgent || "").trim(),
  });
}

async function logCompanyCreated(context, company) {
  return createAuditLog({
    ...context,
    companyId: company?._id || null,
    actionType: "company_created",
    targetType: "company",
    targetId: company?._id,
    summary: `Created company ${company?.name || ""}`,
    afterSnapshot: company ? { name: company.name, slug: company.slug, status: company.status } : null,
    metadata: { companyName: company?.name || "" },
  });
}

async function logHierarchyAssigned(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: "hierarchy_assigned",
    targetType: "hierarchy_config",
    targetId: payload.targetId,
    summary: `Assigned hierarchy ${payload?.afterSnapshot?.hierarchyCode || ""} to company ${payload?.metadata?.companyName || ""}`,
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    metadata: payload.metadata || {},
  });
}

async function logRolesAssigned(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: "roles_assigned",
    targetType: "role_config",
    targetId: payload.targetId,
    summary: payload.summary || `Selected roles for company ${payload?.metadata?.companyName || ""}`,
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    metadata: payload.metadata || {},
  });
}

async function logDashboardsGenerated(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: "dashboards_generated",
    targetType: "dashboard_config",
    targetId: payload.targetId,
    summary: payload.summary || `Generated dashboards for company ${payload?.metadata?.companyName || ""}`,
    metadata: payload.metadata || {},
    afterSnapshot: payload.afterSnapshot || null,
  });
}

async function logModulesAssigned(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: "modules_assigned",
    targetType: "role_module_config",
    targetId: payload.targetId,
    summary: payload.summary || "Assigned modules",
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    metadata: payload.metadata || {},
  });
}

async function logPermissionsUpdated(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: "permissions_updated",
    targetType: "permission_config",
    targetId: payload.targetId,
    summary: payload.summary || "Updated permission configuration",
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    metadata: payload.metadata || {},
  });
}

async function logDocumentTemplateChange(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: payload.actionType || "document_template_updated",
    targetType: "document_template",
    targetId: payload.targetId,
    summary: payload.summary || "Document template changed",
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    metadata: payload.metadata || {},
  });
}

async function logSetupTemplateApplied(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: payload.actionType || "setup_template_applied",
    targetType: "setup_template",
    targetId: payload.targetId,
    summary: payload.summary || "Applied setup template",
    metadata: payload.metadata || {},
    afterSnapshot: payload.afterSnapshot || null,
  });
}

async function logCompanyLifecycleChange(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: payload.actionType,
    targetType: "company",
    targetId: payload.targetId,
    summary: payload.summary,
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    metadata: payload.metadata || {},
  });
}

async function logSubscriptionAssigned(context, payload = {}) {
  return createAuditLog({
    ...context,
    companyId: payload.companyId,
    actionType: payload.actionType || "subscription_assigned",
    targetType: "subscription",
    targetId: payload.targetId,
    summary: payload.summary || "Assigned subscription",
    beforeSnapshot: payload.beforeSnapshot || null,
    afterSnapshot: payload.afterSnapshot || null,
    metadata: payload.metadata || {},
  });
}

module.exports = {
  createAuditLog,
  logCompanyCreated,
  logHierarchyAssigned,
  logRolesAssigned,
  logDashboardsGenerated,
  logModulesAssigned,
  logPermissionsUpdated,
  logDocumentTemplateChange,
  logSetupTemplateApplied,
  logCompanyLifecycleChange,
  logSubscriptionAssigned,
};