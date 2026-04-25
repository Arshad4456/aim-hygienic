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

export function statusTone(status) {
  switch (status) {
    case "online":
      return {
        label: "Online",
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        soft: "from-emerald-50 to-white",
      };
    case "idle":
      return {
        label: "Idle",
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        soft: "from-amber-50 to-white",
      };
    case "offline":
      return {
        label: "Offline",
        dot: "bg-rose-500",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        soft: "from-rose-50 to-white",
      };
    default:
      return {
        label: "Unknown",
        dot: "bg-zinc-400",
        badge: "bg-zinc-50 text-zinc-700 border-zinc-200",
        soft: "from-zinc-50 to-white",
      };
  }
}

export function roleTone(role) {
  const normalized = normalizeRole(role);
  if (normalized === "supplier") return "bg-sky-50 text-sky-700 border-sky-200";
  if (normalized === "salesman") return "bg-violet-50 text-violet-700 border-violet-200";
  if (normalized === "order booker" || normalized === "orderbooker") return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

export function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

export function formatRelativeTime(value) {
  if (!value) return "No sync yet";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "No sync yet";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatSpeed(speed) {
  const value = safeNumber(speed);
  if (value === null) return "N/A";
  const kmh = value * 3.6;
  if (!Number.isFinite(kmh)) return "N/A";
  return `${kmh.toFixed(1)} km/h`;
}

export function formatHeading(heading) {
  const value = safeNumber(heading);
  if (value === null) return "N/A";
  return `${Math.round(value)}°`;
}

export function formatCoordinate(value) {
  const normalized = safeNumber(value);
  if (normalized === null) return "—";
  return normalized.toFixed(5);
}

export function buildOsmEmbedUrl(latitude, longitude, zoom = 15) {
  const lat = safeNumber(latitude);
  const lng = safeNumber(longitude);
  if (lat === null || lng === null) return "";

  const delta = Math.max(0.005, 0.04 / Math.max(1, zoom - 10));
  const left = Math.max(-180, lng - delta);
  const right = Math.min(180, lng + delta);
  const top = Math.min(90, lat + delta);
  const bottom = Math.max(-90, lat - delta);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function buildOpenStreetMapLink(latitude, longitude, zoom = 16) {
  const lat = safeNumber(latitude);
  const lng = safeNumber(longitude);
  if (lat === null || lng === null) return "";
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
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

export function buildOptionSets(users) {
  function pick(key) {
    return [...new Set(users.map((u) => String(u?.[key] || "").trim()).filter(Boolean))].sort();
  }

  return {
    roles: [...new Set(users.map((u) => normalizeRole(u.role)).filter(Boolean))].sort(),
    companies: pick("companyId"),
    distributors: pick("distributorId"),
    regions: pick("regionName"),
    zones: pick("zoneName"),
    territories: pick("territoryName"),
    fields: pick("fieldName"),
  };
}

export function computeSummary(users) {
  const summary = {
    total: users.length,
    online: 0,
    idle: 0,
    offline: 0,
    unknown: 0,
    onDuty: 0,
    suppliers: 0,
    salesmen: 0,
    orderBookers: 0,
  };

  for (const user of users) {
    const status = deriveTrackingStatus(user.lastSeenAt);
    if (summary[status] !== undefined) summary[status] += 1;
    const role = normalizeRole(user.role);
    if (role === "supplier") summary.suppliers += 1;
    if (role === "salesman") summary.salesmen += 1;
    if (role === "order booker" || role === "orderbooker") summary.orderBookers += 1;
    if (status === "online" || status === "idle") summary.onDuty += 1;
  }

  return summary;
}

export function createActivityFeed(users, limit = 7) {
  return [...users]
    .sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime())
    .slice(0, limit)
    .map((user) => {
      const status = deriveTrackingStatus(user.lastSeenAt);
      const locationLine = [user.territoryName, user.fieldName].filter(Boolean).join(" • ") || "Location not tagged";
      return {
        id: `${user.userId || user.fullName}-${user.lastSeenAt || ""}`,
        title: `${user.fullName || user.userId || "Tracked user"} is ${status}`,
        subtitle: `${locationLine} • ${formatRelativeTime(user.lastSeenAt)}`,
        status,
      };
    });
}

export function computeRouteStats(points) {
  if (!Array.isArray(points) || !points.length) {
    return {
      totalPoints: 0,
      startAt: null,
      endAt: null,
      avgSpeedKmh: null,
      maxSpeedKmh: null,
    };
  }

  const sorted = [...points].sort((a, b) => new Date(a.recordedAt || 0).getTime() - new Date(b.recordedAt || 0).getTime());
  const speeds = sorted.map((p) => safeNumber(p.speed)).filter((v) => v !== null);
  const avgMs = speeds.length ? speeds.reduce((sum, v) => sum + v, 0) / speeds.length : null;
  const maxMs = speeds.length ? Math.max(...speeds) : null;

  return {
    totalPoints: sorted.length,
    startAt: sorted[0]?.recordedAt || null,
    endAt: sorted[sorted.length - 1]?.recordedAt || null,
    avgSpeedKmh: avgMs === null ? null : avgMs * 3.6,
    maxSpeedKmh: maxMs === null ? null : maxMs * 3.6,
  };
}

export function buildPlaybackPreviewPoint(points, selectedIndex) {
  if (!points.length) return null;
  const index = Math.max(0, Math.min(points.length - 1, selectedIndex));
  return points[index] || null;
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
