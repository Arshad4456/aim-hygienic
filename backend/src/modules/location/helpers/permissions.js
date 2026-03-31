function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toCanonicalTrackedRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === "order booker") return "orderbooker";
  return normalized.replace(/\s+/g, "");
}

function isTrackedRole(role) {
  const canonical = toCanonicalTrackedRole(role);
  return canonical === "supplier" || canonical === "salesman" || canonical === "orderbooker";
}

function isSystemAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function isCompanyAdmin(role) {
  return normalizeRole(role) === "company admin";
}

function readComparableId(source, keys) {
  for (const key of keys) {
    const value = String(source?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function readComparableIds(source, keys) {
  const values = [];
  for (const key of keys) {
    const value = String(source?.[key] || "").trim();
    if (value && !values.includes(value)) values.push(value);
  }
  return values;
}

function canViewTrackedUser(viewer, trackedUser) {
  const viewerRole = normalizeRole(viewer?.role);
  if (!viewerRole || !trackedUser || !isTrackedRole(trackedUser.role)) return false;

  if (isSystemAdmin(viewerRole)) return true;

  const viewerCompanyId = readComparableId(viewer, ["companyId"]);
  const trackedCompanyId = readComparableId(trackedUser, ["companyId"]);

  if (isCompanyAdmin(viewerRole)) {
    return Boolean(viewerCompanyId && trackedCompanyId && viewerCompanyId === trackedCompanyId);
  }

  if (viewerRole === "distributor") {
    const trackedCanonicalRole = toCanonicalTrackedRole(trackedUser.role);
    if (trackedCanonicalRole !== "salesman" && trackedCanonicalRole !== "orderbooker") return false;

    const viewerDistributorIds = readComparableIds(viewer, ["distributorId", "userId", "uid", "_id"]);
    const trackedDistributorId = readComparableId(trackedUser, ["distributorId"]);
    return Boolean(trackedDistributorId && viewerDistributorIds.includes(trackedDistributorId));
  }

  return false;
}

module.exports = {
  canViewTrackedUser,
  isTrackedRole,
  isSystemAdmin,
  isCompanyAdmin,
  normalizeRole,
  toCanonicalTrackedRole,
};