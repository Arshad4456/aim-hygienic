function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function asText(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return asText(value).toLowerCase();
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
    const value = asText(source?.[key]);
    if (value) return value;
  }
  return "";
}

function readComparableIds(source, keys) {
  const values = [];
  for (const key of keys) {
    const value = asText(source?.[key]);
    if (value && !values.includes(value)) values.push(value);
  }
  return values;
}

function idsOverlap(left, right) {
  if (!left.length || !right.length) return false;
  return left.some((value) => right.includes(value));
}

function namesOverlap(left, right) {
  const a = left.map(normalizeName).filter(Boolean);
  const b = right.map(normalizeName).filter(Boolean);
  if (!a.length || !b.length) return false;
  return a.some((value) => b.includes(value));
}

function canViewTrackedUser(viewer, trackedUser) {
  const viewerRole = normalizeRole(viewer?.role);
  if (!viewerRole || !trackedUser || !isTrackedRole(trackedUser.role)) return false;

  if (isSystemAdmin(viewerRole)) return true;

  const viewerCompanyIds = readComparableIds(viewer, ["companyId"]);
  const trackedCompanyIds = readComparableIds(trackedUser, ["companyId"]);

  if (isCompanyAdmin(viewerRole)) {
    return idsOverlap(viewerCompanyIds, trackedCompanyIds);
  }

  if (viewerRole === "distributor") {
    const trackedCanonicalRole = toCanonicalTrackedRole(trackedUser.role);
    if (trackedCanonicalRole !== "salesman" && trackedCanonicalRole !== "orderbooker") return false;
    if (!idsOverlap(viewerCompanyIds, trackedCompanyIds)) return false;

    const viewerDistributorIds = readComparableIds(viewer, ["distributorId", "userId", "uid", "_id"]);
    const trackedDistributorIds = readComparableIds(trackedUser, ["distributorId"]);
    if (idsOverlap(viewerDistributorIds, trackedDistributorIds)) return true;

    const viewerTerritoryIds = readComparableIds(viewer, ["territoryId"]);
    const trackedTerritoryIds = readComparableIds(trackedUser, ["territoryId"]);
    if (idsOverlap(viewerTerritoryIds, trackedTerritoryIds)) return true;

    const viewerTerritoryNames = readComparableIds(viewer, ["territoryName"]);
    const trackedTerritoryNames = readComparableIds(trackedUser, ["territoryName"]);
    if (namesOverlap(viewerTerritoryNames, trackedTerritoryNames)) return true;

    return false;
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
  asText,
};