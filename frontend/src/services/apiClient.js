const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export async function apiClient(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("aim_token_v1") || localStorage.getItem("aim_token") : null;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || "Request failed");
  return payload;
}
export default apiClient;
