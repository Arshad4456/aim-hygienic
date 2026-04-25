const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "";

function normalizeApiBase(rawApiBase) {
  const apiBase = String(rawApiBase || "").trim().replace(/\/$/, "");
  if (!apiBase) return "/api";
  if (/^https?:\/\//i.test(apiBase)) return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  if (apiBase.startsWith("/")) return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  const withProtocol = `http://${apiBase}`;
  return /\/api(\/|$)/.test(withProtocol) ? withProtocol : `${withProtocol}/api`;
}

function toHttpsIfNeeded(base) {
  if (typeof window === "undefined") return base;
  if (window.location.protocol === "https:" && /^http:\/\//i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base)) {
    return base.replace(/^http:/i, "https:");
  }
  return base;
}

function isLocalBrowser() {
  if (typeof window === "undefined") return false;
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.host);
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  const keys = ["rawyan_token", "aim_token", "aim_token_v1"];
  for (const storage of [window.sessionStorage, window.localStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }
  return null;
}

export function getApiBaseCandidates() {
  const configured = toHttpsIfNeeded(normalizeApiBase(RAW_API_BASE));
  const candidates = [];

  // In production, same-origin /api must be first because Hostinger/Nginx usually proxies /api to backend.
  if (typeof window !== "undefined" && !isLocalBrowser()) {
    candidates.push("/api");
    if (configured && configured !== "/api") candidates.push(configured);
  } else {
    candidates.push(configured || "/api");
    if (configured !== "/api") candidates.push("/api");
  }

  return [...new Set(candidates.filter(Boolean))];
}

function shouldRetry(error) {
  const message = String(error?.message || "");
  const status = Number(error?.status || 0);
  return /Failed to fetch|NetworkError|Load failed|Could not fetch/i.test(message) || [502, 503, 504].includes(status);
}

export async function apiClient(path, options = {}) {
  const token = getStoredToken();
  const method = options.method || "GET";
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let lastError = null;
  for (const baseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        method,
        headers,
        credentials: options.credentials,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload?.message || payload?.error || `Request failed (${response.status})`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error)) break;
    }
  }

  throw lastError || new Error("Request failed");
}

export default apiClient;
