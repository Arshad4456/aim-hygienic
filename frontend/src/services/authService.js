import apiClient from "./apiClient";

const TOKEN_KEYS = ["rawyan_token", "aim_token", "aim_token_v1"];
const USER_KEYS = ["rawyan_user", "aim_user", "aim_user_v1"];

function readStorage(keys) {
  if (typeof window === "undefined") return null;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }
  return null;
}

function writeAuthCache(token, user) {
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem("aim_token", token);
    window.localStorage.setItem("rawyan_token", token);
  }
  if (user) {
    const encoded = JSON.stringify(user);
    window.sessionStorage.setItem("aim_user", encoded);
    window.localStorage.setItem("rawyan_user", encoded);
  }
}

export async function login(credentials) {
  const payload = await apiClient("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
  if (payload?.token) writeAuthCache(payload.token, payload.user || {});
  return payload;
}

export async function getMe() {
  const payload = await apiClient("/auth/me");
  if (payload?.user) writeAuthCache(null, payload.user);
  return payload;
}

export function getCachedUser() {
  if (typeof window === "undefined") return null;
  const raw = readStorage(USER_KEYS);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window !== "undefined") {
    [...TOKEN_KEYS, ...USER_KEYS].forEach((key) => {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    });
  }
}
