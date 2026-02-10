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

function resolveApiBase() {
  const normalized = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);

  if (typeof window === "undefined") {
    return normalized;
  }

  const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.host);
  const pointsToLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(normalized);

  if (!isLocalHost && pointsToLocalApi) {
    return "/api";
  }

  return normalized;
}

export async function apiFetch(path, { method = "GET", body, token, credentials } = {}) {
  const t = token || (typeof window !== "undefined" ? localStorage.getItem("aim_token") : null);
  const baseUrl = resolveApiBase();

  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      credentials,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (typeof window !== "undefined" && baseUrl !== "/api") {
      try {
        res = await fetch(`/api${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          credentials,
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch {
        throw new Error(
          "Could not reach the API server. Verify NEXT_PUBLIC_API_BASE/proxy configuration and that the backend is running.",
        );
      }
    } else {
      throw new Error(
        "Could not reach the API server. Verify NEXT_PUBLIC_API_BASE/proxy configuration and that the backend is running.",
      );
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}