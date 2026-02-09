export async function apiFetch(path, { method = "GET", body, token } = {}) {
  const t = token || (typeof window !== "undefined" ? localStorage.getItem("aim_token") : null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "";
  const baseUrl = apiBase ? (apiBase.endsWith("/api") ? apiBase : `${apiBase}/api`) : "/api";

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
