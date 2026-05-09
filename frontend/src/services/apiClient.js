const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "";

export function normalizeApiBase(rawApiBase) {
  const apiBase = String(rawApiBase || "").trim().replace(/\/$/, "");
  if (!apiBase) return "/api";
  if (/^https?:\/\//i.test(apiBase)) return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  if (apiBase.startsWith("/")) return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  const withProtocol = `http://${apiBase}`;
  return /\/api(\/|$)/.test(withProtocol) ? withProtocol : `${withProtocol}/api`;
}

function toHttpsIfNeeded(base) {
  if (typeof window === "undefined") return base;
  const isHttpsPage = window.location.protocol === "https:";
  const isHttpBase = /^http:\/\//i.test(base);
  const pointsToLocalApi = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base);
  return isHttpsPage && isHttpBase && !pointsToLocalApi ? base.replace(/^http:/i, "https:") : base;
}

function isLocalBrowser() {
  if (typeof window === "undefined") return false;
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.host);
}

function isBrowserSafeFallback(base) {
  if (typeof window === "undefined") return true;
  if (!base || base === "/api") return true;
  if (base.startsWith("/")) return true;
  try {
    const parsed = new URL(base);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  const keys = ["rawyan_token", "token", "authToken"];
  for (const storage of [window.sessionStorage, window.localStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }
  return null;
}

export function setStoredToken(token, { remember = true } = {}) {
  if (typeof window === "undefined" || !token) return;
  const target = remember ? window.localStorage : window.sessionStorage;
  target.setItem("rawyan_token", token);
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    ["rawyan_token", "token", "authToken"].forEach((key) => storage.removeItem(key));
  }
}

export function getApiBaseCandidates() {
  const configured = toHttpsIfNeeded(normalizeApiBase(RAW_API_BASE));
  const allowCrossOriginFallback = process.env.NEXT_PUBLIC_ALLOW_CROSS_ORIGIN_API_FALLBACK === "1";
  const candidates = [];

  if (typeof window !== "undefined" && !isLocalBrowser()) {
    candidates.push("/api");
    if (configured && configured !== "/api" && (allowCrossOriginFallback || isBrowserSafeFallback(configured))) {
      candidates.push(configured);
    }
  } else {
    candidates.push(configured || "/api");
    if (configured !== "/api") candidates.push("/api");
  }

  return [...new Set(candidates.filter(Boolean))];
}

function shouldRetry(error) {
  const message = String(error?.message || "");
  const status = Number(error?.status || 0);
  return /Failed to fetch|NetworkError|Load failed|Could not fetch|Could not reach/i.test(message) || [502, 503, 504].includes(status);
}

function buildHeaders(options = {}, token) {
  const headers = { ...(options.headers || {}) };
  const hasFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!hasFormData && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function serializeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body;
  return JSON.stringify(body);
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json().catch(() => null);
  const text = await response.text().catch(() => "");
  return text ? { message: text } : null;
}

export async function apiFetch(path, { method = "GET", body, token, credentials, headers, ...rest } = {}) {
  const authToken = token || getStoredToken();
  const normalizedMethod = String(method || "GET").toUpperCase();
  const requestOptions = {
    ...rest,
    method: normalizedMethod,
    headers: buildHeaders({ headers, body }, authToken),
    credentials,
    body: serializeBody(body),
  };

  let lastError = null;
  for (const baseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, requestOptions);
      const payload = await parseResponse(response);
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

  throw lastError || new Error("Could not reach the API server. Verify NEXT_PUBLIC_API_BASE and backend deployment.");
}

export async function apiClient(path, options = {}) {
  return apiFetch(path, options);
}

export function withQuery(path, params = {}) {
  const url = new URL(path, "http://rawyan.local");
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

export function apiGet(path, options = {}) {
  return apiFetch(path, { ...options, method: "GET" });
}

export function apiPost(path, body = {}, options = {}) {
  return apiFetch(path, { ...options, method: "POST", body });
}

export function apiPut(path, body = {}, options = {}) {
  return apiFetch(path, { ...options, method: "PUT", body });
}

export function apiPatch(path, body = {}, options = {}) {
  return apiFetch(path, { ...options, method: "PATCH", body });
}

export function apiDelete(path, body = undefined, options = {}) {
  return apiFetch(path, { ...options, method: "DELETE", body });
}

export async function uploadFile(path, file, fields = {}, options = {}) {
  const form = new FormData();
  form.append("file", file);
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });
  return apiFetch(path, { ...options, method: "POST", body: form, headers: options.headers || {} });
}

export default apiClient;
