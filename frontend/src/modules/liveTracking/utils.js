export function normalizeRole(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function deriveTrackingStatus(lastSeenAt) {
  const ts = new Date(lastSeenAt || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return "unknown";
  const ageMin = (Date.now() - ts) / 60000;
  if (ageMin <= 5) return "online";
  if (ageMin <= 60) return "idle";
  return "offline";
}

export function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

export function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function markerPosition(latitude, longitude) {
  const lat = safeNumber(latitude);
  const lng = safeNumber(longitude);
  if (lat === null || lng === null) return null;

  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return {
    left: `${Math.min(100, Math.max(0, x))}%`,
    top: `${Math.min(100, Math.max(0, y))}%`,
  };
}

export function filterUsers(users, filters) {
  const search = String(filters.search || "").trim().toLowerCase();
  return (users || []).filter((user) => {
    const status = deriveTrackingStatus(user.lastSeenAt);
    if (filters.role && normalizeRole(user.role) !== filters.role) return false;
    if (filters.companyId && String(user.companyId || "") !== filters.companyId) return false;
    if (filters.distributorId && String(user.distributorId || "") !== filters.distributorId) return false;
    if (filters.region && String(user.regionName || "") !== filters.region) return false;
    if (filters.zone && String(user.zoneName || "") !== filters.zone) return false;
    if (filters.territory && String(user.territoryName || "") !== filters.territory) return false;
    if (filters.field && String(user.fieldName || "") !== filters.field) return false;
    if (filters.status && status !== filters.status) return false;

    if (search) {
      const haystack = [
        user.fullName,
        user.role,
        user.userId,
        user.companyId,
        user.distributorId,
        user.regionName,
        user.zoneName,
        user.territoryName,
        user.fieldName,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

export const defaultFilters = {
  role: "",
  companyId: "",
  distributorId: "",
  region: "",
  zone: "",
  territory: "",
  field: "",
  status: "",
  search: "",
};