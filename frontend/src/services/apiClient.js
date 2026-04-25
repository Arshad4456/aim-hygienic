const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

const TOKEN_KEYS = [
  "rawyan_token",
  "aim_token",
  "aim_token_v1",
  "token",
  "authToken",
];

function readBrowserStorage(key) {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_KEYS) {
    const value = readBrowserStorage(key);
    if (value) return value;
  }
  return null;
}

export async function apiClient(path, options = {}) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text().catch(() => "");
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export default apiClient;
