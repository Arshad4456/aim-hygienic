import { getAuthItem } from "./clientAuth";

function normalizeApiBase(rawApiBase) {
  const apiBase = rawApiBase?.trim().replace(/\/$/, "") || "";
  if (!apiBase) return "/api";

  if (/^https?:\/\//i.test(apiBase)) {
    return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  }

  if (apiBase.startsWith("/")) {
    return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  }

  const withProtocol = `http://${apiBase}`;
  return /\/api(\/|$)/.test(withProtocol) ? withProtocol : `${withProtocol}/api`;
}

function toHttpsIfNeeded(base) {
  if (typeof window === "undefined") return base;

  const isHttpsPage = window.location.protocol === "https:";
  const isHttpBase = /^http:\/\//i.test(base);
  const pointsToLocalApi = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base);

  if (isHttpsPage && isHttpBase && !pointsToLocalApi) {
    return base.replace(/^http:/i, "https:");
  }

  return base;
}

function isBrowserSafeFallback(base) {
  if (typeof window === "undefined") return true;
  if (!base || base === "/api") return false;
  if (base.startsWith("/")) return true;

  try {
    const parsed = new URL(base);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function resolveApiCandidates() {
  const normalized = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);
  const normalizedHttps = toHttpsIfNeeded(normalized);
  const fallbackCandidates = isBrowserSafeFallback(normalizedHttps) ? [normalizedHttps] : [];
  const emergencyFallbackCandidates =
    normalizedHttps && normalizedHttps !== "/api" && !fallbackCandidates.includes(normalizedHttps)
      ? [normalizedHttps]
      : [];

  if (typeof window !== "undefined") {
    const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.host);

    // In production/browser prefer same-origin /api first to avoid CORS and rely on reverse proxy.
    if (!isLocalHost) {
      // Keep production requests same-origin first to avoid CORS failures between apex/www hosts.
      // If that fails with a retriable status/network error, apiFetch can retry against NEXT_PUBLIC_API_BASE.
      return ["/api", ...fallbackCandidates, ...emergencyFallbackCandidates];
    }
  }

  const candidates = [normalizedHttps];
  if (typeof window !== "undefined" && candidates[0] !== "/api") {
    candidates.push("/api");
  }
  return [...new Set(candidates)];
}

async function fetchJson(url, { method, body, headers, credentials }) {
  const res = await fetch(url, {
    method,
    headers,
    credentials,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }

  return data;
}

function isNetworkError(error) {
  return /Failed to fetch|NetworkError|Could not reach the API server/i.test(error?.message || "");
}

function isRetriableStatus(error) {
  const status = Number(error?.status || 0);
  return status === 502 || status === 503 || status === 504;
}

export async function apiFetch(path, { method = "GET", body, token, credentials } = {}) {
  const t = token || (typeof window !== "undefined" ? getAuthItem("aim_token") : null);
  const headers = {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };

  const candidates = resolveApiCandidates();
  let lastError = null;
  const normalizedMethod = String(method || "GET").toUpperCase();
  const hasMultipleCandidates = candidates.length > 1;
  const canRetryAcrossBases = hasMultipleCandidates && ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod);

  for (const baseUrl of candidates) {
    try {
      return await fetchJson(`${baseUrl}${path}`, { method, body, headers, credentials });
    } catch (error) {
      lastError = error;
      if (!canRetryAcrossBases || (!isNetworkError(error) && !isRetriableStatus(error))) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    "Could not reach the API server. Verify NEXT_PUBLIC_API_BASE/API_BASE configuration and that the backend is running.",
  );
}